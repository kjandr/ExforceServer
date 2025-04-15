const express = require("express");
const proxy = require("express-http-proxy");
const { authenticateJWT , authorizeRole, validateUUID } = require("@middleware/auth");

const userRoutes = require("./user");
const updateRoutes = require("./update");

module.exports = () => {
    const router = express.Router();

    router.use((req, res, next) => {
        console.log(`API V2-Route aufgerufen: ${req.method} ${req.originalUrl}`);
        next();
    });

    // API V1-Subrouten definieren
    router.use("/user", userRoutes());

    // Middleware für alle Admin-Routen hinzufügen
    router.use(authenticateJWT); // Authentifizierung für alle Admin-Routen
    //router.use(validateUUID); // UUID-Validierung für alle Admin-Routen

    router.use("/update", updateRoutes());

    // Proxy-Route zu einem externen API-Server
    // Ersetze IP_ADRESSE und PORT durch die tatsächlichen Werte
    router.use(
        "/",
        proxy("http://localhost:4444", {
            proxyReqPathResolver: (req) => {
                // Pfad umschreiben: /api/v2/... → /api/v1/...
                let originalPath = req.originalUrl;
                const rewrittenPath = originalPath.replace(/^\/api\/v2/, "/api/v1");
                return rewrittenPath;
            },
            proxyReqOptDecorator: (proxyReqOpts, originalReq) => {
                // Optional: Headers bearbeiten (z. B. Auth-Token hinzufügen)
                if (originalReq.headers.authorization) {
                    proxyReqOpts.headers["Authorization"] = originalReq.headers.authorization;
                }
                return proxyReqOpts;
            },
            userResDecorator: (proxyRes, proxyResData) => {
                // Optional: Antwort des Proxys bearbeiten
                try {
                    console.log(`Externe Antwort erhalten: ${proxyRes.statusCode}`);
                    return proxyResData; // Antwort unverändert zurückgeben
                } catch (err) {
                    console.error("Fehler bei der Antwortbearbeitung:", err);
                    throw err;
                }
            },
            limit: "10mb", // Optional: Upload-Größenlimit setzen
            onError: (err, req, res) => {
                console.error("Proxy-Fehler:", err);
                res.status(500).json({
                    success: false,
                    message: "Fehler bei der Verbindung zum externen Server",
                    error: err.message,
                });
            },
        })
    );

    return router;
};
