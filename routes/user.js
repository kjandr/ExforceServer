const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { logFailedAndMaybeBlock } = require("@log");
const { userDb, logDb} = require("@databases");
const { url, secret_key } = require("@config");

module.exports = () => {
    const router = express.Router();

    // Registrierungs-Route (Neuen Benutzer hinzufuegen)
    router.post("/register", async (req, res) => {
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
    router.post("/login", (req, res) => {
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
                secret_key,
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
    router.post("/request-password-reset", (req, res) => {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "E-Mail erforderlich" });

        userDb.get("SELECT id FROM users WHERE email = ?", [email], (err, user) => {
            if (err || !user) {
                return res.status(404).json({ message: "Benutzer nicht gefunden" });
            }

            const resetToken = jwt.sign({ id: user.id, email }, secret_key, { expiresIn: "15m" });
            const resetLink = url.baseURL + `/user/reset-password?token=${resetToken}`;

            // Hier würdest du eine E-Mail versenden – wir loggen es nur:
            console.log("🔗 Passwort-Reset-Link:", resetLink);

            return res.json({ message: "Reset-Link wurde versendet (simuliert)" });
        });
    });

    // Formular: Neues Passwort eingeben
    router.get("/reset-password", (req, res) => {
        const { token } = req.query;
        if (!token) return res.status(400).send("Token fehlt");

        jwt.verify(token, secret_key, (err, decoded) => {
            if (err) return res.status(403).send("Ungültiger oder abgelaufener Token");

            res.render("reset-password", { token }); // du brauchst ein EJS-Template
        });
    });

    // Reset Passwort
    router.post("/reset-password", async (req, res) => {
        const { token, password, confirm } = req.body;

        if (!token || !password || password !== confirm) {
            return res.status(400).send("Ungueltige Eingaben");
        }

        jwt.verify(token, secret_key, async (err, decoded) => {
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


    return router;
};