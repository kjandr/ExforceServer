const {METADATA_EBIKE} = require("../../../../conf_data/confEbikeFields");
const { createBufferReaders, convertArrayToString, convertIndexToEnum } = require("./Helper");

function deserializeEbikeconf_V1(buffer) {
    const readers = createBufferReaders(buffer);
    const {
        readUInt8, readInt16, readUInt16, readInt32, readUInt32,
        readFloat16, readFloat32Auto, readArray
    } = readers;


    const conf = {};
    conf.signature = readUInt32();

    conf.controllerSerial = convertArrayToString(readArray(16));
    conf.motorSerial      = convertArrayToString(readArray(16));

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
    conf.batteryCurrent = readUInt8();
    conf.wheelSize      = readUInt16();
    conf.motorCurrent   = readUInt8();

    conf.display_parameter = readUInt8() ? 1 : 0;
    conf.maxAssistSteps    = readUInt8();

    conf.maxMotorCurrent  = readArray(11);
    conf.maxMotorCurrent2 = readArray(11);

    conf.wattPadelecMode = convertIndexToEnum(readUInt8(), METADATA_EBIKE.wattPadelecMode.enums);

    conf.senseCadence  = readArray(11);
    conf.senseCadence2 = readArray(11);

    conf.crank_length = readUInt8();
    return conf;
}

module.exports = { deserializeEbikeconf_V1 };
