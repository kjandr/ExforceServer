/**
 * Prüft und fügt Spalten in einer oder mehreren Tabellen hinzu.
 * @param {Array} migrations - Liste von Migrationsobjekten
 * @returns {Promise<void>}
 */

async function ensureColumnsExist(migrations) {
    const runMigrations = migrations.map(({ db, table, columns }) => {
        return new Promise((resolve, reject) => {
            db.all(`PRAGMA table_info(${table});`, (err, rows) => {
                if (err) return reject(`Fehler beim Lesen von ${table}: ${err.message}`);

                const existingCols = rows.map(col => col.name);
                const missing = columns.filter(col => !existingCols.includes(col.name));

                if (missing.length === 0) {
                    console.log(`✅ Tabelle '${table}' hat alle Spalten.`);
                    return resolve();
                }

                // Füge alle fehlenden Spalten nacheinander hinzu
                let remaining = missing.length;
                missing.forEach(({ name, definition }) => {
                    const alterSQL = `ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`;
                    console.log(`ℹ️ Füge '${name}' zur Tabelle '${table}' hinzu...`);
                    db.run(alterSQL, err => {
                        if (err) return reject(`❌ Fehler beim Hinzufügen von '${name}' in '${table}': ${err.message}`);
                        console.log(`✅ Spalte '${name}' in '${table}' erfolgreich hinzugefügt.`);
                        if (--remaining === 0) resolve();
                    });
                });
            });
        });
    });

    return Promise.all(runMigrations);
}

module.exports = ensureColumnsExist;
