const express = require("express");
const bcrypt = require("bcrypt");
const { userDb, logDb } = require("@databases");

module.exports = () => {
    const router = express.Router();

    router.get('/', (req, res) => {
        res.redirect('/admin/user/list');
    });

    router.get("/ping", (req, res) => {
        res.send("User route works!");
    });

    router.get('/list2', (req, res) => {
        userDb.all("SELECT * FROM user", (err, users) => {
            if (err) {
                console.error("Fehler beim Laden der Benutzer:", err.message);
                return res.status(500).send("Fehler beim Abrufen der Benutzer");
            }

            console.log("➡️ Benutzer gefunden:", users.length);
            res.render("admin/user/list2", {
                title: "Liste 2",
                users // <--- wichtig!
            });
        });
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

            if (remaining === 0) return res.render("admin/user/list", { users: [], filter, title: "Admin Dashboard" });

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
                            res.render("admin/user/list", { users: enrichedUsers, filter, title: "Admin Dashboard" });
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

    router.get("/inactive", (req, res) => {
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

    // API-Route zum Löschen eines Benutzers
    router.post("/delete", (req, res) => {
        const { id } = req.body;
        if (!id) {
            return res.status(400).send("Benutzer-ID ist erforderlich");
        }
        userDb.run("DELETE FROM user WHERE id = ?", [id], function(err) {
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
        userDb.run("UPDATE user SET active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id], function(err) {
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
        userDb.run("UPDATE user SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id], function(err) {
            if (err) {
                console.error("Fehler beim Deaktivieren des Benutzers:", err.message);
                return res.status(500).send("Interner Serverfehler");
            }
            res.redirect("/admin/user");
        });
    });

    // Route zum Editieren eines Users (GET)
    router.get('/edit/:id', (req, res) => {
        const userId = req.params.id;

        // User-Daten aus der Datenbank holen
        userDb.get("SELECT * FROM user WHERE id = ?", [userId], (err, user) => {
            if (err) {
                console.error("Datenbankfehler:", err);
                return res.status(500).send("Datenbankfehler beim Abrufen des Users");
            }

            if (!user) {
                return res.status(404).send("User nicht gefunden");
            }

            // Den User-Edit-View rendern
            res.render("admin/user/edit", {
                title: "Benutzer bearbeiten",
                user
            });

        });
    });

    // Route zum Speichern der Änderungen (POST)
    router.post('/edit/:id', (req, res) => {
        const userId = req.params.id;
        const {salutation, first_name, last_name, email, role, active} = req.body;

        userDb.run(
            `UPDATE user SET
                 salutation = ?,
                 first_name = ?,
                 last_name = ?,
                 email = ?,
                 role = ?,
                 active = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [salutation, first_name, last_name, email, role, active, userId],
            function (err) {
                if (err) {
                    console.error("Fehler beim Aktualisieren des Users:", err);
                    return res.status(500).send("Datenbankfehler beim Aktualisieren");
                }
                res.redirect('/admin/user/list?updated=true');
            }
        );
    });

    // GET: Neues Benutzerformular anzeigen
    router.get('/add', (req, res) => {
        res.render('admin/user/add', {
            title: "Neuen Benutzer hinzufügen"
        });
    });

    // POST: Neuen Benutzer speichern
    router.post('/add', async (req, res) => {
        const {
            salutation,
            first_name,
            last_name,
            email,
            role,
            active,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).render("error", {
                message: "E-Mail und Passwort sind erforderlich."
            });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const cpu_id = "0987654321"
            userDb.run(`
            INSERT INTO user (password, salutation, last_name, first_name, email, role, active, cpu_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [hashedPassword, salutation, first_name, last_name, email, role, active, cpu_id], function (err) {
                if (err) {
                    console.error("Fehler beim Einfügen:", err.message);
                    return res.status(500).render("error", { message: "Fehler beim Speichern des Benutzers." });
                }

                res.redirect("/admin/user/list?created=true");
            });
        } catch (e) {
            console.error("Hash-Fehler:", e);
            res.status(500).render("error", { message: "Fehler beim Verschlüsseln des Passworts." });
        }
    });


    // GET: Formular anzeigen
    router.get("/change-password/:id", (req, res) => {
        const id = req.params.id;
        if (!id) return res.status(400).render("error", { message: "Benutzer-ID fehlt" });

        res.render("admin/user/change-password", { id });
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
            userDb.run("UPDATE user SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [hashed, id], function (err) {
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
