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
        const maxLength = 4; // immer 4 Stellen vergleichen

        for (let i = 0; i < maxLength; i++) {
            const currentPart = c[i] || 0;
            const latestPart = l[i] || 0;
            if (latestPart > currentPart) return true;
            if (latestPart < currentPart) return false;
        }
        return false;
    }

    // Lade Firmware-Infos aus Datei
    function loadFirmwareInfo() {
        return JSON.parse(fs.readFileSync("firmware.json", "utf-8"));
    }

    // Lade Geräteinfos aus Datei
    function loadDevices() {
        return JSON.parse(fs.readFileSync("devices.json", "utf-8")).controller;
    }

    // 🧪 Check-Firmware-Update (geschützt)
    router.get("/check", (req, res) => {
        const controllerType = req.query.type;
        const includeBeta = req.user?.role?.toLowerCase?.() === "admin" && req.query.beta === "true";
        const firmwareList = loadFirmwareInfo();
        const result = {};

        // 🔒 type muss vorhanden sein (wird für controller benötigt)
        if (!controllerType) {
            return res.status(400).json({ error: "Parameter 'type' fehlt." });
        }

        // 📦 Controller
        const controllerCurrent = req.query.controller;
        if (controllerCurrent) {
            const controller = firmwareList.controller?.[controllerType];
            if (!controller) {
                return res.status(404).json({ error: `Keine Firmware für Gerät ${controllerType} gefunden.` });
            }

            result.controller = {
                [controllerType]: {
                    version: controller.version,
                    url: controller.url,
                    checksum: controller.checksum,
                    ...(includeBeta && controller.beta ? { beta: controller.beta } : {}),
                    currentVersion: controllerCurrent,
                    updateAvailable: isNewerVersion(controllerCurrent, controller.version)
                }
            };
        }

        // 🖥️ PC
        const pcCurrent = req.query.pc;
        if (pcCurrent && firmwareList.pc) {
            const pc = firmwareList.pc;
            result.pc = {
                version: pc.version,
                url: pc.url,
                checksum: pc.checksum,
                ...(includeBeta && pc.beta ? { beta: pc.beta } : {}),
                currentVersion: pcCurrent,
                updateAvailable: isNewerVersion(pcCurrent, pc.version)
            };
        }

        // 📱 Mobile
        const mobileCurrent = req.query.mobile;
        if (mobileCurrent && firmwareList.mobile) {
            const mobile = firmwareList.mobile;
            result.mobile = {
                version: mobile.version,
                url: mobile.url,
                checksum: mobile.checksum,
                ...(includeBeta && mobile.beta ? { beta: mobile.beta } : {}),
                currentVersion: mobileCurrent,
                updateAvailable: isNewerVersion(mobileCurrent, mobile.version)
            };
        }

        // 🌐 Gateway
        const gatewayCurrent = req.query.gateway;
        if (gatewayCurrent && firmwareList.gateway) {
            const gateway = firmwareList.gateway;
            result.gateway = {
                version: gateway.version,
                url: gateway.url,
                checksum: gateway.checksum,
                ...(includeBeta && gateway.beta ? { beta: gateway.beta } : {}),
                currentVersion: gatewayCurrent,
                updateAvailable: isNewerVersion(gatewayCurrent, gateway.version)
            };
        }

        // Wenn keine bekannten Komponenten angefragt wurden → Fehler
        if (Object.keys(result).length === 0) {
            return res.status(400).json({ error: "Keine gültigen Komponenten mit Versionsnummer angegeben." });
        }

        res.json(result);

    });

    // 🧪 Firmware-Info direkt abfragen (auch geschützt)
    router.get("/latest", (req, res) => {
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
