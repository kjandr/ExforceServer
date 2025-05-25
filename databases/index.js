const sqlite3 = require("sqlite3").verbose();
const { databasePaths } = require("@config");
const schemaDefs = require("@schemas/schemas");
const { addConfFieldsToDb, getAllColumnsForTable } = require("@databases/extendedColumns");
const { createTableIfNotExists } = require("@databases/dbUtils");

const connections = {
    userDb: new sqlite3.Database(databasePaths.user),
    logDb: new sqlite3.Database(databasePaths.log),
    controllerDb: new sqlite3.Database(databasePaths.controller),
    engineDb: new sqlite3.Database(databasePaths.engine),
};

Object.entries(connections).forEach(([key, db]) => {
    db.on("open", () => console.log(`✅ Verbunden mit ${key}`));
    db.on("error", (err) => console.error(`❌ Fehler bei ${key}:`, err.message));
});

async function initializeTables() {
    for (const [tableName, { db, schema, name, extendedColumns }] of Object.entries(schemaDefs)) {
        const database = connections[db];
        if (!database) {
            console.warn(`⚠️ Kein DB-Handle gefunden für: ${db}`);
            continue;
        }

        try {
            await createTableIfNotExists(database, schema);
            console.log(`🗃️ Tabelle '${tableName}' (${name}) erfolgreich initialisiert.`);
        } catch (err) {
            console.error(`❌ Fehler bei ${name}:`, err.message);
            continue;
        }

        // ➕ Nur bei controller/engine Zusatzspalten und Preset prüfen
        if (["controllerDb", "engineDb"].includes(db)) {
            await addConfFieldsToDb(database, tableName, extendedColumns);

            const presets = [
                getAllColumnsForTable(tableName, extendedColumns, "EX8_560"),
                getAllColumnsForTable(tableName, extendedColumns, "G510.1000"),
            ];
            presets.forEach((preset, i) => {
                console.log(`Preset ${i + 1} für ${tableName}:`, preset);
            });
        }
    }
}

module.exports = {
    ...connections,
    initializeTables
};
