const {Buffer} = require("buffer");

/**
 * Entschlüsselt in-place das 64‑Bit‑Block-Paar v mit dem 128‑Bit‑Schlüssel k.
 * @param {number} numCycles  Anzahl der Runden (typischerweise 32 oder 16)
 * @param {Uint32Array|number[]} v   Länge‑2-Array [v0, v1]
 * @param {Uint32Array|number[]} k   Länge‑4-Array [k0, k1, k2, k3]
 */
function decipher(numCycles, v, k) {
    const delta = 0x8F4AE5CA >>> 0;
    let v0 = v[0] >>> 0;
    let v1 = v[1] >>> 0;
    let sum = (delta * numCycles) >>> 0;

    for (let i = 0; i < numCycles; i++) {
        // v1 -= (((v0 << 4) ^ (v0 >>> 5)) + v0) ^ (sum + k[(sum>>>11) & 3]);
        const tmp1 = (((v0 << 4) ^ (v0 >>> 5)) + v0) >>> 0;
        const key1 = (sum + (k[(sum >>> 11) & 3] >>> 0)) >>> 0;
        v1 = (v1 - (tmp1 ^ key1)) >>> 0;

        sum = (sum - delta) >>> 0;

        // v0 -= (((v1 << 4) ^ (v1 >>> 5)) + v1) ^ (sum + k[sum & 3]);
        const tmp2 = (((v1 << 4) ^ (v1 >>> 5)) + v1) >>> 0;
        const key2 = (sum + (k[sum & 3] >>> 0)) >>> 0;
        v0 = (v0 - (tmp2 ^ key2)) >>> 0;
    }

    v[0] = v0;
    v[1] = v1;
}

/**
 * Verschlüsselt in-place das 64‑Bit‑Block-Paar v mit dem 128‑Bit‑Schlüssel k.
 * @param {number} numCycles  Anzahl der Runden (typischerweise 32 oder 16)
 * @param {Uint32Array|number[]} v   Länge‑2-Array [v0, v1]
 * @param {Uint32Array|number[]} k   Länge‑4-Array [k0, k1, k2, k3]
 */
function encipher(numCycles, v, k) {
    const delta = 0x8F4AE5CA >>> 0;
    let v0 = v[0] >>> 0;
    let v1 = v[1] >>> 0;
    let sum = 0;

    for (let i = 0; i < numCycles; i++) {
        // v0 += (((v1 << 4) ^ (v1 >>> 5)) + v1) ^ (sum + k[sum & 3]);
        const tmp1 = (((v1 << 4) ^ (v1 >>> 5)) + v1) >>> 0;
        const key1 = (sum + (k[sum & 3] >>> 0)) >>> 0;
        v0 = (v0 + (tmp1 ^ key1)) >>> 0;

        sum = (sum + delta) >>> 0;

        // v1 += (((v0 << 4) ^ (v0 >>> 5)) + v0) ^ (sum + k[(sum>>>11) & 3]);
        const tmp2 = (((v0 << 4) ^ (v0 >>> 5)) + v0) >>> 0;
        const key2 = (sum + (k[(sum >>> 11) & 3] >>> 0)) >>> 0;
        v1 = (v1 + (tmp2 ^ key2)) >>> 0;
    }

    v[0] = v0;
    v[1] = v1;
}

function decrypt(buffer) {
    const len = buffer.length;
    const plain = Buffer.from(buffer); // Kopie, um input nicht zu mutieren

    // Standard-Key
    const key = [0x6b1124ff >>> 0, 0x5b35ace3 >>> 0, 0xa05326a8 >>> 0, 0x3421bacb >>> 0];

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

function encrypted(buffer, salt) {
    // Verschlüsselungs-Keys
    const key = [0xdc23ffc6 >>> 0, 0x11776bef >>> 0, 0xdf71829c >>> 0, 0xac81824c >>> 0];

    // Client-Salt aus einer globalen Quelle (muss in der Anwendung verwaltet werden)
    // Server-Salt generieren
    const serverSalt = Math.floor(Math.random() * 0x100000000) >>> 0;
    key[1] = salt;
    key[2] = serverSalt;

    let origLen = buffer.length;
    const mod = (origLen - 1) % 8;
    const paddedLen = mod !== 0 ? (8 - mod) + origLen : origLen;
    const totalLen = paddedLen + 4; // +4 bytes for the salt

    // Neuen Puffer mit genug Platz erstellen
    const newBuffer = Buffer.alloc(totalLen);
    buffer.copy(newBuffer, 0);

    // Verschlüsselung durchführen
    let indRead = 0;
    let indWrite = 0;

    for (let i = 0; i < (paddedLen - 1) / 8; i++) {
        // Lese v0/v1 aus dem Buffer
        const v0 = newBuffer.readUInt32BE(indRead);
        indRead += 4;
        const v1 = newBuffer.readUInt32BE(indRead);
        indRead += 4;

        const v = [v0, v1];
        encipher(50, v, key);

        newBuffer.writeUInt32BE(v[0], indWrite);
        indWrite += 4;
        newBuffer.writeUInt32BE(v[1], indWrite);
        indWrite += 4;
    }

    newBuffer.writeUInt32BE(serverSalt, paddedLen); // sicher, weil totalLen >= paddedLen + 4

    return { encrypted: newBuffer, salt: serverSalt  };
}

module.exports = { decrypt, encrypted };
