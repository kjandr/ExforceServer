const {METADATA_EBIKE} = require("../conf_data/confEbikeFields");

function serializeEbikeconf_V1(conf, signature) {
    const parts = [];

    const writeUInt16 = v => { const b = Buffer.allocUnsafe(2); b.writeUInt16BE(v, 0); parts.push(b); };
    const writeUInt32 = v => { const b = Buffer.allocUnsafe(4); b.writeUInt32BE(v >>> 0, 0); parts.push(b); };
    const writeByte = v => { parts.push(Buffer.from([v & 0xFF])); };
    const writeByteArray = (arr, expectedLength) => {
        if (arr.length !== expectedLength) {
            throw new Error(`Array muss genau ${expectedLength} Elemente haben, hat aber ${arr.length}`);
        }
        arr.forEach(v => writeByte(v));
    };

    const convertStringToArray = (str, length = 16) => {
        const arr = new Array(length).fill(0);  // Initialisiere mit Nullen
        if (typeof str === 'string') {
            const bytes = str.split('').map(char => char.charCodeAt(0));
            bytes.forEach((byte, i) => {
                if (i < length) arr[i] = byte;
            });
        }
        return arr;
    }

    const convertEnumToIndex = (value, enumArray) => {
        // Wenn value bereits eine Zahl ist, direkt zurückgeben
        if (typeof value === 'number') {
            return value;
        }

        // Suche den Index des Wertes im Enum-Array
        const index = enumArray.indexOf(String(value));

        // Wenn nicht gefunden (-1), gib 0 als Standardwert zurück
        return index >= 0 ? index : 0;
    }

    // Signature
    writeUInt32(signature);

    writeByteArray(convertStringToArray(conf.controllerSerial, 16), 16);
    writeByteArray(convertStringToArray(conf.motorSerial, 16), 16);

    // Arrays mit 11 Elementen
    writeByteArray(conf.torqueFactor, 11);
    writeByteArray(conf.trottleFactor, 11);
    writeByteArray(conf.senseTorque, 11);
    writeByteArray(conf.maxSpeedTorque, 11);
    writeByteArray(conf.maxSpeedTrottle, 11);

    writeByteArray(conf.torqueFactor2, 11);
    writeByteArray(conf.trottleFactor2, 11);
    writeByteArray(conf.senseTorque2, 11);
    writeByteArray(conf.maxSpeedTorque2, 11);
    writeByteArray(conf.maxSpeedTrottle2, 11);

    // maxWatt (uint16_t)
    writeUInt16(conf.maxWatt);

    // batteryCurrent
    writeByte(conf.batteryCurrent);

    // wheelSize (uint16_t)
    writeUInt16(conf.wheelSize);

    // motorCurrent
    writeByte(conf.motorCurrent);

    // display_parameter
    writeByte(conf.display_parameter ? 1 : 0);

    // maxAssistSteps
    writeByte(conf.maxAssistSteps);

    // maxMotorCurrent und maxMotorCurrent2 Arrays
    writeByteArray(conf.maxMotorCurrent, 11);
    writeByteArray(conf.maxMotorCurrent2, 11);

    // wattPadelecMode
    writeByte(convertEnumToIndex(conf.wattPadelecMode, METADATA_EBIKE.wattPadelecMode.enums));

    // senseCadence und senseCadence2 Arrays
    writeByteArray(conf.senseCadence, 11);
    writeByteArray(conf.senseCadence2, 11);

    // padel_length
    writeByte(conf.crank_length);

    // Alle Teile zu einem Buffer zusammenfügen
    return Buffer.concat(parts);
}
function serializeEbikeconf_V2(buffer) {

    const conf = {};
    return conf;
}

module.exports = { serializeEbikeconf_V1, serializeEbikeconf_V2 };
