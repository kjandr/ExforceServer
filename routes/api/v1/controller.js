const express = require("express");
const { controllerDb } = require("@databases");

module.exports = () => {
    const router = express.Router();

    // API-Route zum Hinzufügen eines Controllers (JSON in, JSON out)
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

        // 🧪 Validierung
        if (!serial_no || !type || !uuid || typeof user_id === 'undefined') {
            return res.status(400).json({
                success: false,
                message: "Pflichtfelder fehlen: serial_no, type, uuid, user_id",
            });
        }

        // 🔍 Überprüfe, ob UUID bereits vorhanden ist
        const checkQuery = `SELECT COUNT(*) AS count FROM controller WHERE uuid = ?`;
        controllerDb.get(checkQuery, [uuid], (checkErr, row) => {
            if (checkErr) {
                console.error("Fehler bei der UUID-Prüfung:", checkErr.message);
                return res.status(500).json({
                    success: false,
                    message: "Fehler bei der Überprüfung der UUID.",
                    error: process.env.NODE_ENV === 'development' ? checkErr.message : undefined
                });
            }

            if (row.count > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Diese UUID existiert bereits in der Datenbank.",
                });
            }

            // ✅ Einfügen, wenn UUID **nicht** vorhanden
            const insertQuery = `
            INSERT INTO controller (
                serial_no, remark, user_id, type, uuid,
                battery_cutoff_end, battery_cutoff_start, battery_cells, battery_ah,
                battery_current_max, battery_current_min, operating_time_min
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

            const values = [
                serial_no,
                remark || '',
                user_id,
                type,
                uuid,
                battery_cutoff_end ?? null,
                battery_cutoff_start ?? null,
                battery_cells ?? null,
                battery_ah ?? null,
                battery_current_max ?? null,
                battery_current_min ?? null,
                operating_time_min ?? null
            ];

            controllerDb.run(insertQuery, values, function (err) {
                if (err) {
                    console.error('❌ Fehler beim Einfügen in die Datenbank:', err.message);
                    return res.status(500).json({
                        success: false,
                        message: 'Fehler beim Einfügen der Daten.',
                        error: process.env.NODE_ENV === 'development' ? err.message : undefined
                    });
                }

                res.status(201).json({
                    success: true,
                    message: 'Controller erfolgreich hinzugefügt!',
                    createdControllerId: this.lastID
                });
            });
        });
    });


    return router;
};
