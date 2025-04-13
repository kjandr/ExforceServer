const express = require("express");
const { engineDb } = require("@databases");
const loadDevices = require("@utils/loadDevices");

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

    // Route zum Anzeigen des Bearbeitungsformulars
    router.get('/edit/:id', (req, res) => {
        const engineId = req.params.id;

        engineDb.get("SELECT * FROM engine WHERE id = ?", [engineId], (err, engine) => {
            if (err) {
                console.error("Fehler beim Laden vom Motoren:", err.message);
                return res.status(500).render("error", { message: "Motor konnte nicht geladen werden." });
            }

            if (!engine) {
                return res.status(404).render("error", { message: "Motor nicht gefunden." });
            }

            const devices = loadDevices();

            res.render("admin/engine/edit", {
                title: "Motor bearbeiten",
                engine,
                engines: devices.engine
            });
        });
    });

    // Route zum Verarbeiten der Bearbeitungsdaten (POST)
    router.post('/edit/:id', (req, res) => {
        const controllerId = req.params.id;
        const {
            serial_no,
            remark,
            controller_id,
            type,
            current_ki,
            current_kp,
            freq_foc_khz,
            flux_linkage_mwb,
            inductance_uh,
            resistance_mr,
            observer_gain,
            current_max,
            erpm_max,
            wattage_max,
            temp_type,
            temp_cutoff_end,
            temp_cutoff_start,
            mileage_km,
            operating_time
        } = req.body;

        // Aktualisieren der Motor-Daten in der Datenbank
        engineDb.run(
            `UPDATE engine SET 
     serial_no = ?,
     remark = ?,
     controller_id = ?,
     type = ?,
     current_ki = ?,
     current_kp = ?,
     freq_foc_khz = ?,
     flux_linkage_mwb = ?,
     inductance_uh = ?,
     resistance_mr = ?,
     observer_gain = ?,
     current_max = ?,
     erpm_max = ?,
     wattage_max = ?,
     temp_type = ?,
     temp_cutoff_end = ?,
     temp_cutoff_start = ?,
     mileage_km = ?,
     operating_time = ?,     
     updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
            [
                serial_no,
                remark,
                controller_id,
                type,
                current_ki,
                current_kp,
                freq_foc_khz,
                flux_linkage_mwb,
                inductance_uh,
                resistance_mr,
                observer_gain,
                current_max,
                erpm_max,
                wattage_max,
                temp_type,
                temp_cutoff_end,
                temp_cutoff_start,
                mileage_km,
                operating_time,
                controllerId
            ],
            function(err) {
                if (err) {
                    console.error("Fehler beim Aktualisieren von Motoren:", err);
                    return res.status(500).send("Datenbankfehler beim Aktualisieren");
                }

                // Umleiten zur Controller-Liste mit Erfolgsmeldung
                res.redirect('/admin/engine/list?updated=true');
            }
        );
    });

// Route zum Löschen eines Controllers
    router.post('/delete', (req, res) => {
        const engineId = req.body.id;

        if (!engineId) {
            return res.status(400).send("Motor-ID fehlt");
        }

        // Controller aus der Datenbank löschen
        engineDb.run("DELETE FROM engine WHERE id = ?", [engineId], function(err) {
            if (err) {
                console.error("Fehler beim Löschen des Motors:", err);
                return res.status(500).send("Datenbankfehler beim Löschen");
            }

            // Überprüfen, ob ein Datensatz betroffen war
            if (this.changes === 0) {
                return res.status(404).send("Motor nicht gefunden oder bereits gelöscht");
            }

            // Umleiten zur Motoren-Liste mit Erfolgsmeldung
            res.redirect('/admin/engine/list?deleted=true');
        });
    });

    // Route für die HTML-Seite
    router.get('/add', (req, res) => {
        const devices = loadDevices();

        res.render("admin/engine/add", {
            title: "Neuen Motor hinzufügen",
            devices: devices.engine
        });
    });

    // Route für den POST-Aufruf (Daten in Datenbank speichern)
    router.post('/add', (req, res) => {
        const {
            serial_no,
            remark,
            controller_id,
            type,
            current_ki,
            current_kp,
            freq_foc_khz,
            flux_linkage_mwb,
            inductance_uh,
            resistance_mr,
            observer_gain,
            current_max,
            erpm_max,
            wattage_max,
            temp_type,
            temp_cutoff_end,
            temp_cutoff_start,
            mileage_km,
            operating_time
        } = req.body;

        // Beispiel-Query zum Einfügen der Werte in die Datenbank
        const query = `
            INSERT INTO engine (
                serial_no, remark, controller_id, type, current_ki, current_kp,
                freq_foc_khz, flux_linkage_mwb, inductance_uh, resistance_mr, observer_gain, current_max,
                erpm_max, wattage_max, temp_type, temp_cutoff_end, temp_cutoff_start, mileage_km,
                operating_time
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;


        // Einfügen in die Datenbank
        engineDb.run(
            query,
            [
                serial_no,
                remark,
                controller_id,
                type,
                current_ki,
                current_kp,
                freq_foc_khz,
                flux_linkage_mwb,
                inductance_uh,
                resistance_mr,
                observer_gain,
                current_max,
                erpm_max,
                wattage_max,
                temp_type,
                temp_cutoff_end,
                temp_cutoff_start,
                mileage_km,
                operating_time
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
                        message: 'Motor erfolgreich hinzugefügt!',
                        createdControllerId: this.lastID
                    });
                } else {
                    // Redirect für HTML-Anfragen mit der tatsächlichen ID
                    res.redirect('/admin/engine/list?created=true');
                }
            }
        );
    });

    return router;
};