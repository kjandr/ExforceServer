const express = require("express");
const bcrypt = require("bcrypt");
const { userDb, logDb } = require("@databases");
const userFields = require("@databases/userFields");
const { buildInsertQuery, buildUpdateQuery } = require("@databases/sqlBuilder");

module.exports = () => {
    const router = express.Router();

    router.get('/', (req, res) => {
        res.redirect('/admin/user/list');
    });

    router.get("/ping", (req, res) => {
        res.send("User route works!");
    });


    router.get("/list", (req, res) => {
        // Den Filterwert aus der Query-Parameter extrahieren
        let filter = req.query.filter || ""; // Standard ist leer
        let sql = "SELECT * FROM user WHERE email LIKE ? ORDER BY active DESC, email ASC";
        let params = [`%${filter}%`]; // LIKE-Muster für Filterung

        userDb.all(sql, params, (err, users) => {
            if (err) {
                console.error("Fehler beim Laden der Benutzer:", err.message);
                return res.status(500).send("Fehler beim Abrufen der Benutzer");
            }

            const enrichedUsers = [];
            let remaining = users.length;

            if (remaining === 0) return res.render("admin/user/list", { users: [], filter, title: "Alle Benutzer" });

            users.forEach(user => {
                logDb.get(
                    `SELECT COUNT(*) AS fail_count FROM login_logs 
                    WHERE email = ? AND success = 0 AND timestamp >= strftime('%s','now','-15 minutes')`,
                    [user.email],
                    (logErr, row) => {
                        user.fail_count = logErr ? "-" : (row?.fail_count || 0);
                        enrichedUsers.push(user);
                        remaining--;

                        if (remaining === 0) {
                            res.render("admin/user/list", { users: enrichedUsers, filter, title: "Alle Benutzer" });
                        }
                    }
                );
            });
        });
    });

    router.get("/list-active", (req, res) => {
        // Den Filterwert aus der Query-Parameter extrahieren
        const filter = req.query.filter || ""; // Standard: leer
        const sql = filter
            ? "SELECT * FROM user WHERE active = 1 AND email LIKE ? ORDER BY email ASC"
            : "SELECT * FROM user WHERE active = 1 ORDER BY email ASC"; // Ohne Filter
        const params = filter ? [`%${filter}%`] : []; // Muster für Filterung

        userDb.all(sql, params, (err, users) => {
            if (err) {
                console.error("Fehler beim Laden aktiver Benutzer:", err.message);
                return res.status(500).send("Fehler beim Abrufen der Benutzer");
            }

            // Fehlversuche für jeden Benutzer aktualisieren
            const enrichedUsers = [];
            let remaining = users.length;
            if (remaining === 0) {
                return res.render("admin/user/list", {
                    users: [],
                    title: "Aktive Benutzer",
                    filter: filter,
                });
            }

            users.forEach(user => {
                logDb.get(
                    `SELECT COUNT(*) AS fail_count FROM login_logs 
                    WHERE email = ? AND success = 0 AND timestamp >= strftime('%s','now','-15 minutes')`,
                    [user.email],
                    (logErr, row) => {
                        user.fail_count = logErr ? "-" : (row?.fail_count || 0);
                        enrichedUsers.push(user);
                        if (--remaining === 0) {
                            res.render("admin/user/list", {
                                users: enrichedUsers,
                                title: "Aktive Benutzer",
                                filter: filter, // Filter zur Ansicht übergeben
                            });
                        }
                    }
                );
            });
        });
    });

    router.get("/list-inactive", (req, res) => {
        // Den Filterwert aus der Query-Parameter extrahieren
        const filter = req.query.filter || ""; // Standard: leer
        const sql = filter
            ? "SELECT * FROM user WHERE active = 0 AND email LIKE ? ORDER BY email ASC"
            : "SELECT * FROM user WHERE active = 0 ORDER BY email ASC"; // Ohne Filter
        const params = filter ? [`%${filter}%`] : []; // Muster für Filterung

        userDb.all(sql, params, (err, users) => {
            if (err) {
                console.error("Fehler beim Laden inaktiver Benutzer:", err.message);
                return res.status(500).send("Fehler beim Abrufen der Benutzer");
            }

            // Fehlversuche für jeden Benutzer aktualisieren
            const enrichedUsers = [];
            let remaining = users.length;

            if (remaining === 0) {
                return res.render("admin/user/list", {
                    users: [],
                    title: "Inaktive Benutzer",
                    filter: filter,
                });
            }

            users.forEach(user => {
                logDb.get(
                    `SELECT COUNT(*) AS fail_count FROM login_logs 
                    WHERE email = ? AND success = 0 AND timestamp >= strftime('%s','now','-15 minutes')`,
                    [user.email],
                    (logErr, row) => {
                        user.fail_count = logErr ? "-" : (row?.fail_count || 0);
                        enrichedUsers.push(user);
                        if (--remaining === 0) {
                            res.render("admin/user/list", {
                                users: enrichedUsers,
                                title: "Inaktive Benutzer",
                                filter: filter, // Filter zur Ansicht übergeben
                            });
                        }
                    }
                );
            });
        });
    });

    // GET: Neues Benutzerformular anzeigen
    router.get('/add', (req, res) => {
        res.render("admin/user/add", { title: "Neuen Benutzer hinzufügen" });
    });

    // POST: Neuen Benutzer speichern
    router.post('/add', async (req, res) => {
        const { password, ...formData } = req.body;
        console.log("Body received:", req.body);
        if (!formData.email || !password) return res.status(400).render("error", { message: "E-Mail & Passwort nötig." });

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const values = [
                hashedPassword,
                ...userFields.map(f => formData[f] ?? null)
            ];
            const { sql } = buildInsertQuery("user", ["password", ...userFields]);
            userDb.run(sql, values, function (err) {
                if (err) return res.status(500).render("error", { message: "Einfügen fehlgeschlagen" });
                res.redirect("/admin/user/list?created=true");
            });
        } catch (e) {
            res.status(500).render("error", { message: "Fehler beim Passwort-Hashing" });
        }
    });

    // Route zum Editieren eines Users (GET)
    router.get('/edit/:id', (req, res) => {
        userDb.get("SELECT * FROM user WHERE id = ?", [req.params.id], (err, user) => {
            if (err || !user) return res.status(404).render("error", { message: "User nicht gefunden" });
            res.render("admin/user/edit", { title: "Benutzer bearbeiten", user });
        });
    });

    // Route zum Speichern der Änderungen (POST)
// Route zum Speichern der Änderungen (POST)
    router.post('/edit/:id', (req, res) => {
        const userId = req.params.id;

        // Zuerst aktuelle Benutzerdaten abrufen
        userDb.get("SELECT * FROM user WHERE id = ?", [userId], (err, currentUser) => {
            if (err || !currentUser) {
                console.error("Fehler beim Abrufen des Benutzers:", err);
                return res.status(500).render("error", { message: "Benutzer konnte nicht gefunden werden." });
            }

            // Nur die Felder aktualisieren, die im Request vorhanden sind
            // Und nur wenn sie nicht leer sind
            const valuesToUpdate = userFields.map(field => {
                const newValue = req.body[field];
                // Wenn der Wert leer ist, behalte den aktuellen Wert bei
                return newValue !== undefined && newValue !== '' ? newValue : currentUser[field];
            });

            // SQL erstellen
            const setStatements = userFields.map(field => `${field} = ?`).join(', ');
            const finalSql = `UPDATE user SET ${setStatements}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

            // Werte und ID hinzufügen
            valuesToUpdate.push(userId);

            userDb.run(finalSql, valuesToUpdate, function (err) {
                if (err) {
                    console.error("Fehler beim Aktualisieren des Benutzers:", err);
                    return res.status(500).render("error", { message: "Update fehlgeschlagen." });
                }
                res.redirect("/admin/user/list?updated=true");
            });
        });
    });

    // API-Route zum Löschen eines Benutzers
    router.post("/delete", (req, res) => {
        const { id } = req.body;
        if (!id) return res.status(400).send("ID fehlt");
        userDb.run("DELETE FROM user WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).send("Löschen fehlgeschlagen");
            res.redirect("/admin/user/list?deleted=true");
        });
    });


    // Neue Route: Aktivierung eines Benutzers
    router.post("/activate", (req, res) => {
        userDb.run("UPDATE user SET active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [req.body.id], err => {
            if (err) return res.status(500).send("Fehler bei Aktivierung");
            res.redirect("/admin/user/list");
        });
    });

    // API-Route zum Deaktivieren eines Benutzers
    router.post("/deactivate", (req, res) => {
        userDb.run("UPDATE user SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [req.body.id], err => {
            if (err) return res.status(500).send("Fehler bei Deaktivierung");
            res.redirect("/admin/user/list");
        });
    });

    // GET: Formular anzeigen
    router.get("/change-password/:id", (req, res) => {
        res.render("admin/user/change-password", { id: req.params.id });
    });

    // POST: Passwort speichern
    router.post("/change-password/:id", async (req, res) => {
        const hashed = await bcrypt.hash(req.body.newPassword, 10);
        userDb.run("UPDATE user SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [hashed, req.params.id], function (err) {
            if (err) return res.status(500).render("error", { message: "Passwort-Update fehlgeschlagen" });
            res.redirect("/admin/user/list?passwordChanged=true");
        });
    });

    return router;
};
