const express = require("express");
const { authenticateJWT , authorizeRole, validateUUID } = require("@middleware/auth");

const userRoutes = require("./user");
const firmwareRoutes = require("./firmware");
const controllerRoutes = require("./controller");

module.exports = () => {
    const router = express.Router();

    router.use((req, res, next) => {
        console.log(`API V3-Route aufgerufen: ${req.method} ${req.originalUrl}`);
        next();
    });

    // API V1-Subrouten definieren
    router.use("/user", userRoutes());

    // Middleware für alle Admin-Routen hinzufügen
    router.use(authenticateJWT); // Authentifizierung für alle Admin-Routen
    //router.use(validateUUID); // UUID-Validierung für alle Admin-Routen

    router.use("/firmware", firmwareRoutes());
    router.use("/controller", controllerRoutes());

    return router;
};
