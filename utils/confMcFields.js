// 1) Definiere hier in einem Objekt alle statischen Metadaten je Feld:
const METADATA = {
    foc_encoder_inverted: {
        type:   "bool",
        suffix: "",
        // nur exemplarisch – füge hier alle Meta‑Felder hinzu,
        // die Du später mit ausliefern willst
    },
    foc_encoder_offset: {
        type:      "double",
        scale:     1,
        suffix:    "°",
        min:       0,
        max:       360,
        decimals:  2
    },
    foc_encoder_ratio: {
        type:      "double",
        scale:     1,
        suffix:    "",
        min:       0,
        max:       10000,
        decimals:  2
    },
    foc_sensor_mode: {
        type:   "enum",
        enums:  ["Sensorless","Encoder","Hall Sensors","HFI","VSS"]
    },
    l_battery_cut_end: {
        type:     "double",
        scale:    1,
        suffix:   " V",
        min:      0,
        max:      700,
        decimals: 2
    },
    // … weitere Felder analog …
    si_battery_cells: {
        type:   "int",
        min:    1,
        max:    255
    }
};

// 2) Und hier das Mapping: Original‑Key → Alias‑Name + welche Meta‑Properties mitkommen
const FIELD_MAP = {
    foc_encoder_inverted:   { alias: "encInv",      meta: ["type","suffix"] },
    foc_encoder_offset:     { alias: "encOffset",   meta: ["type","scale","min","max","decimals","suffix"] },
    foc_encoder_ratio:      { alias: "encRatio",    meta: ["type","scale","min","max","decimals","suffix"] },
    foc_sensor_mode:        { alias: "sensorMode",  meta: ["type","enums"] },
    l_battery_cut_end:      { alias: "batCutEnd",   meta: ["type","scale","min","max","decimals","suffix"] },
    l_battery_cut_start:    { alias: "batCutStart", meta: ["type","scale","min","max","decimals","suffix"] },
    si_battery_ah:          { alias: "batAh",       meta: ["type","scale","min","max","decimals","suffix"] },
    si_battery_cells:       { alias: "batCells",    meta: ["type","min","max"] }
};

module.exports = { METADATA, FIELD_MAP };
