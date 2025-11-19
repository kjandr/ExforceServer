const express = require("express");
const proxy = require("express-http-proxy");
const { authenticateJWT , authorizeRole, validateUUID } = require("@middleware/auth");

const userRoutes = require("../v3/user");

module.exports = () => {
    const router = express.Router();

    router.use((req, res, next) => {
        // Hole die IP-Adresse des Clients
        const clientIp = req.ip;
        console.log(`[${new Date().toLocaleString()}] API V1-Route aufgerufen: ${req.method} ${req.originalUrl} von IP: ${clientIp}`);
        next();
    });

    // Proxy-Route zu einem externen API-Server
    // Ersetze IP_ADRESSE und PORT durch die tatsächlichen Werte
    router.use(
        "/",
        proxy("http://localhost:4441", {
            proxyReqPathResolver: (req) => {
                // Optional: Pfade modifizieren (z. B. /api/v1 entfernen)
                // Hier kann bei Bedarf eine Path-Rewrite-Regel hinterlegt werden.
                return req.originalUrl;
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
