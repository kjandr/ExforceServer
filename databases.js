const sqlite3 = require("sqlite3").verbose();
const { databasePaths } = require("@config");

// Promise-basierte Initialisierung für eine einzelne Datenbank
const initializeTable = (db, tableSchema, dbName) => {
    return new Promise((resolve, reject) => {
        db.run(tableSchema, (err) => {
            if (err) {
                console.error(`Fehler beim Anlegen der Tabelle in ${dbName}:`, err.message);
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

// Datenbank-Verbindungen herstellen - normal wie bisher
const userDb = new sqlite3.Database(databasePaths.user, (err) => {
    if (err) {
        console.error(`Fehler beim Öffnen der User-Datenbank:`, err.message);
    } else {
        console.log(`Verbunden mit der User-Datenbank.`);
    }
});

const logDb = new sqlite3.Database(databasePaths.log, (err) => {
    if (err) {
        console.error(`Fehler beim Öffnen der Login-Log-Datenbank:`, err.message);
    } else {
        console.log(`Verbunden mit der Login-Log-Datenbank.`);
    }
});

const controllerDb = new sqlite3.Database(databasePaths.controller, (err) => {
    if (err) {
        console.error(`Fehler beim Öffnen der Controller-Datenbank:`, err.message);
    } else {
        console.log(`Verbunden mit der Controller-Datenbank.`);
    }
});

const engineDb = new sqlite3.Database(databasePaths.engine, (err) => {
    if (err) {
        console.error(`Fehler beim Öffnen der Engine-Datenbank:`, err.message);
    } else {
        console.log(`Verbunden mit der Engine-Datenbank.`);
    }
});

// Datenbankschemas - unverändert
const userSchema = `CREATE TABLE IF NOT EXISTS user (
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
    uuid TEXT NOT NULL UNIQUE,
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

// Funktion zum Initialisieren aller Tabellen
async function initializeTables() {
    try {
        await initializeTable(userDb, userSchema, "User");
        await initializeTable(logDb, logSchema, "Login-Log");
        await initializeTable(controllerDb, controllerSchema, "Controller");
        await initializeTable(engineDb, engineSchema, "Engine");
        console.log("Alle Tabellen erfolgreich initialisiert.");
    } catch (error) {
        console.error("Fehler bei der Tabelleninitialisierung:", error);
    }
}

// Exportiere sowohl die Datenbank-Instanzen als auch die Initialisierungsfunktion
module.exports = {
    userDb,
    logDb,
    controllerDb,
    engineDb,
    initializeTables  // Neue Funktion zum expliziten Initialisieren der Tabellen
};
