const sqlite3 = require("sqlite3").verbose();
const { databasePaths } = require("@config");

const initializeDatabase = (dbFile, tableSchema, dbName) => {
    const db = new sqlite3.Database(dbFile, (err) => {
        if (err) {
            console.error(`Fehler beim Oeffnen der ${dbName}-Datenbank:`, err.message);
        } else {
            console.log(`Verbunden mit der ${dbName}-Datenbank.`);
            db.run(tableSchema, (err) => {
                if (err) console.error(`Fehler beim Anlegen der Tabelle in ${dbName}:`, err.message);
            });
        }
    });
    return db;
};


// Datenbankschemas
const userSchema = `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    password TEXT NOT NULL,
    salutation TEXT DEFAULT 'Herr',
    last_name TEXT DEFAULT 'Nachname',
    first_name TEXT DEFAULT 'Vorname',
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT 0,
    cpu_id TEXT NOT NULL
)`;

const logSchema = `CREATE TABLE IF NOT EXISTS login_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    email TEXT,
    cpu_id TEXT,
    ip TEXT,
    success BOOLEAN,
    timestamp INTEGER DEFAULT (strftime('%s','now'))
)`;

const controllerSchema = `CREATE TABLE IF NOT EXISTS controller (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    serial_no TEXT NOT NULL,
    remark TEXT,
    user_id INTEGER,
    type TEXT NOT NULL,
    uuid TEXT NOT NULL,
    battery_cutoff_end FLOAT NOT NULL,
    battery_cutoff_start FLOAT NOT NULL,
    battery_cells INTEGER NOT NULL,
    battery_ah INTEGER NOT NULL,
    battery_current_max FLOAT NOT NULL,
    battery_current_min FLOAT NOT NULL,
    operating_time_min INTEGER NOT NULL DEFAULT 0
)`;

const engineSchema = `CREATE TABLE IF NOT EXISTS engine (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    serial_no TEXT NOT NULL,
    remark TEXT,
    controller_id INTEGER,
    type TEXT NOT NULL,
    current_ki FLOAT NOT NULL,
    current_kp FLOAT NOT NULL,
    freq_foc_khz FLOAT NOT NULL,
    flux_linkage_mwb FLOAT NOT NULL,
    inductance_uh FLOAT NOT NULL,
    resistance_mr FLOAT NOT NULL,
    observer_gain FLOAT NOT NULL,
    current_max FLOAT NOT NULL DEFAULT 5.0,
    erpm_max INTEGER NOT NULL,
    wattage_max INTEGER NOT NULL DEFAULT 50,
    temp_type TEXT NOT NULL,
    temp_cutoff_end FLOAT NOT NULL,
    temp_cutoff_start FLOAT NOT NULL,
    mileage_km INTEGER NOT NULL DEFAULT 0,
    operating_time_min INTEGER NOT NULL DEFAULT 0
)`;


// Initialisiere Datenbanken mit Pfaden aus der Config
const userDb = initializeDatabase(databasePaths.user, userSchema, "User");
const logDb = initializeDatabase(databasePaths.log, logSchema, "Login-Log");
const controllerDb = initializeDatabase(databasePaths.controller, controllerSchema, "Controller");
const engineDb = initializeDatabase(databasePaths.engine, engineSchema, "Engine");


// Exportiere die Datenbank-Instanzen
module.exports = {
    userDb,
    logDb,
    controllerDb,
    engineDb
};
