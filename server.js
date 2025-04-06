// npm init -y
// npm install express sqlite3 jsonwebtoken body-parser bcrypt
// npm install -g nodemon

//VS Code Extensions
// Thunder Client
// SQLite

// nodemon server.js

const express = require("express");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const HTTP_PORT = 8000;
const SECRET_KEY = "mein-geheimer-schluessel";
const USER_DB_FILE = process.env.USER_DATABASE_PATH || "./data/users.db";
const LOG_DB_FILE = process.env.LOG_DATABASE_PATH || "./data/login_logs.db";
const CONTROLLER_DB_FILE = process.env.CONTROLLER_DATABASE_PATH || "./data/controller.db";
const ENGINE_DB_FILE = process.env.ENGINE_DATABASE_PATH || "./data/engine.db";

const app = express();
app.set('trust proxy', true);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", "./views");

// Verbindung zur SQLite-Datenbank
const userDb = new sqlite3.Database(USER_DB_FILE, (err) => {
    if (err) {
        console.error("Fehler beim Oeffnen der User-Datenbank:", err.message);
    } else {
        console.log("Verbunden mit der User-Datenbank.");
        userDb.run(`CREATE TABLE IF NOT EXISTS users (
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
        )`);
    }
});

const logDb = new sqlite3.Database(LOG_DB_FILE, (err) => {
    if (err) {
        console.error("Fehler beim Oeffnen der Login-Log-Datenbank:", err.message);
    } else {
        console.log("Verbunden mit der Login-Log-Datenbank.");
        logDb.run(`CREATE TABLE IF NOT EXISTS login_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            email TEXT,
            cpu_id TEXT,
            ip TEXT,
            success BOOLEAN,
            timestamp INTEGER DEFAULT (strftime('%s','now'))
        )`);
    }
});

const controllerDb = new sqlite3.Database(CONTROLLER_DB_FILE, (err) => {
    if (err) {
        console.error("Fehler beim Oeffnen der Controller-Datenbank:", err.message);
    } else {
        console.log("Verbunden mit der Controller-Datenbank.");
        controllerDb.run(`CREATE TABLE IF NOT EXISTS controller (
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
        )`);
    }
});

const engineDb = new sqlite3.Database(ENGINE_DB_FILE, (err) => {
    if (err) {
        console.error("Fehler beim Oeffnen der Engine-Datenbank:", err.message);
    } else {
        console.log("Verbunden mit der Engine-Datenbank.");
        engineDb.run(`CREATE TABLE IF NOT EXISTS engine (
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
        )`);
    }
});

//-------------------------------------------------------------------------



const adminRoutes = require("./routes/admin")(userDb, logDb);
app.use("/admin", adminRoutes);
const userRoutes = require("./routes/user")(logDb, userDb);
app.use("/admin/user", userRoutes);
const controllerRoutes = require("./routes/controller")(logDb, controllerDb);
app.use("/admin/controller", controllerRoutes);


// Registrierungs-Route (Neuen Benutzer hinzufuegen)
app.post("/api/register", async (req, res) => {
    const { password, email, cpu_id } = req.body;
    const salutation = req.body.salutation || 'Herr';
    const last_name = req.body.last_name || 'Nachname';
    const first_name = req.body.first_name || 'Vorname';
    const role = req.body.role || 'user';
    const active = req.body.active ?? 0;

    if (!email || !password) {
        return res.status(400).json({ message: "EMail und Passwort erforderlich" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    userDb.run("INSERT INTO users (password, salutation, last_name, first_name, email, role, active, cpu_id) VALUES (?, COALESCE(?, 'Herr'), COALESCE(?, 'Nachname'), COALESCE(?, 'Vorname'), ?, COALESCE(?, 'user'), COALESCE(?, 0), ?)",
    [hashedPassword, salutation, last_name, first_name, email, role, active, cpu_id],
    function(err) {
        if (err) {
            return res.status(400).json({ message: "Benutzername existiert bereits" });
        }
        res.json({ message: "Benutzer erfolgreich registriert!" });
    });
});

// Login-Route (gibt JWT zurueck)
app.post("/api/login", (req, res) => {
    const { email, password, cpu_id } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (!email || !password || !cpu_id) {
        return res.status(400).json({ message: "E-Mail, Passwort und CPU-ID erforderlich" });
    }

    // Schritt 1: Nutzer anhand E-Mail holen (egal ob aktiv oder nicht)
    userDb.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (err || !user) {
            // User nicht vorhanden → loggen & prüfen
            logFailedAndMaybeBlock(null, email, cpu_id, ip, res);
            return;
        }

        const isMatch = await bcrypt.compare(password, user.password);
        const isCpuMatch = user.cpu_id === cpu_id;
        const isActive = user.active === 1;

        if (!isMatch || !isCpuMatch || !isActive) {
            // Falsche Daten oder inaktiver Nutzer
            logFailedAndMaybeBlock(user.id, email, cpu_id, ip, res);
            return;
        }

        // ✅ Erfolgreicher Login
        const token = jwt.sign(
            { id: user.id, cpu_id: user.cpu_id, email: user.email, role: user.role },
            SECRET_KEY,
            { expiresIn: "1h" }
        );

        // Log Erfolg
        logDb.run(
            "INSERT INTO login_logs (user_id, email, cpu_id, ip, success) VALUES (?, ?, ?, ?, 1)",
            [user.id, email, cpu_id, ip]
        );

        res.json({ token });
    });
});

// Passwort Reset anfordern
app.post("/api/request-password-reset", (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "E-Mail erforderlich" });

    userDb.get("SELECT id FROM users WHERE email = ?", [email], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ message: "Benutzer nicht gefunden" });
        }

        const resetToken = jwt.sign({ id: user.id, email }, SECRET_KEY, { expiresIn: "15m" });
        const resetLink = `http://192.168.1.110/api/reset-password?token=${resetToken}`;

        // Hier würdest du eine E-Mail versenden – wir loggen es nur:
        console.log("🔗 Passwort-Reset-Link:", resetLink);

        return res.json({ message: "Reset-Link wurde versendet (simuliert)" });
    });
});

// Formular: Neues Passwort eingeben
app.get("/api/reset-password", (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send("Token fehlt");

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).send("Ungültiger oder abgelaufener Token");

        res.render("reset-password", { token }); // du brauchst ein EJS-Template
    });
});

// Reset Passwort
app.post("/api/reset-password", async (req, res) => {
    const { token, password, confirm } = req.body;

    if (!token || !password || password !== confirm) {
        return res.status(400).send("Ungueltige Eingaben");
    }

    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
        if (err) return res.status(403).send("Ungueltiger oder abgelaufener Token");

        const hashed = await bcrypt.hash(password, 10);
        userDb.run("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [hashed, decoded.id], (err) => {
            if (err) {
                return res.status(500).send("Fehler beim Speichern");
            }
            res.send("✅ Passwort erfolgreich geaendert");
        });
    });
});


//-------------------------------------------------------------------------

function logFailedAndMaybeBlock(userId, email, cpu_id, ip, res) {
    logDb.serialize(() => {
        logDb.run(
            "INSERT INTO login_logs (user_id, email, cpu_id, ip, success) VALUES (?, ?, ?, ?, 0)",
            [userId, email, cpu_id, ip],
            (insertErr) => {
                if (insertErr) {
                    console.error("Fehler beim Schreiben in Logs:", insertErr.message);
                    return res.status(500).json({ message: "Fehler beim Loggen" });
                }

                const timeWindow = new Date(Date.now() - 15 * 60 * 1000).toISOString();
                logDb.get(
                    `SELECT COUNT(*) AS failCount FROM login_logs 
                    WHERE email = ? AND success = 0 AND timestamp >= strftime('%s','now','-15 minutes')`,
                    [email],
                    (countErr, row) => {
                        if (countErr) {
                            console.error("Fehler beim Zaehlen der Fehlschlaege:", countErr.message);
                            return res.status(500).json({ message: "Fehler beim Zaehlen" });
                        }

                        console.log(`[DEBUG] Fehlversuche für ${email}: ${row?.failCount}`);

                        if (row?.failCount >= 5) {
                            console.log(`[DEBUG] Triggering Deaktivierung für ${email}…`);
                            db.run("UPDATE users SET active = 0 WHERE email = ?", [email], (updateErr) => {
                                if (updateErr) {
                                    console.error("Fehler beim Deaktivieren:", updateErr.message);
                                    return res.status(500).json({ message: "Fehler beim Deaktivieren des Benutzers" });
                                }

                                console.log(`🚫 Benutzer ${email} wurde nach ${row.failCount} Fehlversuchen deaktiviert.`);
                                return res.status(403).json({
                                    message: "Zu viele Fehlversuche. Dein Benutzerkonto wurde deaktiviert."
                                });
                            });
                        } else {
                            return res.status(401).json({ message: "Ungueltige Anmeldedaten" });
                        }
                    }
                );
            }
        );
    });
}

// Middleware zum ueberpruefen von JWT
const authenticateJWT = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.sendStatus(401);
    }
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};


//-------------------------------------------------------------------------

// Geschuetzte API-Route (nur mit gueltigem Token erreichbar)
app.get("/api/v1/", authenticateJWT, (req, res) => {
    res.json({ message: "Geheime Daten fuer " + req.user.email });
});


//-------------------------------------------------------------------------


// Neue Route: Zeigt alle registrierten Benutzer als HTML-Liste an
app.get("/users", (req, res) => {
    userDb.all("SELECT id, COALESCE(salutation, 'Herr') AS salutation, COALESCE(first_name, 'Vorname') AS first_name, COALESCE(last_name, 'Nachname') AS last_name, email, COALESCE(role, 'user') AS role, COALESCE(active, 0) AS active, COALESCE(cpu_id, 'unbekannt') AS cpu_id FROM users WHERE active = 1", [], (err, rows) => {
        if (err) {
            console.error("Fehler beim Abrufen der Benutzer:", err.message);
            return res.status(500).send("Interner Serverfehler");
        }

        let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Benutzerliste</title>
</head>
<body>
    <h1>Benutzerliste</h1>
    <ul>
`;
        rows.forEach(row => {
            html += `<li>${row.salutation} ${row.first_name} ${row.last_name} - ${row.email} - Rolle: ${row.role} - Aktiv: ${row.active ? "Ja" : "Nein"} - CPU-ID: ${row.cpu_id}
            <form method="POST" action="/users/deactivate" style="display:inline;">
                <input type="hidden" name="id" value="${row.id}">
                <button type="submit">Deaktivieren</button>
            </form>
            <form method="POST" action="/users/delete" style="display:inline;">
                <input type="hidden" name="id" value="${row.id}">
                <button type="submit">Löschen</button>
            </form>
            </li>`;
        });
        html += `
    </ul>
</body>
</html>`;
        res.send(html);
    });
});

// Neue Route: Anzeige aller inaktiven Benutzer als HTML-Seite mit Aktivierungsbutton
app.get("/users/inactive", (req, res) => {
    userDb.all("SELECT id, COALESCE(salutation, 'Herr') AS salutation, COALESCE(first_name, 'Vorname') AS first_name, COALESCE(last_name, 'Nachname') AS last_name, email, COALESCE(role, 'user') AS role, COALESCE(active, 0) AS active, COALESCE(cpu_id, 'unbekannt') AS cpu_id FROM users WHERE active = 0", [], (err, rows) => {
        if (err) {
            console.error("Fehler beim Abrufen der inaktiven Benutzer:", err.message);
            return res.status(500).send("Interner Serverfehler");
        }
        let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Inaktive Benutzerliste</title>
</head>
<body>
    <h1>Inaktive Benutzerliste</h1>
    <ul>
`;
        rows.forEach(row => {
            html += `<li>${row.salutation} ${row.first_name} ${row.last_name} - ${row.email} - Rolle: ${row.role} - CPU-ID: ${row.cpu_id}
            <form method="POST" action="/users/activate" style="display:inline;">
                <input type="hidden" name="id" value="${row.id}">
                <button type="submit">Aktivieren</button>
            </form>
            <form method="POST" action="/users/delete" style="display:inline;">
                <input type="hidden" name="id" value="${row.id}">
                <button type="submit">Löschen</button>
            </form>
            </li>`;
        });
        html += `
    </ul>
</body>
</html>`;
        res.send(html);
    });
});

app.get("/login-logs", (req, res) => {
    logDb.all("SELECT * FROM login_logs ORDER BY timestamp DESC LIMIT 100", [], (err, rows) => {
        if (err) {
            return res.status(500).send("Fehler beim Abrufen der Logs");
        }

        let html = `<h2>Login-Logs</h2><ul>`;
        rows.forEach(log => {
            html += `<li>[${log.timestamp}] IP: ${log.ip} – ${log.email} (${log.cpu_id}) – ${log.success ? "✅ Erfolgreich" : "❌ Fehlgeschlagen"}</li>`;
        });
        html += `</ul>`;
        res.send(html);
    });
});

//-------------------------------------------------------------------------





app.listen(HTTP_PORT, () => {
    console.log(`Server laeuft auf Port ${HTTP_PORT}`);
});
