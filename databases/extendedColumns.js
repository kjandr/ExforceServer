const fs = require('fs');
const path = require('path');
const { getColumnNames, addColumnIfMissing } = require("@databases/dbUtils");


// Gemeinsame Spalten für alle Geräte-Tabellen
const standardDeviceColumns = [
    { name: "created_at", type: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
    { name: "updated_at", type: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
];

const standardControllerColumns = [
    { name: "active", type: "BOOLEAN DEFAULT 0" },
    { name: "user_id", type: "INTEGER NOT NULL DEFAULT -1" },
    { name: "remark", type: "TEXT" },
    { name: "type", type: "TEXT NOT NULL" },
    { name: "uuid", type: "TEXT" },
    { name: "version", type: "TEXT" },
    { name: "engine_id", type: "INTEGER" },
    { name: "operating_time", type: "INTEGER NOT NULL DEFAULT 0" }
];

const standardEngineColumns = [
    { name: "active", type: "BOOLEAN DEFAULT 0" },
    { name: "user_id", type: "INTEGER NOT NULL DEFAULT -1" },
    { name: "remark", type: "TEXT" },
    { name: "type", type: "TEXT NOT NULL" },
    { name: "uuid", type: "TEXT" },
    { name: "controller_id", type: "INTEGER" },
    { name: "serial_no", type: "TEXT NOT NULL" },
    { name: "mileage_km", type: "INTEGER NOT NULL DEFAULT 0" }
];

async function addSpecificColumns(db, tableName, existingColumns = []) {
    if (tableName === "controller") {
        for (const column of standardControllerColumns) {
            if (!existingColumns.includes(column.name)) {
                await addColumnIfMissing(db, tableName, column.name, column.type);
                console.log(`Controller-Spalte hinzugefügt: ${column.name} (${column.type})`);
            }
        }
    } else if (tableName === "engine") {
        for (const column of standardEngineColumns) {
            if (!existingColumns.includes(column.name)) {
                await addColumnIfMissing(db, tableName, column.name, column.type);
                console.log(`Engine-Spalte hinzugefügt: ${column.name} (${column.type})`);
            }
        }
    }
}

function mapJsonTypeToSql(type) {
    switch (type) {
        case "float":
        case "double": return "FLOAT";
        case "int":
        case "integer": return "INTEGER";
        case "bool":
        case "boolean": return "BOOLEAN";
        case "text":
        case "string": return "TEXT";
        case "enum": return "TEXT";
        case "array": return "TEXT";
        default: return "TEXT";
    }
}

// Generische Datenbankinitialisierungsfunktion
async function addConfFieldsToDb(db, tableName, extendedColumns) {
    try {
        // Prüfe zuerst, ob die Standardspalten existieren
        const existing = await getColumnNames(db, tableName);

        // Füge Standardspalten hinzu, wenn sie fehlen
        for (const column of standardDeviceColumns) {
            if (!existing.includes(column.name)) {
                await addColumnIfMissing(db, tableName, column.name, column.type);
                console.log(`Standardspalte hinzugefügt: ${column.name} (${column.type})`);
            }
        }

        // Füge die datenbankspezifischen Spalten hinzu
        await addSpecificColumns(db, tableName, existing);

        // Objekt "extendedColumns" auslesen
        if (extendedColumns) {
            // Über alle Schlüssel iterieren
            for (const key in extendedColumns) {
                if (!existing.includes(key)) {
                    const columnType = extendedColumns[key]?.type || "text";
                    const colType = mapJsonTypeToSql(columnType);
                    await addColumnIfMissing(db, tableName, key, colType);
                    console.log(`Spalte hinzugefügt: ${key} (${colType})`);
                }
            }
        } else {
            console.log(`${extendedColumns} "enthält kein 'ExtendedColumns'-Objekt.`);
        }
    } catch (err) {
        console.error("Fehler beim Initialisieren aus ExtendedColumns:", err.message);
    }
}

function getAllColumnsForTable(tableName, extendedColumns, type = null) {
    const result = {};

    // Bestimmen, welche Spalten-Definition verwendet werden soll
    let columnsToUse = [];

    if (tableName === "controller") {
        columnsToUse = standardControllerColumns;
    } else if (tableName === "engine") {
        columnsToUse = standardEngineColumns;
    } else {
        // Wenn keine passende Tabelle gefunden wurde, leeres Objekt zurückgeben
        return result;
    }

    // Presets aus devices.json laden (wenn ein Typ angegeben wurde)
    let presetValues = {};
    if (type) {
        try {
            // Pfad zur devices.json-Datei (relativ zum Projektroot)
            const devicesPath = path.join(__dirname, '..', 'devices.json');

            // Datei einlesen und parsen
            const devicesJson = JSON.parse(fs.readFileSync(devicesPath, 'utf8'));

            // Gerät mit dem angegebenen Typ finden
            const device = devicesJson[tableName]?.find(device => device.type === type);

            // Wenn ein passendes Gerät gefunden wurde, die preset-Werte speichern
            if (device && device.preset) {
                presetValues = device.preset;
            }
        } catch (err) {
            console.error(`Fehler beim Laden der Preset-Werte aus devices.json für Typ ${type}:`, err.message);
        }
    }

    // Standardwerte aus den definierten Spalten extrahieren
    for (const column of columnsToUse) {
        if (presetValues.hasOwnProperty(column.name)) {
            result[column.name] = presetValues[column.name];
        }
    }

    // Erweiterte Spalten hinzufügen, wenn vorhanden
    if (extendedColumns) {
        for (const key in extendedColumns) {
            // 1. Wenn ein Preset-Wert für diesen Schlüssel existiert, diesen verwenden
            if (type && presetValues[key] !== undefined) {
                result[key] = presetValues[key];
            }
        }
    }
    return result;
}

module.exports = {
    addConfFieldsToDb,
    getAllColumnsForTable
};
