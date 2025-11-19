const express = require("express");
const { Buffer } = require('buffer');

const { deserializeMcconf_V1 } = require("./conf_utils/deserializeMcconf");
const { deserializeEbikeconf_V1 } = require("./conf_utils/deserializeEbikeconf");
const { deserializeAppconf_V1 } = require("./conf_utils/deserializeAppconf");

const { serializeMcconf_V1 } = require("./conf_utils/serializeMcconf");
const { serializeEbikeconf_V1 } = require("./conf_utils/serializeEbikeconf");
const { serializeAppconf_V1 } = require("./conf_utils/serializeAppconf");

const { decrypt, encrypted } = require("./conf_utils/crypto");
const { versionLt, mergeConf, decodeAndMapAliases, uuidToBytes } = require("./conf_utils/helper");

const { METADATA_MC, FIELD_MAP_MC } = require("@conf_data/confMcFields");
const { METADATA_EBIKE, FIELD_MAP_EBIKE } = require("@conf_data/confEbikeFields");
const { METADATA_APP, FIELD_MAP_APP } = require("@conf_data/confAppFields");

const loadDevices = require("@utils/loadDevices");

const { controllerDb, engineDb } = require("@databases");
const { getColumnNames,
    runAsync,
    getAsync,
    buildInsertQuery,
    buildUpdateQuery
} = require("@databases/dbUtils");

const SIGNATURES = {
    mc: { v1: 4165796136 },
    ebike: { v1: 1315649970 },
    app: { v1: 3733512279 }
};

const GET_CONFIG_MAP = {
    mc: {
        deserialize: deserializeMcconf_V1,
        serialize: serializeMcconf_V1,
        fieldMap: FIELD_MAP_MC,
        metadata: METADATA_MC,
        signatures: SIGNATURES.mc
    },
    ebike: {
        deserialize: deserializeEbikeconf_V1,
        serialize: serializeEbikeconf_V1,
        fieldMap: FIELD_MAP_EBIKE,
        metadata: METADATA_EBIKE,
        signatures: SIGNATURES.ebike
    },
    app: {
        deserialize: deserializeAppconf_V1,
        serialize: serializeAppconf_V1,
        fieldMap: FIELD_MAP_APP,
        metadata: METADATA_APP,
        signatures: SIGNATURES.app
    }
};

// Konfigurationen für Setter-Routen
const SET_CONFIG_MAP = {
    mc: {
        ...GET_CONFIG_MAP.mc,
        serialize: serializeMcconf_V1
    },
    ebike: {
        ...GET_CONFIG_MAP.ebike,
        serialize: serializeEbikeconf_V1
    },
    app: {
        ...GET_CONFIG_MAP.app,
        serialize: serializeAppconf_V1
    }
};

function decryptConf(buffer, version) {
    // Pre-v2.5.5.3 noch unverschlüsselt zurückgeben
    if (versionLt(version, "2.5.5.3")) {
        return { plain: Buffer.from(buffer), salt: null };
    }
    return decrypt(buffer);
}

function encryptedConf(buffer, salt, version) {
    // Pre-v2.5.5.3 noch unverschlüsselt zurückgeben
    if (versionLt(version, "2.5.5.3")) {
        return { encrypted: buffer, salt: null };
    }
    return encrypted(buffer, salt);
}

function controllerAktivation(conf, hwVersion) {

    if (conf.motorSerial === null && conf.motorSerial === undefined &&
        conf.controllerSerial === null && conf.controllerSerial === undefined) {
        delete conf.motorSerial;
        delete conf.controllerSerial;
        return conf;
    }

    const devices = loadDevices();
    const controller560 = devices.controller.find(controller => controller.type === 'EX8_560');

    if (controller560) {
        const preset560 = controller560.preset;

        // Prüfe ob es sich um eine Ebike- oder MC-Konfiguration handelt
        if ('maxWatt' in conf) {
            // Ebike-Konfiguration
            conf.maxWatt = 750;
            conf.batteryCurrent = 25;
            conf.motorCurrent = 25;

        } else if ('l_watt_max' in conf) {
            // MC-Konfiguration
            conf.l_watt_max = 750;
            conf.l_in_current_max = 25;
            conf.l_current_max = 25;
        } else {
            throw new Error('Unbekannter Konfigurationstyp: Weder Ebike noch MC Felder gefunden');
        }
    }

    return conf;
}

/**
 * Speichert die Konfiguration selektiv in die entsprechende Datenbank.
 * Es werden nur Felder gespeichert, die tatsächlich als Spalten in der Tabelle existieren.
 *
 * @param {string} configType - "ebike" oder "mc"
 * @param {string} uuid - UUID des Datensatzes
 * @param {object} conf - Deserialisierte Konfiguration
 */
async function writeConfigToDb(configType, hw, uuid, version, conf, metadata) {
    const db = configType === "ebike" ? controllerDb :
        configType === "mc" ? engineDb : null;
    const table = configType === "ebike" ? "controller" :
        configType === "mc" ? "engine" : null;

    if (!db || !table) return;

    // Füge den Typ aus `hw` hinzu, falls nicht vorhanden
    if (!conf.type && hw) {
        conf.type = hw;
    }

    const columns = await getColumnNames(db, table);

    // Filtere nur gültige Spalten
    const filtered = Object.fromEntries(
        Object.entries(conf).filter(([key]) => columns.includes(key))
    );

    // Nur wenn configType "ebike" ist, füge version hinzu
    if (configType === "ebike" && columns.includes("version")) {
        filtered.version = version; // Speichere die Version ausschließlich für "ebike"
    }

    // Transformiere Werte anhand der Metadaten
    for (const [key, value] of Object.entries(filtered)) {
        const meta = metadata?.[key];

        if (!meta) continue;

        // Arrays als JSON speichern
        if (meta.type === "array" && Array.isArray(value)) {
            filtered[key] = JSON.stringify(value);
        }

        // Enums als Index speichern
        else if (meta.type === "enum" && Array.isArray(meta.enums)) {
            const index = meta.enums.indexOf(String(value));
            if (index !== -1) {
                filtered[key] = index;
            } else {
                console.warn(`⚠️ Enum-Wert "${value}" nicht in ${key}.`);
            }
        }
    }

    filtered.uuid = uuid;

    const existing = await getAsync(db, `SELECT 1 FROM ${table} WHERE uuid = ?`, [uuid]);

    if (existing) {
        const update = buildUpdateQuery(table, Object.keys(filtered), "uuid");
        await runAsync(db, update.sql, [...Object.values(filtered), uuid]);
        return "updated";
    } else {
        delete filtered.created_at;
        delete filtered.updated_at;

        const insert = buildInsertQuery(table, Object.keys(filtered));
        await runAsync(db, insert.sql, Object.values(filtered));
        return "inserted";
    }
}

async function readConfigFromDb(configType, uuid, metadata) {
    const db = configType === "ebike" ? controllerDb :
        configType === "mc"    ? engineDb    : null;
    const table = configType === "ebike" ? "controller" :
        configType === "mc"    ? "engine"     : null;

    if (!db || !table) return null;

    const row = await getAsync(db, `SELECT * FROM ${table} WHERE uuid = ?`, [uuid]);
    if (!row) return null;

    const result = { ...row };

    for (const [key, value] of Object.entries(result)) {
        const meta = metadata?.[key];

        if (!meta) continue;

        // Arrays zurückwandeln
        if (meta.type === "array" && typeof value === "string") {
            try {
                result[key] = JSON.parse(value);
            } catch {
                // ungültiges JSON → bleibt String
            }
        }

        // Enums rückwandeln (Index → Text)
        else if (meta.type === "enum" && Array.isArray(meta.enums)) {
            const index = Number(value);
            if (!isNaN(index) && meta.enums[index] !== undefined) {
                result[key] = meta.enums[index];
            }
        }
    }

    return result;
}

function processEncryptedConf({ confB64, version, signatures, deserialize, serialize, uuid }) {
    const encrypted = Buffer.from(confB64, "base64");

    const { plain, salt } = decryptConf(encrypted, version);
    if (!plain || plain.length < 4) {
        throw new Error("Ungültige oder zu kurze Konfigurationsdaten.");
    }

    console.log(confB64);
    console.log(encrypted);
    console.log(plain);

    const signature = plain.readUInt32BE(0);
    if (signature !== signatures.v1) {
        throw new Error(`Unbekannte Signatur: ${signature}`);
    }

    const conf = deserialize(plain);

    const serializeToB64 = (confToSerialize) => {
        const serialized = serialize(confToSerialize, signature);
        const uuidBytes = uuidToBytes(uuid);
        const finalBuffer = Buffer.concat([serialized, uuidBytes]);
        const { encrypted: enc } = encryptedConf(finalBuffer, salt, version);
        return enc.toString("base64");
    };

    return { conf, serializeToB64 };
}

function valuesAreEqual(meta, val1, val2) {
    if (!meta) {
        if (Array.isArray(val1) && Array.isArray(val2)) {
            return JSON.stringify(val1) === JSON.stringify(val2);
        }
        return val1 === val2;
    }

    if (Array.isArray(val1) && Array.isArray(val2)) {
        if (val1.length !== val2.length) return false;
        for (let i = 0; i < val1.length; i++) {
            if (!valuesAreEqual(meta, val1[i], val2[i])) return false;
        }
        return true;
    }

    switch (meta.type) {
        case "double":
            const scale = meta.scale ?? 1;
            const decimals = meta.decimals ?? 2;
            const scaledVal1 = Math.round(Number(val1) * scale * Math.pow(10, decimals));
            const scaledVal2 = Math.round(Number(val2) * scale * Math.pow(10, decimals));
            return scaledVal1 === scaledVal2;

        case "enum":
            const enums = meta.enums || [];

            const normalizeToEnumIndex = (v) => {
                if (typeof v === "string" && enums.includes(v)) {
                    return enums.indexOf(v); // Text → Index
                }
                const i = Number(v);
                return enums[i] !== undefined ? i : -1; // Index → Index (wenn gültig)
            };

            return normalizeToEnumIndex(val1) === normalizeToEnumIndex(val2);

        case "bool":
        case "boolean":
            return Boolean(val1) === Boolean(val2);

        default:
            return val1 === val2;
    }
}

/**
 * Erzeugt einen HTTP-Handler für POST-Anfragen zum Abrufen von Konfigurationen
 *
 * @param {Object} options
 * @param {Function} options.deserialize - Funktion zum Deserialisieren von Konfigurationen
 * @param {Object} options.fieldMap - Zuordnungstabelle zwischen internen Keys und Frontend-Aliassen
 * @param {Object} options.metadata - Metadaten für Konfigurationsfelder
 * @param {Object} options.signatures - Unterstützte Signaturcodes
 * @returns {Function} Express-Middleware zum Verarbeiten der Anfrage
 */
function createGetConfigHandler({ deserialize, serialize, fieldMap, metadata, signatures }, configType) {
    return async (req, res, next) => {
        try {
            // Extrahieren der Anfrageparameter
            const { uuid, version, conf: confB64 } = req.body;

            if (!uuid) {
                return res.status(400).json({ error: "`uuid` fehlt oder ist ungültig." });
            }

            // Überprüfen, ob conf ein gültiger Base64-String ist
            if (typeof confB64 !== "string") {
                return res.status(400).json({ error: "`conf` muss ein Base64-String sein." });
            }

            // Entschlüsseln und parsen
            const { conf, serializeToB64 } = processEncryptedConf({
                confB64,
                version,
                signatures,
                deserialize,
                serialize,
                uuid
            });

            // Anzeige-Daten für das Frontend (conf direckt aus der Hardware, nicht DB!!)
            const display = {};
            for (const [origKey, { alias, meta }] of Object.entries(fieldMap)) {
                // Nur vorhandene Felder mit definierten Metadaten einbeziehen
                if (conf.hasOwnProperty(origKey) && metadata[origKey]) {
                    // Erstellen eines Eintrags mit dem Wert aus der Konfiguration
                    const entry = { value: conf[origKey] };
                    // Hinzufügen der angeforderten Metadaten
                    for (const m of meta) {
                        if (metadata[origKey][m] !== undefined) {
                            entry[m] = metadata[origKey][m];
                        }
                    }
                    // Speichern unter dem Frontend-Alias
                    display[alias] = entry;
                }
            }

            // Konfiguration mit DB-Werten anreichern
            let restoredFromDb = false;
            const dbValues = await readConfigFromDb(configType, uuid, metadata);
            if (dbValues) {
                const dbOverrides = {};
                for (const [key, dbVal] of Object.entries(dbValues)) {
                    if (
                        metadata.hasOwnProperty(key) &&      // nur Felder aus den Metadaten
                        conf.hasOwnProperty(key)
                    ) {
                        const controllerVal = conf[key];

                        const meta = metadata[key];
                        const isDifferent = !valuesAreEqual(meta, dbVal, controllerVal);

                        if (isDifferent) {
                            dbOverrides[key] = dbVal;
                        }
                    }
                }
                if (Object.keys(dbOverrides).length > 0) {
                    console.log("🔄 Änderungen aus DB übernommen:");
                    for (const key of Object.keys(dbOverrides)) {
                        console.log(`  ${key}:`, {
                            vorher: conf[key],
                            ausDB: dbOverrides[key]
                        });
                    }

                    mergeConf(conf, dbOverrides);
                    restoredFromDb = true;
                }
            }

            // Serialisierte Rückgabe (neu verschlüsselt)
            const resultConfB64 = serializeToB64(conf);

            // Erfolgreiche Antwort
            res.json({
                uuid,
                version,
                conf: resultConfB64,
                display, // sind aktuelle Werte aus der Hardware!! Kann sich zu conf unterscheiden!!
                restore: restoredFromDb,
                status: "success",
                message: restoredFromDb
                    ? "Konfiguration erfolgreich aus DB ergänzt"
                    : "Konfiguration erfolgreich gelesen"
            });
        } catch (err) {
            // Fehlerbehandlung an den nächsten Error-Handler übergeben
            next(err);
        }
    };
}

/**
 * Erzeugt einen HTTP-Handler für PUT-Anfragen zum Aktualisieren von Konfigurationen.
 *
 * Der Handler:
 * 1. Empfängt verschlüsselte Konfigurationsdaten als Base64-String
 * 2. Entschlüsselt und deserialisiert die Daten
 * 3. Fusioniert sie mit den neuen Werten
 * 4. Serialisiert, verschlüsselt und sendet das Ergebnis zurück
 *
 * @param {Object} options - Handler-Konfiguration
 * @param {Function} options.deserialize - Funktion zum Deserialisieren der Konfiguration
 * @param {Function} options.serialize - Funktion zum Serialisieren der Konfiguration
 * @param {Object} options.fieldMap - Zuordnung zwischen Original-Keys und Frontend-Aliassen
 * @param {Object} options.signatures - Unterstützte Signaturversionen für die Konfiguration
 * @returns {Function} Express-Handler-Funktion für PUT-Anfragen
 */
function createSetConfigHandler({ deserialize, serialize, fieldMap, signatures, metadata, configType }) {
    return async (req, res, next) => {
        try {
            // Extrahiere Anfragedaten
            const {hw, uuid, version, conf: confB64, values} = req.body;

            if (!uuid) {
                return res.status(400).json({ error: "`uuid` fehlt oder ist ungültig." });
            }

            // Validiere den Base64-String
            if (typeof confB64 !== "string") {
                return res.status(400).json({error: "`conf` muss ein Base64-String sein."});
            }

            // Entschlüsseln und Basis-Konfiguration extrahieren
            const { conf, serializeToB64 } = processEncryptedConf({
                confB64,
                version,
                signatures,
                deserialize,
                serialize,
                uuid
            });

            // Neue Werte vom Client übernehmen
            const newValues = decodeAndMapAliases(values, fieldMap);
            mergeConf(conf, newValues);

            // Datenbank speichern (nur für ebike/mc)
            await writeConfigToDb(configType, hw, uuid, version, conf, metadata);

            // Neue Konfiguration verschlüsseln & serialisieren
            const resultConfB64 = serializeToB64(conf);

            // Erfolgreiche Antwort
            res.json({
                uuid,
                version,
                conf: resultConfB64,
                status: "success",
                message: "Konfiguration erfolgreich gespeichert"
            });
        } catch (err) {
            // Fehlerbehandlung an den nächsten Error-Handler weiterleiten
            next(err);
        }
    };
}

module.exports = () => {
    const router = express.Router();

    // Body-Parser konfigurieren
    router.use(express.json({ limit: "1mb" }));

    // Buttons-Definitionen zurückgeben (POST)
    router.post("/mc/button", (req, res) => {
        res.json({
            type: "mc",
            url: "conf/mc",
            idRead: "3412",
            idWrite: "7817",
            titleFirst: "read: MC",
            titleSecond: "write: MC"
        });
    });

    router.post("/ebike/button", (req, res) => {
        res.json({
            type: "ebike",
            url: "conf/ebike",
            idRead: "5492",
            idWrite: "8992",
            titleFirst: "read: eBike",
            titleSecond: "write: eBike"
        });
    });

    // Dynamisch Getter-Routen registrieren
    for (const [path, get_config] of Object.entries(GET_CONFIG_MAP)) {
        router.post(`/${path}`, createGetConfigHandler(get_config, path));
    }

    // Dynamisch Setter-Routen registrieren
    for (const [path, set_config] of Object.entries(SET_CONFIG_MAP)) {
        router.put(`/${path}`, createSetConfigHandler({ ...set_config, configType: path }));
    }

    return router;
};
