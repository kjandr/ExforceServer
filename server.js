require('module-alias/register');

const express = require("express");
const bodyParser = require("body-parser");
const { authenticateJWT, authorizeRole, validateUUID } = require("@middleware/auth");
const { url, viewsPath, partialsPath } = require("@config");
const cookieParser = require('cookie-parser');
const {  engineDb, userDb, controllerDb, logDb, initializeTables } = require("@databases");
const { ensureColumnsExist } = require("@databases/dbUtils");


// Express-App erstellen
const app = express();

// Middleware einrichten
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set('etag', false);
app.set('trust proxy', true);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true })); //axios
app.use(express.static('public'));
app.set("json spaces", 0);


// Views-Pfad setzen
app.set("view engine", "ejs");
app.set("views", viewsPath);

// Optional: Alias für Partials
app.locals.partials = partialsPath;

//-------------------------------------------------------------------------

const apiV1Routes = require("./routes/api/v1/index")();
app.use("/api/v1", apiV1Routes);
const apiV2Routes = require("./routes/api/v2/index")();
app.use("/api/v2", apiV2Routes);
const apiV3Routes = require("./routes/api/v3/index")();
app.use("/api/v3", apiV3Routes);

const { createRouter, setupAdminJS } = require("./routes/admin/index");
const adminRouter = createRouter();
app.use("/admin", adminRouter);

//-------------------------------------------------------------------------

// Geschuetzte API-Route (nur mit gueltigem Token erreichbar)
app.get("/test",
    authenticateJWT,
    authorizeRole(["admin", "user"]),
    validateUUID,
    (req, res) => {
    res.json({ message: "Geheime Daten fuer " + req.user.email });
});

//-------------------------------------------------------------------------

// Server starten
async function startServer() {
    try {
        // Datenbanktabellen initialisieren
        await initializeTables();

        // AdminJS einrichten
        const adminJs = await setupAdminJS(app, { userDb, engineDb, controllerDb, logDb });

        await ensureColumnsExist([
            {
                db: engineDb,
                table: "engine",
                columns: [
                    { name: "operating_time", definition: "INTEGER DEFAULT 0" }
                ]
            },
            {
                db: userDb,
                table: "user",
                columns: [
                    { name: "cpu_id", definition: "TEXT NOT NULL DEFAULT ''" }
                ]
            },
            {
                db: controllerDb,
                table: "controller",
                columns: [
                    { name: "operating_time", definition: "INTEGER DEFAULT 0" }
                ]
            },
            {
                db: logDb,
                table: "login_logs",
                columns: [
                    { name: "ip", definition: "TEXT" }
                ]
            }
        ]);

        // === Error-Handling-Middleware ===
        app.use((err, req, res, next) => {
            console.error(err);
            res
                .status(err.statusCode || 500)
                .json({ error: err.message || 'Unbekannter Serverfehler' });
        });

        // Server starten
        app.listen(url.port, () => {
            console.log(`Server laeuft unter der URL ${url.baseURL}`);
            console.log(`AdminJS-Panel verfügbar unter ${url.baseURL}${adminJs.options.rootPath}`);
        });
    } catch (error) {
        console.error('Fehler beim Starten des Servers:', error);
    }
}

startServer();