const express = require("express");
const { authMiddleware, localNetworkOnly } = require("@middleware/auth");
const authController = require('@controllers/authController');

const userRoutes = require("./user");
const controllerRoutes = require("./controller");
const engineRoutes = require("./engine");
const logsRoutes = require("./logs");

module.exports = () => {
    const router = express.Router();

    router.use((req, res, next) => {
        console.log(`Admin-Route aufgerufen: ${req.method} ${req.originalUrl}`);
        next();
    });

    // Erst die lokale Netzwerk-Prüfung für alle Admin-Routen
    router.use(localNetworkOnly);

    // Login-Routen
    router.get('/login', authController.getLoginPage);
    router.post('/login', authController.login);
    router.post('/logout', authController.logout);

    // Middleware für alle Admin-Routen hinzufügen
    router.use(authMiddleware); // Authentifizierung für alle Admin-Routen
    //router.use(validateUUID); // UUID-Validierung für alle Admin-Routen

    // Admin-Subrouten definieren
    router.use("/user", userRoutes()); // /admin/user
    router.use("/controller", controllerRoutes()); // /admin/controller
    router.use("/engine", engineRoutes()); // /admin/controller
    router.use("/logs", logsRoutes()); // /admin/logs

    // Weitere Routen für /admin hinzufügen
    router.get("/", (req, res) => {
        res.redirect('/admin/user/list'); // Relativer Pfad zur aktuellen Route
    });

    return router;
};
