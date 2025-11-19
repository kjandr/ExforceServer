// controllers/time.controller.js  (COMMONJS VERSION)
const fs = require("fs");
const crypto = require("crypto");

// ─────────────────────────────────────────────────────────────
// Konfiguration aus ENV
// ─────────────────────────────────────────────────────────────
const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH || "c:\\projects\\key\\time_es256_private.pem";
const TIME_KID = process.env.TIME_KID || "time-2025-v1";
const TOKEN_TTL_SEC = Number.isFinite(Number(process.env.TOKEN_TTL_SEC))
    ? Number(process.env.TOKEN_TTL_SEC)
    : 300;
const PRIVATE_KEY_PASSPHRASE = process.env.PRIVATE_KEY_PASSPHRASE || undefined;

// ─────────────────────────────────────────────────────────────
// jose dynamisch laden (ESM only → in CJS via import())
// ─────────────────────────────────────────────────────────────
let _josePromise = null;
function getJose() {
    if (!_josePromise) {
        _josePromise = import("jose"); // { SignJWT, etc. }
    }
    return _josePromise;
}

// ─────────────────────────────────────────────────────────────
// Private Key (EC P-256) laden & cachen (PKCS#8 oder SEC1)
// ─────────────────────────────────────────────────────────────
let _keyObj = null;
function getPrivateKeyObject() {
    if (_keyObj) return _keyObj;

    if (!fs.existsSync(PRIVATE_KEY_PATH)) {
        throw new Error(`Private key not found at: ${PRIVATE_KEY_PATH}`);
    }
    const pem = fs.readFileSync(PRIVATE_KEY_PATH, "utf8");
    const keyObj = crypto.createPrivateKey({
        key: pem,
        format: "pem",
        passphrase: PRIVATE_KEY_PASSPHRASE, // optional
    });

    if (keyObj.asymmetricKeyType !== "ec") {
        throw new Error(`Expected EC key, got ${keyObj.asymmetricKeyType}`);
    }
    const details = keyObj.asymmetricKeyDetails; // Node ≥16.13: { namedCurve: 'prime256v1' }
    if (details && details.namedCurve && details.namedCurve !== "prime256v1") {
        throw new Error(`Expected P-256 (prime256v1), got ${details.namedCurve}`);
    }

    _keyObj = keyObj;
    return _keyObj;
}

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────
function b64url(buf) {
    return Buffer.from(buf)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}
function randomNonceB64url(n = 16) {
    return b64url(crypto.randomBytes(n));
}
function isMacLike(s) {
    return typeof s === "string" && /^[0-9a-fA-F]{2}([:\-][0-9a-fA-F]{2}){5}$/.test(s);
}

// ─────────────────────────────────────────────────────────────
// Handler: POST /api/time-token
// Body: { dev: "90:3b:97:b3:b6:68", ttlSec?: number }
// Antwort: { jws, kid, ttlSec }
// ─────────────────────────────────────────────────────────────
async function createTimeTokenHandler(req, res) {
    try {
        const devRaw = req.body?.dev;
        const dev = typeof devRaw === "string" ? devRaw.trim() : "";

        const ttlSec =
            Number.isFinite(req.body?.ttlSec) && req.body.ttlSec > 0
                ? Math.floor(req.body.ttlSec)
                : TOKEN_TTL_SEC;

        if (!isMacLike(dev)) {
            return res.status(400).json({ error: "dev must be MAC like 'aa:bb:cc:dd:ee:ff'" });
        }

        const ts = Math.floor(Date.now() / 1000);
        const exp = ts + ttlSec;
        const payload = {
            ts,
            exp,
            dev,
            nonce: randomNonceB64url(16),
        };

        const { SignJWT } = await getJose();
        const keyObj = getPrivateKeyObject();

        const jws = await new SignJWT(payload)
            .setProtectedHeader({ alg: "ES256", kid: TIME_KID, typ: "JWT" })
            // keine jose iat/exp Claims: wir nutzen eigene ts/exp für Firmware
            .sign(keyObj);

        return res.json({ jws, kid: TIME_KID, ttlSec });
    } catch (err) {
        console.error("[time-token] error:", err?.message || err);
        return res.status(500).json({ error: "failed_to_create_time_token" });
    }
}

module.exports = {
    createTimeTokenHandler,
};
