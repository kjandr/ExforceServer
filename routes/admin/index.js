const express = require("express");
const { authMiddleware, localNetworkOnly } = require("@middleware/auth");
const authController = require('@controllers/authController');

const userRoutes = require("./user");
const controllerRoutes = require("./controller");
const engineRoutes = require("./engine");
const logsRoutes = require("./logs");

// AdminJS Imports
const formidableMiddleware = require('express-formidable');
const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const { Sequelize, DataTypes } = require('sequelize');
const AdminJSSequelize = require('@adminjs/sequelize')
const { getTables, generateModelFromDb } = require("@databases/dbUtils");

// AdminJS Setup
AdminJS.registerAdapter({
    Database: AdminJSSequelize.Database,
    Resource: AdminJSSequelize.Resource,
})


// Funktion zum Generieren aller Modelle aus einer Datenbank
async function generateAllModelsFromDb(sequelize, db) {
    try {
        const tables = await getTables(db);
        console.log(`Gefundene Tabellen: ${tables.join(', ')}`);

        const models = {};

        for (const tableName of tables) {
            const model = await generateModelFromDb(sequelize, db, tableName);
            if (model) {
                models[tableName] = model;
            }
        }

        return models;
    } catch (error) {
        console.error('Fehler beim Abrufen aller Modelle:', error.message);
        return {};
    }
}


// Funktion zum Einrichten von AdminJS
async function setupAdminJS(app, { userDb, engineDb, controllerDb, logDb }) {
    // Sequelize-Instanzen erstellen
    const userSequelize = new Sequelize({
        dialect: 'sqlite',
        storage: './data/users.db',
        logging: false
    });

    const engineSequelize = new Sequelize({
        dialect: 'sqlite',
        storage: './data/engine.db',
        logging: false
    });

    const controllerSequelize = new Sequelize({
        dialect: 'sqlite',
        storage: './data/controller.db',
        logging: false
    });

    const logSequelize = new Sequelize({
        dialect: 'sqlite',
        storage: './data/login_logs.db',
        logging: false
    });

    // Modelle generieren und AdminJS konfigurieren
    const userModels = await generateAllModelsFromDb(userSequelize, userDb);
    const engineModels = await generateAllModelsFromDb(engineSequelize, engineDb);
    const controllerModels = await generateAllModelsFromDb(controllerSequelize, controllerDb);
    const logModels = await generateAllModelsFromDb(logSequelize, logDb);

    // AdminJS-Ressourcen erstellen
    const resources = [
        // User-Modelle
        ...Object.entries(userModels).map(([tableName, model]) => ({
            resource: model,
            options: {
                navigation: { name: 'Benutzer', icon: 'User' },
                properties: tableName === 'user' ? {
                    password: { isVisible: { list: false, filter: false, show: false, edit: true } }
                } : {}
            }
        })),

        // Engine-Modelle
        ...Object.entries(engineModels).map(([tableName, model]) => ({
            resource: model,
            options: {
                navigation: { name: 'Motoren', icon: 'Settings' }
            }
        })),

        // Controller-Modelle
        ...Object.entries(controllerModels).map(([tableName, model]) => ({
            resource: model,
            options: {
                navigation: { name: 'Controller', icon: 'Cpu' }
            }
        })),

        // Log-Modelle
        ...Object.entries(logModels).map(([tableName, model]) => ({
            resource: model,
            options: {
                navigation: { name: 'Logs', icon: 'List' }
            }
        }))
    ];

    // AdminJS-Konfiguration
    const adminJs = new AdminJS({
        resources,
        rootPath: '/admin-panel',
        branding: {
            companyName: 'ExforceServer Admin',
            logo: '/logo.png',
        }
    });

    // AdminJS-Router erstellen und registrieren
    const adminRouter = AdminJSExpress.buildRouter(adminJs);
    app.use(adminJs.options.rootPath, adminRouter);

    return adminJs;
}

function createRouter() {
    const router = express.Router();

    router.use((req, res, next) => {
        console.log(`Admin-Route aufgerufen: ${req.method} ${req.originalUrl}`);
        next();
    });

    // Erst die lokale Netzwerk-Prüfung für alle Admin-Routen
    router.use(localNetworkOnly);

    // Login-Routen
    router.get('/login', authController.getLoginPage);
    router.post('/login', authController.login);
    router.post('/logout', authController.logout);

    // Middleware für alle Admin-Routen hinzufügen
    router.use(authMiddleware); // Authentifizierung für alle Admin-Routen
    //router.use(validateUUID); // UUID-Validierung für alle Admin-Routen

    // Admin-Subrouten definieren
    router.use("/user", userRoutes()); // /admin/user
    router.use("/controller", controllerRoutes()); // /admin/controller
    router.use("/engine", engineRoutes()); // /admin/controller
    router.use("/logs", logsRoutes()); // /admin/logs

    // Weitere Routen für /admin hinzufügen
    router.get("/", (req, res) => {
        res.redirect('/admin/user/list'); // Relativer Pfad zur aktuellen Route
    });

    return router;
}

module.exports = {
    setupAdminJS,
    createRouter
};
