const express = require("express");
const bcrypt = require("bcrypt");
const { userDb, logDb } = require("@databases");


module.exports = () => {
    const router = express.Router();

    router.get('/', (req, res) => {
        //res.redirect('/admin/user/list');
    });

    router.get("/ping", (req, res) => {
        res.send("User route works!");
    });

    router.get("/list", (req, res) => {
        // Den Filterwert aus der Query-Parameter extrahieren
        let filter = req.query.filter || ""; // Standard ist leer
        let sql = "SELECT * FROM users WHERE email LIKE ? ORDER BY active DESC, email ASC";
        let params = [`%${filter}%`]; // LIKE-Muster für Filterung

        userDb.all(sql, params, (err, users) => {
            if (err) {
                console.error("Fehler beim Laden der Benutzer:", err.message);
                return res.status(500).send("Fehler beim Abrufen der Benutzer");
            }

            const enrichedUsers = [];
            let remaining = users.length;

            if (remaining === 0) return res.render("admin", { users: [], filter, title: "Admin Dashboard" });

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
                            res.render("admin", { users: enrichedUsers, filter, title: "Admin Dashboard" });
                        }
                    }
                );
            });
        });
    });

    router.get("/active", (req, res) => {
        // Den Filterwert aus der Query-Parameter extrahieren
        const filter = req.query.filter || ""; // Standard: leer
        const sql = filter
            ? "SELECT * FROM users WHERE active = 1 AND email LIKE ? ORDER BY email ASC"
            : "SELECT * FROM users WHERE active = 1 ORDER BY email ASC"; // Ohne Filter
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
                return res.render("admin", {
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
                            res.render("admin", {
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

    router.get("/inactive", (req, res) => {
        // Den Filterwert aus der Query-Parameter extrahieren
        const filter = req.query.filter || ""; // Standard: leer
        const sql = filter
            ? "SELECT * FROM users WHERE active = 0 AND email LIKE ? ORDER BY email ASC"
            : "SELECT * FROM users WHERE active = 0 ORDER BY email ASC"; // Ohne Filter
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
                return res.render("admin", {
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
                            res.render("admin", {
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

    // API-Route zum Löschen eines Benutzers
    router.post("/delete", (req, res) => {
        const { id } = req.body;
        if (!id) {
            return res.status(400).send("Benutzer-ID ist erforderlich");
        }
        userDb.run("DELETE FROM users WHERE id = ?", [id], function(err) {
            if (err) {
                console.error("Fehler beim Löschen des Benutzers:", err.message);
                return res.status(500).send("Interner Serverfehler");
            }
            res.redirect("/admin/user");
        });
    });

    // Neue Route: Aktivierung eines Benutzers
    router.post("/activate", (req, res) => {
        const { id } = req.body;
        if (!id) {
            return res.status(400).send("Benutzer-ID ist erforderlich");
        }
        userDb.run("UPDATE users SET active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id], function(err) {
            if (err) {
                console.error("Fehler beim Aktivieren des Benutzers:", err.message);
                return res.status(500).send("Interner Serverfehler");
            }
            // Nach erfolgreicher Aktivierung zur Inaktiv-Liste weiterleiten
            res.redirect("/admin/user");
        });
    });

    // API-Route zum Deaktivieren eines Benutzers
    router.post("/deactivate", (req, res) => {
        const { id } = req.body;
        if (!id) {
            return res.status(400).send("Benutzer-ID ist erforderlich");
        }
        userDb.run("UPDATE users SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id], function(err) {
            if (err) {
                console.error("Fehler beim Deaktivieren des Benutzers:", err.message);
                return res.status(500).send("Interner Serverfehler");
            }
            res.redirect("/admin/user");
        });
    });

    // GET: Formular anzeigen
    router.get("/change-password/:id", (req, res) => {
        const id = req.params.id;
        if (!id) return res.status(400).render("error", { message: "Benutzer-ID fehlt" });

        res.render("change-password", { id });
    });

    // POST: Passwort speichern
    router.post("/change-password/:id", async (req, res) => {
        const id = req.params.id;
        const { newPassword } = req.body;

        if (!id || !newPassword) {
            return res.status(400).render("error", { message: "Alle Felder müssen ausgefüllt werden." });
        }

        try {
            const hashed = await bcrypt.hash(newPassword, 10);
            userDb.run("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [hashed, id], function (err) {
                if (err) {
                    console.error("Fehler beim Ändern des Passworts:", err.message);
                    return res.status(500).render("error", { message: "Fehler beim Aktualisieren des Passworts." });
                }
                res.redirect("/admin/user");
            });
        } catch (e) {
            console.error(e);
            res.status(500).render("error", { message: "Fehler beim Hashen des Passworts." });
        }
    });

    return router;
};
