const fs = require("fs");
const path = require("path");

function isApiCall(req) {
    // Es gibt mehrere Möglichkeiten, einen API-Aufruf zu erkennen:

    // 1. Der Accept-Header enthält application/json und kein text/html
    const acceptsJson = req.headers.accept &&
        req.headers.accept.includes('application/json') &&
        !req.headers.accept.includes('text/html');

    // 2. Der Content-Type ist application/json
    const hasJsonContent = req.headers['content-type'] &&
        req.headers['content-type'].includes('application/json');

    // 3. Durch Authorization-Header (Bearer-Token typisch für APIs)
    const hasAuthHeader = req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer ');

    // 4. Optional: Anfrage enthält spezifischen Query-Parameter, z.B. ?api=true
    const hasApiFlag = req.query.api === 'true';

    // 5. Optional: Der Pfad enthält /api/
    const hasApiPath = req.path.includes('/api/');

    return acceptsJson || hasJsonContent || hasAuthHeader || hasApiFlag || hasApiPath;
}

module.exports = isApiCall;
