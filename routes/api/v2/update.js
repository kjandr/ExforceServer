const express = require("express");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { secret_key } = require("@config");

// ---- Helpers -------------------------------------------------------------

// Semver-light Versionsvergleich
function isNewerVersion(current, latest) {
    const c = (current || "").split(".").map(Number);
    const l = (latest || "").split(".").map(Number);
    const maxLength = 4;
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

function isHttpUrl(u) {
    return typeof u === "string" && /^https?:\/\//i.test(u);
}

// Sucht den passenden Firmware-Eintrag (inkl. Beta-Track)
function resolveFirmware({ firmwareList, component, controllerType, wantBeta, explicitVersion }) {
    let node;

    if (component === "controller") {
        node = firmwareList.controller?.[controllerType];
    } else {
        node = firmwareList[component];
    }
    if (!node) return { error: `Keine Firmware für ${component}${component === "controller" ? ` (${controllerType})` : ""} gefunden.` };

    // Track wählen
    const track = wantBeta ? node.beta ?? null : node;
    if (wantBeta && !track) return { error: "Beta-Firmware nicht verfügbar." };

    // Wenn Version explizit angefragt wurde, muss sie passen
    if (explicitVersion) {
        // Prüfen gegen Release und ggf. Beta
        const candidates = [node, node.beta].filter(Boolean);
        const match = candidates.find(c => c.version === explicitVersion);
        if (!match) return { error: `Version ${explicitVersion} nicht gefunden.` };
        return { entry: match, track: match === node.beta ? "beta" : "release" };
    }

    return { entry: track || node, track: wantBeta ? "beta" : "release" };
}

// ---- Routen --------------------------------------------------------------

module.exports = () => {
    const router = express.Router();

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

    // ⬇️ Firmware herunterladen (Release/Beta)
    // Beispiel:
    //   GET /download?component=controller&type=x1000
    //   GET /download?component=pc
    //   GET /download?component=controller&type=x1000&beta=true
    //   GET /download?component=gateway&version=0.9.8
    router.get("/download", async (req, res) => {
        const firmwareList = loadFirmwareInfo();

        const component = String(req.query.component || "").toLowerCase();
        const controllerType = req.query.type;
        const explicitVersion = req.query.version;
        const wantBetaFlag = req.query.beta === "true";
        const redirect = req.query.redirect !== "false"; // default: redirect=true

        if (!component) {
            return res.status(400).json({ error: "Parameter 'component' fehlt." });
        }
        if (component === "controller" && !controllerType) {
            return res.status(400).json({ error: "Parameter 'type' fehlt (für component=controller)." });
        }

        const includeBeta = req.user?.role?.toLowerCase?.() === "admin";
        if (wantBetaFlag && !includeBeta) {
            return res.status(403).json({ error: "Beta-Download nur für Admins erlaubt." });
        }

        const { entry, track, error } = resolveFirmware({
            firmwareList,
            component,
            controllerType,
            wantBeta: wantBetaFlag,
            explicitVersion,
        });

        if (error) return res.status(404).json({ error });

        const fileUrl = entry.url;
        const fileNameSuggested = (() => {
            const base = `${component}${component === "controller" ? `-${controllerType}` : ""}-${entry.version}`;
            const ext = path.extname(fileUrl || "") || ".bin";
            return `${base}${ext}`;
        })();

        // a) Externe URL → 302 Redirect (einfach & schnell)
        if (redirect && isHttpUrl(fileUrl)) {
            res.setHeader("X-Firmware-Version", entry.version);
            res.setHeader("X-Firmware-Track", track);
            res.setHeader("X-Firmware-Checksum", entry.checksum || "");
            return res.redirect(302, fileUrl);
        }

        // b) Lokaler Pfad → Datei streamen (nur wenn kein http/https)
        if (!fileUrl) return res.status(500).json({ error: "Keine Download-URL konfiguriert." });

        if (isHttpUrl(fileUrl)) {
            // redirect=false aber externe URL → Sicherheitshalber auch redirect
            res.setHeader("X-Firmware-Version", entry.version);
            res.setHeader("X-Firmware-Track", track);
            res.setHeader("X-Firmware-Checksum", entry.checksum || "");
            return res.redirect(302, fileUrl);
        }

        // ABSICHERUNG: nur innerhalb eines erlaubten Verzeichnisses
        const DOWNLOAD_DIR = path.resolve("downloads"); // <— anpassen wenn nötig
        const absPath = path.resolve(DOWNLOAD_DIR, fileUrl);
        if (!absPath.startsWith(DOWNLOAD_DIR + path.sep)) {
            return res.status(400).json({ error: "Ungültiger Pfad." });
        }

        if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
            return res.status(404).json({ error: "Datei nicht gefunden." });
        }

        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename="${fileNameSuggested}"`);
        res.setHeader("X-Firmware-Version", entry.version);
        res.setHeader("X-Firmware-Track", track);
        if (entry.checksum) res.setHeader("X-Firmware-Checksum", entry.checksum);

        const stream = fs.createReadStream(absPath);
        stream.on("error", () => res.status(500).end());
        stream.pipe(res);
    });

    return router;
};
