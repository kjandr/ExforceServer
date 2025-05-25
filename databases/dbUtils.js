const { DataTypes } = require('sequelize');

// ───────────────────────────────
// SQLite Promise-Wrappers
// ───────────────────────────────
const runAsync = (db, sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

const getAsync = (db, sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const allAsync = (db, sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const execAsync = (db, sql) => {
    return new Promise((resolve, reject) => {
        db.exec(sql, err => {
            if (err) reject(err);
            else resolve(true);
        });
    });
};

// ───────────────────────────────
// Schema/Meta Helpers
// ───────────────────────────────
const getColumnNames = async (db, tableName) => {
    const rows = await allAsync(db, `PRAGMA table_info(${tableName})`);
    return rows.map(row => row.name);
};

const getTables = async (db) => {
    const rows = await allAsync(db, `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`);
    return rows.map(row => row.name);
};

const getTableSchema = async (db, tableName) => {
    const row = await getAsync(db, `SELECT sql FROM sqlite_master WHERE type='table' AND name = ?`, [tableName]);
    return row?.sql || null;
};

const tableHasColumn = async (db, table, columnName) => {
    const columns = await getColumnNames(db, table);
    return columns.includes(columnName);
};

const addColumnIfMissing = async (db, table, column, definition) => {
    const hasColumn = await tableHasColumn(db, table, column);
    if (!hasColumn) {
        const sql = `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`;
        await runAsync(db, sql);
        console.log(`✅ Spalte '${column}' zur Tabelle '${table}' hinzugefügt.`);
    }
};

const ensureColumnsExist = async (migrations) => {
    for (const { db, table, columns } of migrations) {
        const existing = await getColumnNames(db, table);
        const missing = columns.filter(col => !existing.includes(col.name));
        for (const { name, definition } of missing) {
            await addColumnIfMissing(db, table, name, definition);
        }
    }
};

// ───────────────────────────────
// Query Builder / SQL Generator
// ───────────────────────────────
const buildInsertQuery = (table, fields) => ({
    sql: `INSERT INTO ${table} (${fields.join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`
});

const buildInsertQueryWithPlaceholders = buildInsertQuery;

const buildUpdateQuery = (table, fields, idField = "id") => ({
    sql: `UPDATE ${table} SET ${fields.map(f => `${f} = ?`).join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE ${idField} = ?`
});

const buildUpdateQueryByUuid = (table, fields) => buildUpdateQuery(table, fields, "uuid");

const buildDeleteByUuidQuery = (table) => ({
    sql: `DELETE FROM ${table} WHERE uuid = ?`
});

const buildSelectByField = (table, field) => ({
    sql: `SELECT * FROM ${table} WHERE ${field} = ?`
});

// ───────────────────────────────
// Logic / CRUD-Helper
// ───────────────────────────────
const upsertByUuid = async (db, table, uuid, data) => {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const existing = await getAsync(db, `SELECT 1 FROM ${table} WHERE uuid = ?`, [uuid]);

    if (existing) {
        const update = buildUpdateQueryByUuid(table, columns);
        await runAsync(db, update.sql, [...values, uuid]);
        return "updated";
    } else {
        const insert = buildInsertQuery(table, columns);
        await runAsync(db, insert.sql, values);
        return "inserted";
    }
};

const insertIfNotExists = async (db, table, uniqueField, value, data) => {
    const row = await getAsync(db, `SELECT 1 FROM ${table} WHERE ${uniqueField} = ?`, [value]);
    if (!row) {
        const insert = buildInsertQuery(table, Object.keys(data));
        await runAsync(db, insert.sql, Object.values(data));
        return "inserted";
    }
    return "exists";
};

const countRows = async (db, table) => {
    const row = await getAsync(db, `SELECT COUNT(*) as count FROM ${table}`);
    return row?.count || 0;
};

const createTableIfNotExists = (db, schema) => {
    return new Promise((resolve, reject) => {
        db.run(schema, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

/**
 * Generiert ein Sequelize-Modell auf Basis einer bestehenden SQLite-Tabelle
 * @param {Sequelize} sequelize - Sequelize-Instanz
 * @param {sqlite3.Database} db - SQLite DB-Verbindung
 * @param {string} tableName - Tabellenname
 * @returns {Promise<Model|null>}
 */
const generateModelFromDb = async (sequelize, db, tableName) => {
    console.log(`🔧 Generiere Modell für '${tableName}'...`);

    try {
        const columns = await allAsync(db, `PRAGMA table_info(${tableName})`);
        if (!columns.length) {
            console.warn(`⚠️ Keine Spalten in Tabelle '${tableName}' gefunden.`);
            return null;
        }

        const modelAttributes = {};

        for (const col of columns) {
            const { name, type, pk, notnull, dflt_value } = col;

            let dataType;
            const typeUpper = type.toUpperCase();
            if (typeUpper.includes('INT')) dataType = DataTypes.INTEGER;
            else if (typeUpper.includes('CHAR') || typeUpper.includes('TEXT')) dataType = DataTypes.STRING;
            else if (typeUpper.includes('REAL') || typeUpper.includes('FLOA') || typeUpper.includes('DOUB')) dataType = DataTypes.FLOAT;
            else if (typeUpper.includes('BOOL')) dataType = DataTypes.BOOLEAN;
            else if (typeUpper.includes('DATE') || typeUpper.includes('TIME')) dataType = DataTypes.DATE;
            else dataType = DataTypes.STRING;

            modelAttributes[name] = {
                type: dataType,
                primaryKey: pk === 1,
                allowNull: notnull === 0,
                defaultValue: dflt_value
            };

            if (pk === 1 && typeUpper.includes('INT')) {
                modelAttributes[name].autoIncrement = true;
            }
        }

        const model = sequelize.define(tableName, modelAttributes, {
            tableName,
            timestamps: false
        });

        console.log(`✅ Modell '${tableName}' erfolgreich generiert.`);
        return model;
    } catch (err) {
        console.error(`❌ Fehler beim Generieren des Modells für '${tableName}':`, err.message);
        return null;
    }
};

const updateIfChanged = async (db, table, uuid, data) => {
    const existing = await getAsync(db, `SELECT * FROM ${table} WHERE uuid = ?`, [uuid]);
    if (!existing) return await upsertByUuid(db, table, uuid, data);

    const changed = Object.entries(data).some(([k, v]) => existing[k] !== v);
    if (!changed) return "unchanged";

    return await upsertByUuid(db, table, uuid, data);
};

// ───────────────────────────────
// Export
// ───────────────────────────────
module.exports = {
    // SQLite Promise-Wrappers
    runAsync,
    getAsync,
    allAsync,
    execAsync,

    // Schema Helpers
    getColumnNames,
    getTables,
    getTableSchema,
    tableHasColumn,
    addColumnIfMissing,
    ensureColumnsExist,

    // Query Builder
    buildInsertQuery,
    buildInsertQueryWithPlaceholders,
    buildUpdateQuery,
    buildUpdateQueryByUuid,
    buildDeleteByUuidQuery,
    buildSelectByField,

    // Logic Utilities
    upsertByUuid,
    insertIfNotExists,
    countRows,

    createTableIfNotExists,
    generateModelFromDb,
    updateIfChanged
};
