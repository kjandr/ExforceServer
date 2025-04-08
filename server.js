require('module-alias/register');

const express = require("express");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");

const { HTTP_PORT, SECRET_KEY, viewsPath, partialsPath } = require("@config");

const app = express();
app.set('trust proxy', true);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Views-Pfad setzen
app.set("view engine", "ejs");
app.set("views", viewsPath);

// Optional: Alias für Partials
app.locals.partials = partialsPath;

//-------------------------------------------------------------------------

const userRoutes = require("./routes/user")();
app.use("/user", userRoutes);

const apiV1Routes = require("./routes/api/v1/firmware")();
app.use("/api/v1/firmware", apiV1Routes);

const adminRoutes = require("./routes/admin")();
app.use("/admin", adminRoutes);

const adminUserRoutes = require("./routes/admin/user")();
app.use("/admin/user", adminUserRoutes);

const controllerRoutes = require("./routes/admin/controller")();
app.use("/admin/controller", controllerRoutes);

//-------------------------------------------------------------------------


// Middleware zum ueberpruefen von JWT
const authenticateJWT = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.sendStatus(401);
    }
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};


//-------------------------------------------------------------------------

// Geschuetzte API-Route (nur mit gueltigem Token erreichbar)
app.get("/api/v1/", authenticateJWT, (req, res) => {
    res.json({ message: "Geheime Daten fuer " + req.user.email });
});


//-------------------------------------------------------------------------


// // Neue Route: Zeigt alle registrierten Benutzer als HTML-Liste an
// app.get("/users", (req, res) => {
//     userDb.all("SELECT id, COALESCE(salutation, 'Herr') AS salutation, COALESCE(first_name, 'Vorname') AS first_name, COALESCE(last_name, 'Nachname') AS last_name, email, COALESCE(role, 'user') AS role, COALESCE(active, 0) AS active, COALESCE(cpu_id, 'unbekannt') AS cpu_id FROM users WHERE active = 1", [], (err, rows) => {
//         if (err) {
//             console.error("Fehler beim Abrufen der Benutzer:", err.message);
//             return res.status(500).send("Interner Serverfehler");
//         }
//
//         let html = `<!DOCTYPE html>
// <html>
// <head>
//     <meta charset="UTF-8">
//     <title>Benutzerliste</title>
// </head>
// <body>
//     <h1>Benutzerliste</h1>
//     <ul>
// `;
//         rows.forEach(row => {
//             html += `<li>${row.salutation} ${row.first_name} ${row.last_name} - ${row.email} - Rolle: ${row.role} - Aktiv: ${row.active ? "Ja" : "Nein"} - CPU-ID: ${row.cpu_id}
//             <form method="POST" action="/users/deactivate" style="display:inline;">
//                 <input type="hidden" name="id" value="${row.id}">
//                 <button type="submit">Deaktivieren</button>
//             </form>
//             <form method="POST" action="/users/delete" style="display:inline;">
//                 <input type="hidden" name="id" value="${row.id}">
//                 <button type="submit">Löschen</button>
//             </form>
//             </li>`;
//         });
//         html += `
//     </ul>
// </body>
// </html>`;
//         res.send(html);
//     });
// });
//
// // Neue Route: Anzeige aller inaktiven Benutzer als HTML-Seite mit Aktivierungsbutton
// app.get("/users/inactive", (req, res) => {
//     userDb.all("SELECT id, COALESCE(salutation, 'Herr') AS salutation, COALESCE(first_name, 'Vorname') AS first_name, COALESCE(last_name, 'Nachname') AS last_name, email, COALESCE(role, 'user') AS role, COALESCE(active, 0) AS active, COALESCE(cpu_id, 'unbekannt') AS cpu_id FROM users WHERE active = 0", [], (err, rows) => {
//         if (err) {
//             console.error("Fehler beim Abrufen der inaktiven Benutzer:", err.message);
//             return res.status(500).send("Interner Serverfehler");
//         }
//         let html = `<!DOCTYPE html>
// <html>
// <head>
//     <meta charset="UTF-8">
//     <title>Inaktive Benutzerliste</title>
// </head>
// <body>
//     <h1>Inaktive Benutzerliste</h1>
//     <ul>
// `;
//         rows.forEach(row => {
//             html += `<li>${row.salutation} ${row.first_name} ${row.last_name} - ${row.email} - Rolle: ${row.role} - CPU-ID: ${row.cpu_id}
//             <form method="POST" action="/users/activate" style="display:inline;">
//                 <input type="hidden" name="id" value="${row.id}">
//                 <button type="submit">Aktivieren</button>
//             </form>
//             <form method="POST" action="/users/delete" style="display:inline;">
//                 <input type="hidden" name="id" value="${row.id}">
//                 <button type="submit">Löschen</button>
//             </form>
//             </li>`;
//         });
//         html += `
//     </ul>
// </body>
// </html>`;
//         res.send(html);
//     });
// });
//
// app.get("/login-logs", (req, res) => {
//     logDb.all("SELECT * FROM login_logs ORDER BY timestamp DESC LIMIT 100", [], (err, rows) => {
//         if (err) {
//             return res.status(500).send("Fehler beim Abrufen der Logs");
//         }
//
//         let html = `<h2>Login-Logs</h2><ul>`;
//         rows.forEach(log => {
//             html += `<li>[${log.timestamp}] IP: ${log.ip} – ${log.email} (${log.cpu_id}) – ${log.success ? "✅ Erfolgreich" : "❌ Fehlgeschlagen"}</li>`;
//         });
//         html += `</ul>`;
//         res.send(html);
//     });
// });

//-------------------------------------------------------------------------

app.listen(HTTP_PORT, () => {
    console.log(`Server laeuft auf Port ${HTTP_PORT}`);
});

