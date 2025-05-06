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

const { METADATA_MC, FIELD_MAP_MC } = require("./conf_data/confMcFields");
const { METADATA_EBIKE, FIELD_MAP_EBIKE } = require("./conf_data/confEbikeFields");
const { METADATA_APP, FIELD_MAP_APP } = require("./conf_data/confAppFields");


const SIGNATURES = {
    mc: { v1: 2525666056 },
    ebike: { v1: 1111649770 },
    app: { v1: 3733512279 }
};

const GET_CONFIG_MAP = {
    mc: {
        deserialize: deserializeMcconf_V1,
        fieldMap: FIELD_MAP_MC,
        metadata: METADATA_MC,
        signatures: SIGNATURES.mc
    },
    ebike: {
        deserialize: deserializeEbikeconf_V1,
        fieldMap: FIELD_MAP_EBIKE,
        metadata: METADATA_EBIKE,
        signatures: SIGNATURES.ebike
    },
    app: {
        deserialize: deserializeAppconf_V1,
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

function prepareEbikeConfForJson(conf) {
    if ('maxWatt' in conf) {  // Prüfen ob es eine Ebike-Konfiguration ist
        // Erstelle eine Kopie der Konfiguration
        const jsonConf = { ...conf };

        // Konvertiere motorSerial von Array zu String
        if (Array.isArray(jsonConf.motorSerial)) {
            jsonConf.motorSerial = jsonConf.motorSerial
                .filter(byte => byte !== 0)  // Entferne Null-Bytes
                .map(byte => String.fromCharCode(byte))  // Konvertiere zu Zeichen
                .join('');  // Verbinde zu einem String
        }

        // Konvertiere controllerSerial von Array zu String
        if (Array.isArray(jsonConf.controllerSerial)) {
            jsonConf.controllerSerial = jsonConf.controllerSerial
                .filter(byte => byte !== 0)  // Entferne Null-Bytes
                .map(byte => String.fromCharCode(byte))  // Konvertiere zu Zeichen
                .join('');  // Verbinde zu einem String
        }
        return jsonConf;
    }
    return conf;  // Wenn keine Ebike-Konfiguration, gib original zurück
}

function controllerAktivation(conf, motorSerial, controllerSerial) {
    // Prüfe ob es sich um eine Ebike- oder MC-Konfiguration handelt
    if ('maxWatt' in conf) {
        // Ebike-Konfiguration
        conf.maxWatt = 750;
        conf.batteryCurrent = 25;
        conf.motorCurrent = 25;

        // Seriennummern als Arrays mit fester Länge (16) speichern
        conf.motorSerial = new Array(16).fill(0);
        conf.controllerSerial = new Array(16).fill(0);

        // Konvertiere die Seriennummern in Arrays und kopiere sie
        const motorSerialArray = Array.from(motorSerial);
        const controllerSerialArray = Array.from(controllerSerial);

        // Kopiere die Werte in die Arrays (maximal 16 Zeichen)
        for (let i = 0; i < Math.min(motorSerialArray.length, 16); i++) {
            conf.motorSerial[i] = motorSerialArray[i].charCodeAt(0);
        }

        for (let i = 0; i < Math.min(controllerSerialArray.length, 16); i++) {
            conf.controllerSerial[i] = controllerSerialArray[i].charCodeAt(0);
        }

    } else if ('l_watt_max' in conf) {
        // MC-Konfiguration
        conf.l_watt_max = 750;
        conf.l_in_current_max = 25;
        conf.l_current_max = 25;
    } else {
        throw new Error('Unbekannter Konfigurationstyp: Weder Ebike noch MC Felder gefunden');
    }

    return conf;
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
function createGetConfigHandler({ deserialize, fieldMap, metadata, signatures }) {
    return (req, res, next) => {
        try {
            // Extrahieren der Anfrageparameter
            const { uuid, version, conf: confB64 } = req.body;

            // Überprüfen, ob conf ein gültiger Base64-String ist
            if (typeof confB64 !== "string") {
                return res.status(400).json({ error: "`conf` muss ein Base64-String sein." });
            }

            // Base64-decodieren des verschlüsselten Konfigurations-Strings
            const encrypted = Buffer.from(confB64, "base64");

            // Entschlüsseln der Konfigurationsdaten
            // decryptConf gibt ein Objekt mit dem entschlüsselten Buffer zurück
            const { plain } = decryptConf(encrypted, version);

            // Lesen der Signatur aus den ersten 4 Bytes
            // Die Signatur identifiziert das Konfigurationsformat
            const signature = plain.readUInt32BE(0);

            // Deserialisieren der Konfiguration basierend auf der Signatur
            let conf;
            if (signature === signatures.v1) {
                // V1-Format deserialisieren
                conf = deserialize(plain);
                conf = prepareEbikeConfForJson(conf);
            } else {
                // Bei unbekannter Signatur Fehler zurückgeben
                return res.status(400).json({ error: `Unbekannte Signatur: ${signature}` });
            }

            // Erstellen eines gefilterten Konfigurationsobjekts für die Frontend-Anzeige
            // Mit Metadaten anreichern und interne Keys in Frontend-Aliasse umwandeln
            const filtered = {};
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
                    filtered[alias] = entry;
                }
            }

            //console.log(filtered);

            // Antwort mit UUID, Version und der aufbereiteten Konfiguration
            res.json({
                uuid,
                version,
                conf: filtered,
                values: conf
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
function createSetConfigHandler({ deserialize, serialize, fieldMap, signatures }) {
    return (req, res, next) => {
        try {
            // Extrahiere Anfragedaten
            const { uuid, version, conf: confB64, values, motorSerial = null, controllerSerial = null } = req.body;

            // Validiere den Base64-String
            if (typeof confB64 !== "string") {
                return res.status(400).json({ error: "`conf` muss ein Base64-String sein." });
            }

            // Konvertiere Base64 in Binärdaten und entschlüssele
            const encryptedInput = Buffer.from(confB64, "base64");
            const { plain, salt } = decryptConf(encryptedInput, version);

            // Überprüfe die Signatur am Anfang der Konfiguration
            const signature = plain.readUInt32BE(0);

            // Dekodiere und mappe die Frontend-Werte zu internen Schlüsseln
            const newValues = decodeAndMapAliases(values, fieldMap);

            // Deserialisiere die Konfiguration basierend auf der erkannten Signatur
            let conf;
            if (signature === signatures.v1) {
                conf = deserialize(plain);
            } else {
                return res.status(400).json({ error: `Unbekannte Signatur: ${signature}` });
            }

            // Aktualisiere die Konfiguration mit den neuen Werten
            mergeConf(conf, newValues);

            // Prüfen ob motorSerial und serialController vorhanden sind und aktiviere den Controller.
            if (motorSerial !== null && motorSerial !== undefined &&
                controllerSerial !== null && controllerSerial !== undefined) {
                conf = controllerAktivation(conf, motorSerial, controllerSerial);
            }

            // Serialisiere die aktualisierte Konfiguration mit der ursprünglichen Signatur
            const serialized = serialize(conf, signature);

            // Konvertiere die UUID in ein Byte-Array
            const uuidBytes = uuidToBytes(uuid);

            // Füge die UUID-Bytes an die serialisierte Konfiguration an (wichtig für die Server-Authentifizierung)
            const finalBuffer = Buffer.concat([serialized, uuidBytes]);

            // Verschlüssele die Daten mit dem ursprünglichen Salt und konvertiere zu Base64
            const { encrypted } = encryptedConf(finalBuffer, salt, version);
            const resultConfB64 = encrypted.toString('base64');

            // Hier würde man die Konfiguration speichern/aktualisieren
            // z.B. in einer Datenbank

            // Erfolgreiche Antwort mit der aktualisierten Konfiguration
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


    // Dynamisch Getter-Routen registrieren
    for (const [path, get_config] of Object.entries(GET_CONFIG_MAP)) {
        router.post(`/${path}`, createGetConfigHandler(get_config));
    }

    // Dynamisch Setter-Routen registrieren
    for (const [path, set_config] of Object.entries(SET_CONFIG_MAP)) {
        router.put(`/${path}`, createSetConfigHandler(set_config));
    }

    return router;
};
