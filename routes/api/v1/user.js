const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { logFailedAndMaybeBlock } = require("@log");
const { userDb, logDb } = require("@databases");
const { url, secret_key } = require("@config");
const { buildInsertQuery, buildUpdateQuery } = require("@databases/sqlBuilder");
const userFields = require("@databases/userFields");

module.exports = () => {
    const router = express.Router();

    // ✅ Registrierung
    router.post("/register", async (req, res) => {
        const { password, ...data } = req.body;

        if (!data.email || !password) {
            return res.status(400).json({ message: "E-Mail und Passwort erforderlich" });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const values = [hashedPassword, ...userFields.map(f => data[f] ?? null)];
            const { sql } = buildInsertQuery("user", ["password", ...userFields]);

            userDb.run(sql, values, function (err) {
                if (err) {
                    console.error("❌ Register Fehler:", err.message);
                    return res.status(400).json({ message: "Benutzer existiert bereits" });
                }
                res.json({ message: "Benutzer erfolgreich registriert!" });
            });
        } catch (err) {
            res.status(500).json({ message: "Fehler beim Hashing" });
        }
    });

    // ✅ Login
    router.post("/login", (req, res) => {
        const { email, password, cpu_id } = req.body;
        const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

        if (!email || !password || !cpu_id) {
            return res.status(400).json({ message: "E-Mail, Passwort & CPU-ID erforderlich" });
        }

        userDb.get("SELECT * FROM user WHERE email = ?", [email], async (err, user) => {
            if (err || !user) {
                logFailedAndMaybeBlock(null, email, cpu_id, ip, res);
                return;
            }

            const isMatch = await bcrypt.compare(password, user.password);
            const isCpuMatch = user.cpu_id === cpu_id;
            const isActive = user.active === 1;

            if (!isMatch || !isCpuMatch || !isActive) {
                logFailedAndMaybeBlock(user.id, email, cpu_id, ip, res);
                return;
            }

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, cpu_id: user.cpu_id },
                secret_key,
                { expiresIn: "1h" }
            );

            logDb.run(
                "INSERT INTO login_logs (user_id, email, cpu_id, ip, success) VALUES (?, ?, ?, ?, 1)",
                [user.id, email, cpu_id, ip]
            );

            res.json({ token });
        });
    });

    // ✅ Passwort Reset anfordern
    router.post("/request-password-reset", (req, res) => {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "E-Mail erforderlich" });

        userDb.get("SELECT id FROM user WHERE email = ?", [email], (err, user) => {
            if (err || !user) {
                return res.status(404).json({ message: "Benutzer nicht gefunden" });
            }

            const resetToken = jwt.sign({ id: user.id, email }, secret_key, { expiresIn: "15m" });
            const resetLink = `${url.baseURL}/api/v1/user/reset-password?token=${resetToken}`;

            // Hier würdest du eine E-Mail senden. Nur Konsole für jetzt:
            console.log("🔗 Passwort-Reset-Link:", resetLink);

            res.json({ message: "Reset-Link wurde (simuliert) versendet" });
        });
    });

    // ✅ GET /reset-password?token=...
    router.get("/reset-password", (req, res) => {
        const { token } = req.query;
        if (!token) return res.status(400).send("Token fehlt");

        jwt.verify(token, secret_key, (err, decoded) => {
            if (err) return res.status(403).send("Ungültiger oder abgelaufener Token");
            res.render("api/v1/user/reset-password", { token }); // EJS-View nötig
        });
    });

    // ✅ POST /reset-password
    router.post("/reset-password", async (req, res) => {
        const { token, password, confirm } = req.body;

        if (!token || !password || password !== confirm) {
            return res.status(400).send("Ungültige Eingaben");
        }

        jwt.verify(token, secret_key, async (err, decoded) => {
            if (err) return res.status(403).send("Ungültiger oder abgelaufener Token");

            const hashed = await bcrypt.hash(password, 10);
            const { sql } = buildUpdateQuery("user", ["password"]);
            userDb.run(sql, [hashed, decoded.id], (err) => {
                if (err) return res.status(500).send("Fehler beim Speichern");
                res.send("✅ Passwort erfolgreich geändert");
            });
        });
    });

    return router;
};
