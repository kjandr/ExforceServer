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

module.exports = { decipher, encipher };
