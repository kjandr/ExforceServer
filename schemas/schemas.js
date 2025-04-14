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
        cpu_id TEXT NOT NULL
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
        schema: `
      CREATE TABLE IF NOT EXISTS controller (
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
        operating_time INTEGER NOT NULL DEFAULT 0
      )`
    },
    engine: {
        db: "engineDb",
        name: "Engine",
        schema: `
      CREATE TABLE IF NOT EXISTS engine (
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
        operating_time INTEGER NOT NULL DEFAULT 0
      )`
    }
};
