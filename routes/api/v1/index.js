const express = require("express");
const { authenticateJWT , authorizeRole, validateUUID } = require("@middleware/auth");
const { createProxyMiddleware } = require('http-proxy-middleware');

const userRoutes = require("../user");

module.exports = () => {
    const router = express.Router();

    router.use((req, res, next) => {
        console.log(`API V1-Route aufgerufen: ${req.method} ${req.originalUrl}`);
        next();
    });

    // API V1-Subrouten definieren
    router.use("/user", userRoutes());

    // Middleware für alle Admin-Routen hinzufügen
    router.use(authenticateJWT); // Authentifizierung für alle Admin-Routen
    //router.use(validateUUID); // UUID-Validierung für alle Admin-Routen

    // Proxy-Route zu einem externen API-Server
    // Ersetze IP_ADRESSE und PORT durch die tatsächlichen Werte
    router.use("/", createProxyMiddleware({
        target: 'http://localhost:4444', // Ziel-Server
        changeOrigin: true,
        // Optional: Wenn du einen Basis-Pfad entfernen möchtest
        // pathRewrite: {
        //     '^/api/v1': '/' // Entfernt /api/v1 aus dem Pfad für den Zielserver
        // },
        onProxyReq: (proxyReq, req, res) => {
            // Optional: JWT-Token weiterleiten
            if (req.headers.authorization) {
                proxyReq.setHeader('Authorization', req.headers.authorization);
            }
            console.log(`Weiterleitung an externen Server: ${req.method} ${req.originalUrl}`);
        },
        onError: (err, req, res) => {
            console.error('Proxy-Fehler:', err);
            res.status(500).json({
                success: false,
                message: 'Fehler bei der Verbindung zum externen Server',
                error: err.message
            });
        }
    }));

    return router;
};
