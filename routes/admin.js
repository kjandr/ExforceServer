const express = require("express");
const { logDb } = require("@databases");

module.exports = () => {
    const router = express.Router();

    router.get("/", (req, res) => {
        res.redirect('/admin/user/list');
    });

    // wird über das WebUI aufegrufen mit der eMail-Adresse
    router.get("/logs", (req, res) => {
        const email = req.query.email;
        if (!email) return res.status(400).send("E-Mail fehlt");

        logDb.all(
            `SELECT * FROM login_logs WHERE email = ? ORDER BY timestamp DESC LIMIT 50`,
        [email],
            (err, rows) => {
                if (err) {
                    console.error("Fehler beim Abrufen der Logs:", err.message);
                    return res.status(500).send("Fehler beim Abrufen der Logs");
                }

                res.render("logs", { email, rows });
            }
        );
    });

    // wird über das WebUI aufegrufen
    router.get("/logs/all", (req, res) => {
        logDb.all(
            `SELECT * FROM login_logs ORDER BY timestamp DESC LIMIT 100`,
            [],
            (err, rows) => {
                if (err) {
                    console.error("Fehler beim Abrufen aller Logs:", err.message);
                    return res.status(500).send("Fehler beim Abrufen der Logs");
                }

                res.render("logs", {
                    email: "Alle Benutzer",
                    rows
                });
            }
        );
    });


    return router;
};
