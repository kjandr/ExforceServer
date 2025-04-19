const express = require("express");
const { Buffer } = require('buffer');

const { deserializeMcconf_V1 } = require("@utils/deserializeMcconf");
const { deserializeEbikeconf_V1 } = require("@utils/deserializeEbikeconf");
const { deserializeAppconf_V1 } = require("@utils/deserializeAppconf");

const { METADATA_MC, FIELD_MAP_MC } = require("@utils/confMcFields");
const { METADATA_EBIKE, FIELD_MAP_EBIKE } = require("@utils/confEbikeFields");
const { METADATA_APP, FIELD_MAP_APP } = require("@utils/confAppFields");

const { serializeMcconf_V1 } = require("@utils/serializeMcconf");
const { serializeEbikeconf_V1 } = require("@utils/serializeEbikeconf");
const { serializeAppconf_V1 } = require("@utils/serializeAppconf");

const { decrypt, encrypted } = require("@utils/crypto");

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

function versionLt(a, b) {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na < nb) return true;
        if (na > nb) return false;
    }
    return false;
}

function mergeConf(conf, newValues) {
    for (const key of Object.keys(newValues)) {
        if (
            typeof newValues[key] === "object" &&
            newValues[key] !== null &&
            !Array.isArray(newValues[key]) &&
            typeof conf[key] === "object" &&
            conf[key] !== null &&
            !Array.isArray(conf[key])
        ) {
            // Rekursives Mergen für verschachtelte Objekte
            mergeConf(conf[key], newValues[key]);
        } else {
            // Einfacher Wert oder überschreiben
            conf[key] = newValues[key];
        }
    }
    return conf;
}

function decodeAndMapAliases(values, fieldMap) {
    const aliasToKey = {};
    for (const [originalKey, { alias }] of Object.entries(fieldMap)) {
        aliasToKey[alias] = originalKey;
    }

    //const valuesStr = Buffer.from(valuesBase64, "base64").toString("utf8");
    const parsed = JSON.parse(values);

    return mapKeysDeep(parsed, aliasToKey);
}

function mapKeysDeep(obj, aliasMap) {
    if (Array.isArray(obj)) {
        return obj.map(item => mapKeysDeep(item, aliasMap));
    }

    if (obj !== null && typeof obj === "object") {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            const mappedKey = aliasMap[key] || key;
            result[mappedKey] = mapKeysDeep(value, aliasMap);
        }
        return result;
    }

    // Primitive Wert (String, Zahl, Bool, null)
    return obj;
}

function uuidToBytes(uuid) {
    const cleaned = uuid.replace(/-/g, "");
    const buf = Buffer.alloc(cleaned.length / 2);
    for (let i = 0; i < cleaned.length; i += 2) {
        buf[i / 2] = parseInt(cleaned.substring(i, i + 2), 16);
    }
    return buf;
}


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

/**
 * POST /..
 * Body: {
 *   uuid: string,
 *   version: string,
 *   conf: string  // Base64-kodierte conf-Daten
 * }
 */
function createGetConfigHandler({ deserialize, fieldMap, metadata, signatures }) {
    return (req, res, next) => {
        try {
            const { uuid, version, conf: confB64 } = req.body;

            if (typeof confB64 !== "string") {
                return res.status(400).json({ error: "`conf` muss ein Base64-String sein." });
            }

            const encrypted = Buffer.from(confB64, "base64");
            const { plain } = decryptConf(encrypted, version);
            const signature = plain.readUInt32BE(0);

            let conf;
            if (signature === signatures.v1) {
                conf = deserialize(plain);
            } else {
                return res.status(400).json({ error: `Unbekannte Signatur: ${signature}` });
            }

            const filtered = {};
            for (const [origKey, { alias, meta }] of Object.entries(fieldMap)) {
                if (conf.hasOwnProperty(origKey) && metadata[origKey]) {
                    const entry = { value: conf[origKey] };
                    for (const m of meta) {
                        if (metadata[origKey][m] !== undefined) {
                            entry[m] = metadata[origKey][m];
                        }
                    }
                    filtered[alias] = entry;
                }
            }

            //console.log(filtered);

            res.json({ uuid, version, conf: filtered });
        } catch (err) {
            next(err);
        }
    };
}

/**
 * PUT /:configType
 * Body: {
 *   uuid: string,
 *   version: string,
 *   conf: object  // Konfigurationsobjekt ohne Metadaten
 * }
 */
function createSetConfigHandler({ deserialize, serialize, fieldMap, signatures }) {
    return (req, res, next) => {
        try {
            const { uuid, version, conf: confB64, values } = req.body;

            if (typeof confB64 !== "string") {
                return res.status(400).json({ error: "`conf` muss ein Base64-String sein." });
            }

            const encryptedInput = Buffer.from(confB64, "base64");
            const { plain, salt } = decryptConf(encryptedInput, version);
            const signature = plain.readUInt32BE(0);

            const newValues = decodeAndMapAliases(values, fieldMap);

            let conf;
            if (signature === signatures.v1) {
                conf = deserialize(plain);
            } else {
                return res.status(400).json({ error: `Unbekannte Signatur: ${signature}` });
            }

            mergeConf(conf, newValues);

            // Konfiguration wieder serialisieren
            const serialized = serialize(conf, signature);

            const uuidBytes = uuidToBytes(uuid);

            // UUID-Bytes an serialisierte Konfiguration anhängen
            const finalBuffer = Buffer.concat([serialized, uuidBytes]);

            // Verschlüsselung durchführen und Base64
            const { encrypted } = encryptedConf(finalBuffer, salt, version);
            const resultConfB64 = encrypted.toString('base64');

            // Hier würde man die Konfiguration speichern/aktualisieren
            // z.B. in einer Datenbank

            res.json({
                uuid,
                version,
                conf: resultConfB64,
                status: "success",
                message: "Konfiguration erfolgreich gespeichert"
            });
        } catch (err) {
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
