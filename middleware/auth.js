const jwt = require('jsonwebtoken');
const { secret_key } = require('@config');
const { controllerDb } = require("@databases");

// Middleware zum Überprüfen von JWT-Tokens in Cookies
const authMiddleware = (req, res, next) => {
    let token;

    // 1. Prüfen, ob ein Bearer-Token im Authorization-Header vorhanden ist
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
        console.log("Bearer-Token gefunden");
    }
    // 2. Wenn kein Bearer-Token vorhanden ist, prüfen, ob ein JWT-Cookie existiert
    else {
        token = req.cookies.jwt;
        console.log("JWT-Cookie gefunden:", !!token);
    }

    // Wenn weder Bearer-Token noch JWT-Cookie vorhanden ist
    if (!token) {
        console.log("Keine Authentifizierung gefunden");

        // Unterscheiden zwischen API-Anfragen und Browser-Anfragen
        const isApiRequest = req.headers['accept'] && !req.headers['accept'].includes('text/html');

        if (isApiRequest) {
            return res.status(401).json({
                success: false,
                message: "Nicht authentifiziert"
            });
        } else {
            return res.redirect('/admin/login');
        }
    }

    try {
        // Token verifizieren
        const decoded = jwt.verify(token, secret_key);

        // Benutzer zur Request hinzufügen
        req.user = decoded;
        console.log("Authentifizierter Benutzer:", req.user.username || req.user.email);

        next();
    } catch (error) {
        console.error("Token-Verifizierung fehlgeschlagen:", error.message);

        // Unterscheiden zwischen API-Anfragen und Browser-Anfragen
        const isApiRequest = req.headers['accept'] && !req.headers['accept'].includes('text/html');

        if (isApiRequest) {
            return res.status(401).json({
                success: false,
                message: "Ungültiger Token"
            });
        } else {
            res.clearCookie('jwt');
            return res.redirect('/admin/login');
        }
    }
};

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

// Middleware zur Überprüfung der Benutzerrolle
const authorizeRole = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role; // Rolle aus dem JWT-Token
        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: "Zugriff verweigert: Unzureichende Berechtigungen" });
        }
        next();
    };
};

// Middleware zur Überprüfung der UUID
const validateUUID = (req, res, next) => {
    const { uuid } = req.query; // UUID aus query ziehen

    if (!uuid) {
        return res.status(400).json({ message: "UUID erforderlich" });
    }

    // Abfrage, ob die UUID gültig ist
    controllerDb.get(
        "SELECT * FROM controller WHERE uuid = ?",
        [uuid],
        (err, row) => {
            if (err) {
                console.error("Fehler bei der Abfrage der UUID:", err.message);
                return res.status(500).json({ message: "Interner Serverfehler" });
            }

            // Wenn kein Datensatz gefunden wurde
            if (!row) {
                return res.status(403).json({ message: "Ungültige UUID" });
            }

            // UUID ist gültig; weiter zur nächsten Middleware oder Route
            next();
        }
    );
};

const localNetworkOnly = (req, res, next) => {
    let clientIp = req.ip || req.connection.remoteAddress;

    console.log("Client-IP:", clientIp);

    // IPv4-mapped IPv6 Adressen behandeln (::ffff:127.0.0.1)
    if (clientIp.includes('::ffff:')) {
        clientIp = clientIp.replace('::ffff:', '');
        console.log("Normalisierte Client-IP:", clientIp);
    }

    // Liste der erlaubten IP-Bereiche
    const allowedIPs = [
        '127.0.0.1',      // localhost
        '::1',            // IPv6 localhost
        '192.168.1.',     // Typisches Heimnetzwerk
        '192.168.4.',     // Typisches Heimnetzwerk
        '10.'             // Private IP-Bereiche
    ];

    // Prüfen ob die Client-IP in der erlaubten Liste ist
    const isAllowed = allowedIPs.some(ip => clientIp.startsWith(ip));

    if (isAllowed) {
        next(); // Zugriff erlauben
    } else {
        console.log(`Unerlaubter Zugriff von IP: ${clientIp}`);
        return res.status(403).send('Zugriff verweigert. Nur aus dem lokalen Netzwerk erlaubt.');
    }
};

module.exports = {
    authenticateJWT,
    authorizeRole,
    validateUUID,
    authMiddleware,
    localNetworkOnly,
};
