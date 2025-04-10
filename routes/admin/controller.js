const express = require("express");
const { controllerDb } = require("@databases");

module.exports = () => {
    const router = express.Router();

    router.get('/', (req, res) => {
        res.redirect('/admin/controller/list?created=true');
    });

    router.get('/list', (req, res) => {
        controllerDb.all("SELECT * FROM controller", (err, controllers) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Datenbankfehler");
            }
            res.render('admin/controller/list', { controllers });
        });
    });

    // Route zum Anzeigen des Bearbeitungsformulars
    router.get('/edit/:id', (req, res) => {
        const controllerId = req.params.id;

        // Holen der Controller-Daten aus der Datenbank
        controllerDb.get("SELECT * FROM controller WHERE id = ?", [controllerId], (err, controller) => {
            if (err) {
                console.error("Datenbankfehler:", err);
                return res.status(500).send("Datenbankfehler beim Abrufen des Controllers");
            }

            if (!controller) {
                return res.status(404).send("Controller nicht gefunden");
            }

            // Rendern des Bearbeitungsformulars mit den vorhandenen Daten
            res.render('admin/controller/edit', { title: "Controller bearbeiten", controller });
        });
    });

// Route zum Verarbeiten der Bearbeitungsdaten (POST)
    router.post('/edit/:id', (req, res) => {
        const controllerId = req.params.id;
        const {
            serial_no,
            remark,
            user_id,
            type,
            uuid,
            battery_cutoff_end,
            battery_cutoff_start,
            battery_cells,
            battery_ah,
            battery_current_max,
            battery_current_min,
            operating_time_min
        } = req.body;

        // Aktualisieren der Controller-Daten in der Datenbank
        controllerDb.run(
            `UPDATE controller SET 
     serial_no = ?, 
     remark = ?, 
     user_id = ?,
     type = ?, 
     uuid = ?, 
     battery_cutoff_end = ?, 
     battery_cutoff_start = ?, 
     battery_cells = ?, 
     battery_ah = ?, 
     battery_current_max = ?,
     battery_current_min = ?,
     operating_time_min = ?,
     updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
            [
                serial_no,
                remark,
                user_id,
                type,
                uuid,
                battery_cutoff_end,
                battery_cutoff_start,
                battery_cells,
                battery_ah,
                battery_current_max,
                battery_current_min,
                operating_time_min,
                controllerId
            ],
            function(err) {
                if (err) {
                    console.error("Fehler beim Aktualisieren des Controllers:", err);
                    return res.status(500).send("Datenbankfehler beim Aktualisieren");
                }

                // Umleiten zur Controller-Liste mit Erfolgsmeldung
                res.redirect('/admin/controller/list?updated=true');
            }
        );
    });

// Route zum Löschen eines Controllers
    router.post('/delete', (req, res) => {
        const controllerId = req.body.id;

        if (!controllerId) {
            return res.status(400).send("Controller-ID fehlt");
        }

        // Controller aus der Datenbank löschen
        controllerDb.run("DELETE FROM controller WHERE id = ?", [controllerId], function(err) {
            if (err) {
                console.error("Fehler beim Löschen des Controllers:", err);
                return res.status(500).send("Datenbankfehler beim Löschen");
            }

            // Überprüfen, ob ein Datensatz betroffen war
            if (this.changes === 0) {
                return res.status(404).send("Controller nicht gefunden oder bereits gelöscht");
            }

            // Umleiten zur Controller-Liste mit Erfolgsmeldung
            res.redirect('/admin/controller/list?deleted=true');
        });
    });

    // Route für die HTML-Seite
    router.get('/add', (req, res) => {
        res.render('admin/controller/add'); // Rendert die Datei views/admin/controller/add.ejs
    });

    // Route für den POST-Aufruf (Daten in Datenbank speichern)
    router.post('/add', (req, res) => {
        const {
            serial_no,
            remark,
            user_id,
            type,
            uuid,
            battery_cutoff_end,
            battery_cutoff_start,
            battery_cells,
            battery_ah,
            battery_current_max,
            battery_current_min,
            operating_time_min
        } = req.body;

        // Beispiel-Query zum Einfügen der Werte in die Datenbank
        const query = `
            INSERT INTO controller (
                serial_no, remark, user_id, type, uuid,
                battery_cutoff_end, battery_cutoff_start, battery_cells, battery_ah,
                battery_current_max, battery_current_min, operating_time_min
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;


        // Einfügen in die Datenbank
        controllerDb.run(
            query,
            [
                serial_no,
                remark,
                user_id,
                type,
                uuid,
                battery_cutoff_end,
                battery_cutoff_start,
                battery_cells,
                battery_ah,
                battery_current_max,
                battery_current_min,
                operating_time_min
            ],
            function (err) {
                if (err) {
                    console.error('Fehler beim Einfügen in die Datenbank:', err.message);

                    // Differenziere zwischen JSON- und HTML-Antwort
                    if (req.xhr || req.headers.accept?.includes('application/json')) {
                        // JSON-Antwort senden
                        return res.status(500).json({
                            success: false,
                            message: 'Fehler beim Einfügen der Daten.',
                            error: process.env.NODE_ENV === 'development' ? err : undefined,
                        });
                    }

                    // Redirect zur Fehlerseite bei HTML-Anfragen
                    return res.render('error', {
                        message: 'Fehler beim Speichern der Daten',
                        error: process.env.NODE_ENV === 'development' ? err : {}
                    });
                }

                /// Erfolgreich eingefügt
                if (req.xhr || req.headers.accept?.includes('application/json')) {
                    // JSON-Antwort für API-/XHR-Anfragen
                    res.status(201).json({
                        success: true,
                        message: 'Controller erfolgreich hinzugefügt!',
                        createdControllerId: this.lastID
                    });
                } else {
                    // Redirect für HTML-Anfragen mit der tatsächlichen ID
                    //res.redirect(`/admin/controller/edit/${this.lastID}`);
                    res.redirect('/admin/controller/list?created=true');
                }
            }
        );
    });

    return router;
};