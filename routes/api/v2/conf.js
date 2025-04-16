const express = require("express");
const { Buffer } = require('buffer');
const {
    deserializeMcconf_V1,
    V2
} = require("@utils/deserializeMcconf");
const { decipher, encipher } = require("@utils/crypto");

const MCCONF_SIGNATURE_V1 = 2525666056;
const MCCONF_SIGNATURE_V2 = 87654321; // Beispielwert Version 2

/**
 * Entschlüsselt den gesamten Buffer analog zu deinem C++ decrypt():
 *  - liest das 4‑Byte-Salt am Ende-5..‑Byte
 *  - setzt key[1] = salt
 *  - läuft blockweise über Cipher-Blöcke (je 8 Byte) und ruft decipher(50,...)
 */
function decryptConf(buffer, version) {
    // Pre-v2.5.5.3 noch unverschlüsselt zurückgeben
    if (version < "2.5.5.3") {
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




module.exports = () => {
    const router = express.Router();

    // Body-Parser konfigurieren
    router.use(express.json({ limit: "1mb" }));

    /**
     * POST /mc
     * Body: {
     *   uuid: string,
     *   version: string,
     *   conf: string  // Base64-kodierte mcconf-Daten
     * }
     */
    router.post("/mc", (req, res, next) => {

        try {
            const { uuid, version, conf: confB64  } = req.body;

            if (typeof confB64 !== "string") {
                return res.status(400).json({ error: "`confB64` muss ein Base64-String sein." });
            }

            // 1) Base64 → Buffer
            const encrypted = Buffer.from(confB64, "base64");

            // 2) entschlüsseln
            const { plain, salt } = decryptConf(encrypted, version);

            // 3) Signatur aus plain lesen
            const signature = plain.readUInt32BE(0);

            // 4) Dispatcher
            let conf;
            if (signature === MCCONF_SIGNATURE_V1) {
                conf = deserializeMcconf_V1(plain);
            } else if (signature === MCCONF_SIGNATURE_V2) {
                conf = deserializeMcconf_V2(plain);
            } else {
                return res
                    .status(400)
                    .json({ error: `Unbekannte Signatur: ${signature}` });
            }

            //console.log(conf);

            // 5) Antwort
            res.json({
                uuid,
                version,
                conf
            });
        } catch (err) {
            next(err);
        }
    });

    return router;
};
