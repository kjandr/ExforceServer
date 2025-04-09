const express = require("express");
const { authenticateJWT , authorizeRole, validateUUID } = require("@middleware");

const firmwareRoutes = require("./firmware");

module.exports = () => {
    const router = express.Router();

    router.use((req, res, next) => {
        console.log(`API V1-Route aufgerufen: ${req.method} ${req.originalUrl}`);
        next();
    });

    // Middleware für alle Admin-Routen hinzufügen
    //router.use(authenticateJWT); // Authentifizierung für alle Admin-Routen
    //router.use(validateUUID); // UUID-Validierung für alle Admin-Routen

    // API V1-Subrouten definieren
    router.use("/firmware", firmwareRoutes()); // /admin/user

    return router;
};
