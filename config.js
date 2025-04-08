const path = require("path");

const HTTP_PORT = 8000;
const SECRET_KEY = "mein-geheimer-schluessel";

module.exports = {
    databasePaths: {
        user: process.env.USER_DATABASE_PATH || path.join(__dirname, "./data/users.db"),
        log: process.env.LOG_DATABASE_PATH || path.join(__dirname, "./data/login_logs.db"),
        controller: process.env.CONTROLLER_DATABASE_PATH || path.join(__dirname, "./data/controller.db"),
        engine: process.env.ENGINE_DATABASE_PATH || path.join(__dirname, "./data/engine.db"),
    },

    viewsPath: path.join(__dirname, "views"),
    partialsPath: path.join(__dirname, "views", "partials"),

    HTTP_PORT,
    SECRET_KEY,
};
