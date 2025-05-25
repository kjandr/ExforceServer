const { Buffer } = require('buffer');

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
    let changed = false;

    for (const key of Object.keys(newValues)) {
        const newVal = newValues[key];
        const oldVal = conf[key];

        if (
            typeof newVal === "object" &&
            newVal !== null &&
            !Array.isArray(newVal) &&
            typeof oldVal === "object" &&
            oldVal !== null &&
            !Array.isArray(oldVal)
        ) {
            // Rekursiv mergen
            if (mergeConf(oldVal, newVal)) changed = true;
        } else {
            // Vergleichen, nur wenn unterschiedlich setzen
            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                conf[key] = newVal;
                changed = true;
            }
        }
    }

    return changed;
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


/**
 * Erstellt Lesefunktionen für einen Buffer mit fortlaufendem Offset
 * @param {Buffer} buffer - Der zu lesende Buffer
 * @returns {Object} - Objekt mit Lesefunktionen
 */
function createBufferReaders(buffer) {
    let offset = 0;

    return {
        readUInt8: () => {
            const val = buffer.readUInt8(offset);
            offset += 1;
            return val;
        },

        readInt16: () => {
            const val = buffer.readInt16BE(offset);
            offset += 2;
            return val;
        },

        readUInt16: () => {
            const val = buffer.readUInt16BE(offset);
            offset += 2;
            return val;
        },

        readInt32: () => {
            const val = buffer.readInt32BE(offset);
            offset += 4;
            return val;
        },

        readUInt32: () => {
            const val = buffer.readUInt32BE(offset);
            offset += 4;
            return val;
        },

        // Liest 2-Byte-Gleitkommazahl, skaliert durch scale
        readFloat16: (scale) => {
            const val = buffer.readInt16BE(offset);
            offset += 2;
            return val / scale;
        },

        // Liest 4-Byte-Gleitkommazahl
        readFloat32Auto: () => {
            // Liest 4 Bytes als unsigned 32‑Bit
            const res = buffer.readUInt32BE(offset);
            offset += 4;

            // Extrahiere Exponent, Mantisse und Vorzeichen
            let e = (res >>> 23) & 0xFF;
            const sigI = res & 0x7FFFFF;
            const neg = (res >>> 31) !== 0;

            // Berechne das Signifikand
            let sig = 0.0;
            if (e !== 0 || sigI !== 0) {
                // entspricht (sig_i / (2^23 * 2)) + 0.5
                sig = sigI / (8388608.0 * 2.0) + 0.5;
                // adjust exponent bias (126 statt 127 im C‑Code)
                e = e - 126;
            }

            if (neg) sig = -sig;

            // ldexpf(sig, e) ≈ sig * 2^e
            return sig * Math.pow(2, e);
        },

        readArray: (length) => {
            if (offset + length > buffer.length) {
                throw new Error("Buffer overflow while reading array");
            }
            const arr = [];
            for (let i = 0; i < length; i++) {
                arr.push(buffer[offset++]);
            }
            return arr;
        }
    };
}

/**
 * Konvertiert Byte-Array zu String
 * @param {Array} byteArray - Das zu konvertierende Byte-Array
 * @returns {string} - Der resultierende String
 */
function convertArrayToString(byteArray) {
    if (Array.isArray(byteArray)) {
        return byteArray
            .filter(byte => byte !== 0)  // Entferne Null-Bytes
            .map(byte => String.fromCharCode(byte))  // Konvertiere zu Zeichen
            .join('');  // Verbinde zu einem String
    }
    return "";
}

/**
 * Konvertiert einen Index in den entsprechenden Enum-Wert
 * @param {number} index - Der Index im Enum-Array
 * @param {Array} enumArray - Das Enum-Array
 * @returns {*} - Der Enum-Wert
 */
function convertIndexToEnum(index, enumArray) {
    // Prüfe ob der Index gültig ist
    if (typeof index === 'number' && index >= 0 && index < enumArray.length) {
        return enumArray[index];
    }

    // Falls der Index ungültig ist, gib den ersten Wert zurück
    return enumArray[0];
}




/**
 * Erstellt Schreibfunktionen für die Serialisierung
 * @returns {Object} Objekt mit Schreibfunktionen
 */
function createBufferWriters() {
    const parts = [];

    return {
        // Gibt Zugriff auf das parts-Array
        getParts: () => parts,

        // Gibt einen konkatenierten Buffer zurück
        getBuffer: () => Buffer.concat(parts),

        // Schreibfunktionen
        writeUInt8: (v) => {
            parts.push(Buffer.from([v & 0xFF]));
        },

        writeUInt16: (v) => {
            const b = Buffer.allocUnsafe(2);
            b.writeUInt16BE(v, 0);
            parts.push(b);
        },

        writeInt16: (v) => {
            const b = Buffer.allocUnsafe(2);
            b.writeInt16BE(v, 0);
            parts.push(b);
        },

        writeUInt32: (v) => {
            const b = Buffer.allocUnsafe(4);
            b.writeUInt32BE(v >>> 0, 0);
            parts.push(b);
        },

        writeInt32: (v) => {
            const b = Buffer.allocUnsafe(4);
            b.writeInt32BE(v, 0);
            parts.push(b);
        },

        writeFloat16: (v, scale) => {
            const b = Buffer.allocUnsafe(2);
            b.writeInt16BE(Math.round(v * scale), 0);
            parts.push(b);
        },

        writeFloat32Auto: (number) => {
            // Subnormale Werte < 1.5e-38 auf 0 setzen
            let n = number;
            if (Math.abs(n) < 1.5e-38) {
                n = 0.0;
            }
            // Buffer.writeFloatBE schreibt IEEE‑754 single precision
            const b = Buffer.allocUnsafe(4);
            b.writeFloatBE(n, 0);
            parts.push(b);
        },

        writeByteArray: (arr, expectedLength) => {
            if (arr.length !== expectedLength) {
                throw new Error(`Array muss genau ${expectedLength} Elemente haben, hat aber ${arr.length}`);
            }
            arr.forEach(v => {
                parts.push(Buffer.from([v & 0xFF]));
            });
        }
    };
}

/**
 * Konvertiert einen Enum-Wert in den entsprechenden Index
 * @param {string|number} value - Der Enum-Wert oder Index
 * @param {Array<string>} enumArray - Das Enum-Array
 * @returns {number} - Der Index
 */
function convertEnumToIndex(value, enumArray) {
    // Wenn value bereits eine Zahl ist, direkt zurückgeben
    if (typeof value === 'number') {
        return value;
    }

    // Suche den Index des Wertes im Enum-Array
    const index = enumArray.indexOf(String(value));

    // Wenn nicht gefunden (-1), gib 0 als Standardwert zurück
    return index >= 0 ? index : 0;
}

/**
 * Konvertiert einen String in ein Byte-Array fester Länge
 * @param {string} str - Der zu konvertierende String
 * @param {number} length - Die gewünschte Länge des Arrays
 * @returns {Array} - Das Byte-Array
 */
function convertStringToArray(str, length = 16) {
    const arr = new Array(length).fill(0);  // Initialisiere mit Nullen
    if (typeof str === 'string') {
        const bytes = str.split('').map(char => char.charCodeAt(0));
        bytes.forEach((byte, i) => {
            if (i < length) arr[i] = byte;
        });
    }
    return arr;
}


module.exports = {
    versionLt,
    mergeConf,
    decodeAndMapAliases,
    uuidToBytes,

    createBufferReaders,
    convertArrayToString,
    convertIndexToEnum,

    createBufferWriters,
    convertEnumToIndex,
    convertStringToArray
};
