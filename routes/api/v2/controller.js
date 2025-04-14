const express = require("express");
const { controllerDb } = require("@databases");

module.exports = () => {
    const router = express.Router();

    // API-Route zum Hinzufügen eines Controllers (JSON in, JSON out)
    router.post('/test4589', (req, res) => {

        res.status(201).json({
            success: true,
            message: 'Controller erfolgreich hinzugefügt!',
            createdControllerId: this.lastID
        });
    });


    return router;
};
