const sqlite3 = require("sqlite3").verbose();
const { databasePaths } = require("@config");
const schemaDefs = require("@schemas/schemas");

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
    for (const [tableName, { db, schema, name }] of Object.entries(schemaDefs)) {
        const database = connections[db];
        if (!database) {
            console.warn(`⚠️ Kein DB-Handle gefunden für: ${db}`);
            continue;
        }
        await new Promise((resolve, reject) => {
            database.run(schema, (err) => {
                if (err) {
                    console.error(`❌ Fehler bei ${name}:`, err.message);
                    reject(err);
                } else {
                    console.log(`🗃️ Tabelle '${tableName}' (${name}) erfolgreich initialisiert.`);
                    resolve();
                }
            });
        });
    }
}

module.exports = {
    ...connections,
    initializeTables
};
