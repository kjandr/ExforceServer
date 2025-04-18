// 1) Definiere hier in einem Objekt alle statischen Metadaten je Feld:
const METADATA_EBIKE = {
    torqueFactor:        { type: "array", size: 11, scale: 1, suffix: "%", min: 0, max: 100, decimals: 0 },
    trottleFactor:       { type: "array", size: 11,  scale: 1, suffix: "%", min: 0, max: 100, decimals: 0 },
    senseTorque:         { type: "array", size: 11,  scale: 1, suffix: "level", min: 0, max: 10, decimals: 0 },
    maxSpeedTorque:      { type: "array", size: 11,  scale: 1, suffix: "km/h", min: 0, max: 100, decimals: 0 },
    maxSpeedTrottle:     { type: "array", size: 11,  scale: 1, suffix: "km/h", min: 0, max: 100, decimals: 0 },

    torqueFactor2:       { type: "array", size: 11,  scale: 1, suffix: "%", min: 0, max: 100, decimals: 0 },
    trottleFactor2:      { type: "array", size: 11,  scale: 1, suffix: "%", min: 0, max: 100, decimals: 0 },
    senseTorque2:        { type: "array", size: 11,  scale: 1, suffix: "level", min: 0, max: 10, decimals: 0 },
    maxSpeedTorque2:     { type: "array", size: 11,  scale: 1, suffix: "km/h", min: 0, max: 100, decimals: 0 },
    maxSpeedTrottle2:    { type: "array", size: 11,  scale: 1, suffix: "km/h", min: 0, max: 100, decimals: 0 },

    maxWatt:             { type: "int", scale: 1, suffix: "W", min: 0, max: 5000 },
    batteryCurrent:      { type: "int", scale: 1, suffix: "A", min: 0, max: 100 },
    wheelSize:           { type: "int", scale: 1, suffix: "mm", min: 300, max: 9999 },
    motorCurrent:        { type: "int", scale: 1, suffix: "A", min: 0, max: 140 },

    display_parameter:   { type: "bool", suffix: "" },
    maxAssistSteps:      { type: "int", scale: 1, suffix: "level", min: 0, max: 10 },

    maxMotorCurrent:     { type: "array", size: 11,  scale: 1, suffix: "A", min: 0, max: 140 },
    maxMotorCurrent2:    { type: "array", size: 11,  scale: 1, suffix: "A", min: 0, max: 140 },

    wattPadelecMode:     { type: "enum", enums: ["off", "250", "350"], suffix: "" },

    senseCadence:        { type: "array", size: 11,  scale: 1, suffix: "sense", min: 0, max: 10 },
    senseCadence2:       { type: "array", size: 11,  scale: 1, suffix: "sense", min: 0, max: 10 },

    padel_length:        { type: "int", scale: 1, suffix: "mm", min: 100, max: 220 }
};

// 2) Und hier das Mapping: Original‑Key → Alias‑Name + welche Meta‑Properties mitkommen
const FIELD_MAP_EBIKE = {
    torqueFactor:       { alias:"torqueFactor",     meta:["type","size","scale","suffix","min","max","decimals"] },
    trottleFactor:      { alias:"trottleFactor",    meta:["type","size","scale","suffix","min","max","decimals"] },
    senseTorque:        { alias:"senseTorque",      meta:["type","size","scale","suffix","min","max","decimals"] },
    maxSpeedTorque:     { alias:"maxSpeedTorque",   meta:["type","size","scale","suffix","min","max","decimals"] },
    maxSpeedTrottle:    { alias:"maxSpeedTrottle",  meta:["type","size","scale","suffix","min","max","decimals"] },

    torqueFactor2:      { alias:"torqueFactor2",    meta:["type","size","scale","suffix","min","max","decimals"] },
    trottleFactor2:     { alias:"trottleFactor2",   meta:["type","size","scale","suffix","min","max","decimals"] },
    senseTorque2:       { alias:"senseTorque2",     meta:["type","size","scale","suffix","min","max","decimals"] },
    maxSpeedTorque2:    { alias:"maxSpeedTorque2",  meta:["type","size","scale","suffix","min","max","decimals"] },
    maxSpeedTrottle2:   { alias:"maxSpeedTrottle2", meta:["type","size","scale","suffix","min","max","decimals"] },

    maxWatt:            { alias:"maxWatt",          meta:["type","scale","suffix","min","max"] },
    batteryCurrent:     { alias:"batteryCurrent",   meta:["type","scale","suffix","min","max"] },
    wheelSize:          { alias:"wheelSize",        meta:["type","scale","suffix","min","max"] },
    motorCurrent:       { alias:"motorCurrent",     meta:["type","scale","suffix","min","max"] },

    display_parameter:  { alias:"displayParameter", meta:["type","suffix"] },
    maxAssistSteps:     { alias:"maxAssistSteps",   meta:["type","scale","suffix","min","max"] },

    maxMotorCurrent:    { alias:"maxMotorCurrent",  meta:["type","size","scale","suffix","min","max"] },
    maxMotorCurrent2:   { alias:"maxMotorCurrent2", meta:["type","size","scale","suffix","min","max"] },

    wattPadelecMode:    { alias:"wattPadelecMode",  meta:["type","enums","suffix"] },

    senseCadence:       { alias:"senseCadence",     meta:["type","size","scale","suffix","min","max"] },
    senseCadence2:      { alias:"senseCadence2",    meta:["type","size","scale","suffix","min","max"] },

    padel_length:       { alias:"padelLength",      meta:["type","scale","suffix","min","max"] }
};

module.exports = { METADATA_EBIKE, FIELD_MAP_EBIKE };
