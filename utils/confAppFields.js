// 1) Definiere hier in einem Objekt alle statischen Metadaten je Feld:
const METADATA_APP = {
    controller_id:          { type: "int", suffix: "id", min: 0, max: 255 }
};

// 2) Und hier das Mapping: Original‑Key → Alias‑Name + welche Meta‑Properties mitkommen
const FIELD_MAP_APP = {
    controller_id:          { alias: "ContrId",     meta: ["type","min","max","suffix"] }
};

module.exports = { METADATA_APP, FIELD_MAP_APP };
