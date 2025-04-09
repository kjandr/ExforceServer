const jwt = require('jsonwebtoken');
const { secret_key } = require('@config');
const { controllerDb } = require("@databases");

// Middleware zum Überprüfen von JWT-Tokens in Cookies
const authMiddleware = (req, res, next) => {
    //console.log("authMiddleware aufgerufen");
    //console.log("Cookies:", req.cookies);

    // JWT-Token aus dem Cookie holen
    const token = req.cookies.jwt;

    if (!token) {
        //console.log("Kein JWT-Cookie gefunden");
        return res.redirect('/admin/login');
    }

    try {
        // Token verifizieren
        //console.log("Versuche Token zu verifizieren");
        const decoded = jwt.verify(token, secret_key);

        //console.log("Token erfolgreich verifiziert:", decoded);
        // Benutzer zur Request hinzufügen
        req.user = decoded;

        next();
    } catch (error) {
        // Bei ungültigem Token zum Login zurückleiten
        //console.error("Token-Verifizierung fehlgeschlagen:", error.message);
        res.clearCookie('jwt');
        return res.redirect('/admin/login');
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

module.exports = {
    authenticateJWT,
    authorizeRole,
    validateUUID,
    authMiddleware,
};
