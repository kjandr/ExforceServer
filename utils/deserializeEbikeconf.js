function deserializeEbikeconf_V1(buffer) {
    const payload = buffer;
    let offset = 0;

    const readUInt16 = () => {
        const val = payload.readUInt16BE(offset);
        offset += 2;
        return val;
    };

    const readUInt32 = () => {
        const val = payload.readUInt32BE(offset);
        offset += 4;
        return val;
    };

    const readArray = (length) => {
        if (offset + length > payload.length) {
            throw new Error("Buffer overflow while reading array");
        }
        const arr = [];
        for (let i = 0; i < length; i++) {
            arr.push(payload[offset++]);
        }
        return arr;
    };

    const conf = {};
    conf.signature = readUInt32();

    conf.torqueFactor     = readArray(11);
    conf.trottleFactor    = readArray(11);
    conf.senseTorque      = readArray(11);
    conf.maxSpeedTorque   = readArray(11);
    conf.maxSpeedTrottle  = readArray(11);

    conf.torqueFactor2     = readArray(11);
    conf.trottleFactor2    = readArray(11);
    conf.senseTorque2      = readArray(11);
    conf.maxSpeedTorque2   = readArray(11);
    conf.maxSpeedTrottle2  = readArray(11);

    conf.maxWatt        = readUInt16();
    conf.batteryCurrent = payload[offset++];
    conf.wheelSize      = readUInt16();
    conf.motorCurrent   = payload[offset++];

    conf.display_parameter = payload[offset++];
    conf.maxAssistSteps    = payload[offset++];

    conf.maxMotorCurrent  = readArray(11);
    conf.maxMotorCurrent2 = readArray(11);

    conf.wattPadelecMode = payload[offset++];

    conf.senseCadence  = readArray(11);
    conf.senseCadence2 = readArray(11);

    conf.padel_length = payload[offset++];
    return conf;
}

function deserializeEbikeconf_V2(buffer) {

    const conf = {};
    return conf;
}

module.exports = { deserializeEbikeconf_V1, deserializeEbikeconf_V2 };
