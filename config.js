const path = require("path");

module.exports = {
    databasePaths: {
        user: process.env.USER_DATABASE_PATH || path.join(__dirname, "./data/users.db"),
        log: process.env.LOG_DATABASE_PATH || path.join(__dirname, "./data/login_logs.db"),
        controller: process.env.CONTROLLER_DATABASE_PATH || path.join(__dirname, "./data/controller.db"),
        engine: process.env.ENGINE_DATABASE_PATH || path.join(__dirname, "./data/engine.db"),
    },

    url: (() => {
        const protocol = process.env.APP_PROTOCOL || 'http';
        const host = process.env.APP_HOST || 'localhost';
        const port = process.env.APP_PORT || '8000';

        // Berechne die Basis-URL mit Protokoll, Host und Port (falls angegeben)
        const portPart = port ? `:${port}` : '';
        const baseURL = `${protocol}://${host}${portPart}`;

        return {
            protocol,
            host,
            port,
            portPart, // Falls du den Port getrennt brauchst
            baseURL   // Gefertigte Basis-URL
        };
    })(),

    viewsPath: path.join(__dirname, "views"),
    partialsPath: path.join(__dirname, "views", "partials"),

    secret_key: process.env.SECRET_KEY || 'mein-geheimer-schluessel',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

    admin_email: process.env.ADMIN_EMAIL || 'admin@janedv.de',
    admin_password: process.env.ADMIN_PASSWORD || '1234abcd',
};
