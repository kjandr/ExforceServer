const express = require("express");
const { engineDb } = require("@databases");
const loadDevices = require("@utils/loadDevices");
const engineFields = require("@databases/engineFields");
const { buildInsertQuery, buildUpdateQuery } = require("@databases/dbUtils");
const isApiCall = require("@utils/isApiCall");

module.exports = () => {
    const router = express.Router();

    router.get('/', (req, res) => {
        res.redirect('/admin/engine/list?created=true');
    });

    router.get('/list', (req, res) => {
        engineDb.all("SELECT * FROM engine", (err, engines) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Datenbankfehler");
            }
            res.render('admin/engine/list', { engines });
        });
    });

    // Formular für neuen Eintrag anzeigen
    router.get('/add', (req, res) => {
        const devices = loadDevices();

        res.render("admin/engine/add", {
            title: "Neuen Motor hinzufügen",
            engines: devices.engines
        });
    });

    // Daten hinzufügen
    router.post('/add', (req, res) => {
        const values = engineFields.map(field => req.body[field]);
        const { sql } = buildInsertQuery("engine", engineFields);

        console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));

        engineDb.run(sql, values, function (err) {
            if (err) {
                console.error("❌ Fehler beim Einfügen:", err.message);

                // Prüfen, ob es sich um einen API-Aufruf handelt
                const isApiRequest = isApiCall(req);

                if (isApiRequest) {
                    return res.status(500).json({
                        success: false,
                        error: "Fehler beim Speichern des Motors",
                        message: err.message
                    });
                } else {
                    return res.status(500).send("Fehler beim Einfügen der Daten.");
                }
            }

            // Prüfen, ob es sich um einen API-Aufruf handelt
            const isApiRequest = isApiCall(req);

            if (isApiRequest) {
                return res.status(201).json({
                    success: true,
                    message: "Motor erfolgreich erstellt",
                    id: this.lastID,
                    data: values.reduce((obj, val, idx) => {
                        obj[engineFields[idx]] = val;
                        return obj;
                    }, {})
                });
            } else {
                res.redirect('/admin/engine/list?created=true');
            }
        });
    });

    // Edit-Formular anzeigen
    router.get('/edit/:id', (req, res) => {
        const engineId = req.params.id;

        engineDb.get("SELECT * FROM engine WHERE id = ?", [engineId], (err, engine) => {
            if (err) {
                console.error("Fehler beim Laden des Motors:", err.message);
                return res.status(500).render("error", { message: "Motor konnte nicht geladen werden." });
            }

            if (!engine) {
                return res.status(404).render("error", { message: "Motor nicht gefunden." });
            }

            const devices = loadDevices();

            res.render("admin/engine/edit", {
                title: "Motor bearbeiten",
                engine,
                engines: devices.engines
            });
        });
    });

    // Daten aktualisieren
    router.post('/edit/:id', (req, res) => {
        const values = engineFields.map(field => req.body[field]);
        values.push(req.params.id); // für WHERE id = ?

        const { sql } = buildUpdateQuery("engine", engineFields);

        engineDb.run(sql, values, function (err) {
            if (err) {
                console.error("❌ Fehler beim Aktualisieren:", err.message);
                return res.status(500).send("Fehler beim Aktualisieren der Daten.");
            }

            res.redirect('/admin/engine/list?updated=true');
        });
    });

    // Eintrag löschen
    router.post('/delete', (req, res) => {
        const engineId = req.body.id;
        if (!engineId) return res.status(400).send("❌ Motor-ID fehlt");

        engineDb.run("DELETE FROM engine WHERE id = ?", [engineId], function (err) {
            if (err) return res.status(500).send("Fehler beim Löschen");

            if (this.changes === 0)
                return res.status(404).send("Motor nicht gefunden");

            res.redirect('/admin/engine/list?deleted=true');
        });
    });

    return router;
};
