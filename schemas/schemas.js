const { METADATA_EBIKE } = require("@conf_data/confEbikeFields");
const { METADATA_MC } = require("@conf_data/confMcFields");

module.exports = {
    user: {
        db: "userDb",
        name: "User",
        schema: `
      CREATE TABLE IF NOT EXISTS user (
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
        cpu_id TEXT NOT NULL,
        mobile TEXT
      )`
    },
    login_logs: {
        db: "logDb",
        name: "Login-Log",
        schema: `
      CREATE TABLE IF NOT EXISTS login_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        email TEXT,
        cpu_id TEXT,
        ip TEXT,
        success BOOLEAN,
        timestamp INTEGER DEFAULT (strftime('%s','now'))
      )`
    },
    controller: {
        db: "controllerDb",
        name: "Controller",
        schema: `CREATE TABLE IF NOT EXISTS controller (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    engine_id INTEGER,
                    active BOOLEAN DEFAULT 0)`,
        extendedColumns: METADATA_EBIKE
    },
    engine: {
        db: "engineDb",
        name: "Engine",
        schema: `CREATE TABLE IF NOT EXISTS engine (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    serial_no TEXT NOT NULL,
                    controller_id INTEGER,
                    active BOOLEAN DEFAULT 0,
                    mileage_km INTEGER NOT NULL DEFAULT 0)`,
        extendedColumns: METADATA_MC
    }
};
