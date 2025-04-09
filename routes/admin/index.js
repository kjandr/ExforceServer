const express = require("express");
const { authenticateJWT , authorizeRole, validateUUID } = require("@middleware");

const userRoutes = require("./user");
const controllerRoutes = require("./controller");
const logsRoutes = require("./logs");

module.exports = () => {
    const router = express.Router();

    router.use((req, res, next) => {
        console.log(`Admin-Route aufgerufen: ${req.method} ${req.originalUrl}`);
        next();
    });

    // Middleware für alle Admin-Routen hinzufügen
    //router.use(authenticateJWT); // Authentifizierung für alle Admin-Routen
    //router.use(validateUUID); // UUID-Validierung für alle Admin-Routen

    // Admin-Subrouten definieren
    router.use("/user", userRoutes()); // /admin/user
    router.use("/controller", controllerRoutes()); // /admin/controller
    router.use("/logs", logsRoutes()); // /admin/logs

    // Weitere Routen für /admin hinzufügen
    router.get("/", (req, res) => {
        res.redirect('/admin/user/list'); // Relativer Pfad zur aktuellen Route
    });

    return router;
};
