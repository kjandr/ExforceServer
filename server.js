require('module-alias/register');

const express = require("express");
const bodyParser = require("body-parser");
const { authenticateJWT, authorizeRole, validateUUID } = require("@middleware");
const { url, viewsPath, partialsPath } = require("@config");

const app = express();
app.set('etag', false);
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

const apiV1Routes = require("./routes/api/v1/index")();
app.use("/api/v1", apiV1Routes);

const adminRoutes = require("./routes/admin/index")();
app.use("/admin", adminRoutes);

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

app.listen(url.port, () => {
    console.log(`Server laeuft unter der URL ${url.baseURL}`);
});
