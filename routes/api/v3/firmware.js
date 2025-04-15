const express = require("express");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const { secret_key } = require("@config");

module.exports = () => {
    const router = express.Router();

    // Semver-light Versionsvergleich
    function isNewerVersion(current, latest) {
        const c = current.split('.').map(Number);
        const l = latest.split('.').map(Number);
        for (let i = 0; i < l.length; i++) {
            if ((l[i] || 0) > (c[i] || 0)) return true;
            if ((l[i] || 0) < (c[i] || 0)) return false;
        }
        return false;
    }

    // Lade Firmware-Infos aus Datei
    function loadFirmwareInfo() {
        return JSON.parse(fs.readFileSync("firmware.json", "utf-8"));
    }

    // Lade Geräteinfos aus Datei
    function loadDevices() {
        return JSON.parse(fs.readFileSync("devices.json", "utf-8")).controllers;
    }

    // Auth-Middleware
    function authMiddleware(req, res, next) {
        const authHeader = req.headers["authorization"];
        const uuid = req.query.uuid;

        if (!authHeader || !authHeader.startsWith("Bearer ") || !uuid) {
            return res.status(401).json({ error: "Unauthorized: Token oder UUID fehlt" });
        }

        const token = authHeader.split(" ")[1];
        const devices = loadDevices();

        const client = devices.find(d => d.token === token && d.uuid === uuid);

        if (!client) {
            return res.status(403).json({ error: "Zugriff verweigert: Ungültiger Token oder UUID" });
        }

        req.client = client; // Gerät im Request speichern
        next();
    }

    // Middleware zum ueberpruefen von JWT
    const authenticateJWT = (req, res, next) => {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.sendStatus(401);
        }

        jwt.verify(token, secret_key, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    };

    // 🧪 Check-Firmware-Update (geschützt)
    router.get("/check", authenticateJWT, (req, res) => {
        const currentVersion = req.query.version;
        const controllerType = req.query.type;

        if (!currentVersion) {
            return res.status(400).json({ error: "Parameter 'version' fehlt." });
        }

        const firmwareList = loadFirmwareInfo();
        const fw = firmwareList[controllerType];

        if (!fw) {
            return res.status(404).json({ error: `Keine Firmware für Gerät ${controllerType} gefunden.` });
        }

        const updateAvailable = isNewerVersion(currentVersion, fw.version);

        res.json({
            device: controllerType,
            updateAvailable,
            latestVersion: fw.version,
            url: updateAvailable ? fw.url : null,
            checksum: updateAvailable ? fw.checksum : null
        });
    });

    // 🧪 Firmware-Info direkt abfragen (auch geschützt)
    router.get("/latest", authMiddleware, (req, res) => {
        const controllerType = req.client.type;
        const firmwareList = loadFirmwareInfo();
        const fw = firmwareList[controllerType];

        if (!fw) {
            return res.status(404).json({ error: `Keine Firmware für Gerät ${controllerType} gefunden.` });
        }

        res.json(fw);
    });

    return router;
};
