const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { userDb } = require('@databases');
const { secret_key, JWT_EXPIRES_IN } = require('@config');

// Login-Seite anzeigen
exports.getLoginPage = (req, res) => {
    // Prüfen, ob bereits eingeloggt
    if (req.cookies.jwt) {
        try {
            jwt.verify(req.cookies.jwt, secret_key);
            return res.redirect('/admin/user/list');
        } catch (error) {
            // Token ungültig, Cookie löschen
            res.clearCookie('jwt');
        }
    }

    res.render('login', { error: null });
};

// Login-Anfrage verarbeiten
exports.login = (req, res) => {
    const { email, password } = req.body;

    // Holen der Client-IP-Adresse
    const clientIp = req.ip;

    console.log("IP-Adresse des Clients:", clientIp);

    // Input-Validierung
    if (!email || !password) {
        return res.render('login', { error: 'Bitte E-Mail und Passwort eingeben.' });
    }

    // In der Datenbank nach dem Benutzer suchen
    userDb.get(
        'SELECT * FROM user WHERE email = ? AND role = "admin" AND active = 1',
        [email],
        async (err, user) => {
            if (err) {
                console.error('Datenbankfehler:', err);
                return res.render('login', { error: 'Ein Fehler ist aufgetreten.' });
            }

            if (!user) {
                return res.render('login', { error: 'Ungültige Anmeldedaten.' });
            }

            // Passwort überprüfen
            try {
                const isMatch = await bcrypt.compare(password, user.password);

                if (!isMatch) {
                    return res.render('login', { error: 'Ungültige Anmeldedaten.' });
                }

                // JWT-Token erstellen
                const token = jwt.sign(
                    {
                        id: user.id,
                        email: user.email,
                        role: user.role,
                        firstName: user.first_name,
                        lastName: user.last_name
                    },
                    secret_key,
                    { expiresIn: JWT_EXPIRES_IN }
                );

                // Token in einem Cookie speichern
                res.cookie('jwt', token, {
                    httpOnly: true,  // Nicht per JavaScript zugänglich
                    secure: false, //process.env.NODE_ENV === 'production',  // Nur über HTTPS im Produktionsmodus
                    maxAge: 24 * 60 * 60 * 1000  // 24 Stunden
                });
                console.log("Cookie gesetzt mit Token:", token.substring(0, 10) + "...");


                // Login-Vorgang protokollieren
                logLoginAttempt(user.id, user.email, user.cpu_id, req.ip, true);

                // Zum Dashboard weiterleiten
                res.redirect('/admin/user/list');

            } catch (error) {
                console.error('Login-Fehler:', error);
                res.render('login', { error: 'Ein Fehler ist aufgetreten.' });
            }
        }
    );
};

// Logout-Funktion
exports.logout = (req, res) => {
    res.clearCookie('jwt');
    res.redirect('/admin/login');
};

// Login-Versuch protokollieren
function logLoginAttempt(userId, email, cpuId, ip, success) {
    const { logDb } = require('@databases');

    logDb.run(
        'INSERT INTO login_logs (user_id, email, cpu_id, ip, success) VALUES (?, ?, ?, ?, ?)',
        [userId, email, cpuId, ip, success ? 1 : 0],
        (err) => {
            if (err) {
                console.error('Fehler beim Protokollieren des Login-Versuchs:', err);
            }
        }
    );
}
