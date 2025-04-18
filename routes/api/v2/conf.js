const express = require("express");
const { Buffer } = require('buffer');
const { deserializeMcconf_V1 } = require("@utils/deserializeMcconf");
const { deserializeEbikeconf_V1 } = require("@utils/deserializeEbikeconf");
const { deserializeAppconf_V1 } = require("@utils/deserializeAppconf");
const { METADATA_MC, FIELD_MAP_MC } = require("@utils/confMcFields");
const { METADATA_EBIKE, FIELD_MAP_EBIKE } = require("@utils/confEbikeFields");
const { METADATA_APP, FIELD_MAP_APP } = require("@utils/confAppFields");
const { decipher } = require("@utils/crypto");

const SIGNATURES = {
    mc: { v1: 2525666056 },
    ebike: { v1: 1111649770 },
    app: { v1: 3733512279 }
};

const CONFIG_MAP = {
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

/**
 * Entschlüsselt den gesamten Buffer analog zu deinem C++ decrypt():
 *  - liest das 4‑Byte-Salt am Ende-5..‑Byte
 *  - setzt key[1] = salt
 *  - läuft blockweise über Cipher-Blöcke (je 8 Byte) und ruft decipher(50,...)
 */
function decryptConf(buffer, version) {
    // Pre-v2.5.5.3 noch unverschlüsselt zurückgeben
    if (versionLt(version, "2.5.5.3")) {
        return { plain: Buffer.from(buffer), salt: null };
    }
    const len = buffer.length;
    const plain = Buffer.from(buffer); // Kopie, um input nicht zu mutieren

    // Standard-Key
    const key = [
        0x6b1124ff >>> 0,
        0x5b35ace3 >>> 0,
        0xa05326a8 >>> 0,
        0x3421bacb >>> 0
    ];

    // Salt liegt bei offset = len-1-4
    const saltOffset = len - 1 - 4;
    const salt = plain.readUInt32BE(saltOffset) >>> 0;
    key[1] = salt;

    // Anzahl 8‑Byte-Blöcke: floor((len-1-4) / 8)
    const blockCount = Math.floor((len - 1 - 4) / 8);
    let inOff = 0;
    let outOff = 0;

    for (let i = 0; i < blockCount; i++) {
        // Lese v0/v1 aus plain
        const v0 = plain.readUInt32BE(inOff) >>> 0;
        const v1 = plain.readUInt32BE(inOff + 4) >>> 0;
        const v = [v0, v1];

        // entschlüsseln
        decipher(50, v, key);

        // schreibe entschlüsselte Werte zurück
        plain.writeUInt32BE(v[0], outOff);
        plain.writeUInt32BE(v[1], outOff + 4);

        inOff  += 8;
        outOff += 8;
    }

    return { plain, salt };
}

/**
 * POST /..
 * Body: {
 *   uuid: string,
 *   version: string,
 *   conf: string  // Base64-kodierte conf-Daten
 * }
 */
function createConfigHandler({ deserialize, fieldMap, metadata, signatures }) {
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

module.exports = () => {
    const router = express.Router();

    // Body-Parser konfigurieren
    router.use(express.json({ limit: "1mb" }));


    // Dynamisch Routen registrieren
    for (const [path, config] of Object.entries(CONFIG_MAP)) {
        router.post(`/${path}`, createConfigHandler(config));
    }

    return router;
};
