const { engineDb } = require("@databases");

function ensureEngineTableHasOperatingTime() {
    return new Promise((resolve, reject) => {
        engineDb.all("PRAGMA table_info(engine);", (err, columns) => {
            if (err) return reject(err);

            const columnNames = columns.map(col => col.name);
            if (!columnNames.includes("operating_time")) {
                console.log("ℹ️ Spalte 'operating_time' fehlt – wird hinzugefügt...");
                engineDb.run("ALTER TABLE engine ADD COLUMN operating_time INTEGER DEFAULT 0;", (alterErr) => {
                    if (alterErr) return reject(alterErr);
                    console.log("✅ Spalte 'operating_time' erfolgreich hinzugefügt.");
                    resolve();
                });
            } else {
                console.log("✅ Spalte 'operating_time' existiert bereits.");
                resolve();
            }
        });
    });
}

module.exports = ensureEngineTableHasOperatingTime;
