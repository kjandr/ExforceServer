const fs = require("fs");
const path = require("path");

function loadDevices() {
    const filePath = path.join("devices.json");
    try {
        const raw = fs.readFileSync(filePath, "utf8");
        return JSON.parse(raw);
    } catch (err) {
        console.error("❌ Fehler beim Laden von devices.json:", err.message);
        return {
            controllers: [],
            engines: [],
            battery: { cells: {} }
        };
    }
}

module.exports = loadDevices;
