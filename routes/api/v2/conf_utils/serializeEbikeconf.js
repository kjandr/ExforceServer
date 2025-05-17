const {METADATA_EBIKE} = require("../../../../conf_data/confEbikeFields");
const { createBufferWriters, convertEnumToIndex, convertStringToArray } = require("./Helper");

function serializeEbikeconf_V1(conf, signature) {
    const writers = createBufferWriters();
    const {
        writeUInt8, writeUInt16, writeInt16, writeUInt32, writeInt32,
        writeFloat16, writeFloat32Auto, writeByteArray
    } = writers;

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
    writeUInt8(conf.batteryCurrent);

    // wheelSize (uint16_t)
    writeUInt16(conf.wheelSize);

    // motorCurrent
    writeUInt8(conf.motorCurrent);

    // display_parameter
    writeUInt8(conf.display_parameter ? 1 : 0);

    // maxAssistSteps
    writeUInt8(conf.maxAssistSteps);

    // maxMotorCurrent und maxMotorCurrent2 Arrays
    writeByteArray(conf.maxMotorCurrent, 11);
    writeByteArray(conf.maxMotorCurrent2, 11);

    // wattPadelecMode
    writeUInt8(convertEnumToIndex(conf.wattPadelecMode, METADATA_EBIKE.wattPadelecMode.enums));

    // senseCadence und senseCadence2 Arrays
    writeByteArray(conf.senseCadence, 11);
    writeByteArray(conf.senseCadence2, 11);

    // padel_length
    writeUInt8(conf.crank_length);

    // Alle Teile zu einem Buffer zusammenfügen
    return writers.getBuffer();
}

module.exports = { serializeEbikeconf_V1 };
