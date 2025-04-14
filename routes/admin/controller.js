const express = require("express");
const { controllerDb } = require("@databases");
const loadDevices = require("@utils/loadDevices");
const controllerFields = require("@databases/controllerFields");
const { buildInsertQuery, buildUpdateQuery } = require("@databases/sqlBuilder");

module.exports = () => {
    const router = express.Router();

    router.get('/', (req, res) => {
        res.redirect('/admin/controller/list?created=true');
    });

    router.get('/list', (req, res) => {
        controllerDb.all("SELECT * FROM controller", (err, controllers) => {
            if (err) return res.status(500).send("Datenbankfehler");
            res.render('admin/controller/list', { controllers });
        });
    });

    router.get('/add', (req, res) => {
        const devices = loadDevices();
        res.render("admin/controller/add", {
            title: "Neuen Controller hinzufügen",
            devices: devices.controller,
            battery: devices.battery
        });
    });

    router.post('/add', (req, res) => {
        const values = controllerFields.map(field => req.body[field]);
        const { sql } = buildInsertQuery("controller", controllerFields);

        controllerDb.run(sql, values, function (err) {
            if (err) {
                console.error("❌ Fehler beim Einfügen:", err.message);
                return res.status(500).send("Fehler beim Speichern.");
            }
            res.redirect('/admin/controller/list?created=true');
        });
    });

    router.get('/edit/:id', (req, res) => {
        const id = req.params.id;

        controllerDb.get("SELECT * FROM controller WHERE id = ?", [id], (err, controller) => {
            if (err || !controller) {
                return res.status(500).render("error", { message: "Controller konnte nicht geladen werden." });
            }

            const devices = loadDevices();

            res.render("admin/controller/edit", {
                title: "Controller bearbeiten",
                controller,
                devices: devices.controller,
                battery: devices.battery
            });
        });
    });

    router.post('/edit/:id', (req, res) => {
        const values = controllerFields.map(field => req.body[field]);
        values.push(req.params.id); // für WHERE id = ?

        const { sql } = buildUpdateQuery("controller", controllerFields);

        controllerDb.run(sql, values, function (err) {
            if (err) {
                console.error("❌ Fehler beim Aktualisieren:", err.message);
                return res.status(500).send("Fehler beim Aktualisieren.");
            }
            res.redirect('/admin/controller/list?updated=true');
        });
    });

    router.post('/delete', (req, res) => {
        const id = req.body.id;

        if (!id) return res.status(400).send("Controller-ID fehlt");

        controllerDb.run("DELETE FROM controller WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).send("Fehler beim Löschen");

            if (this.changes === 0)
                return res.status(404).send("Controller nicht gefunden");

            res.redirect('/admin/controller/list?deleted=true');
        });
    });

    return router;
};
