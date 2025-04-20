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

module.exports = { versionLt, mergeConf, decodeAndMapAliases, uuidToBytes };
