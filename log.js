const { logDb } = require("@databases");


const logFailedAndMaybeBlock = (userId, email, cpu_id, ip, res) => {
    logDb.serialize(() => {
        logDb.run(
            "INSERT INTO login_logs (user_id, email, cpu_id, ip, success) VALUES (?, ?, ?, ?, 0)",
            [userId, email, cpu_id, ip],
            (insertErr) => {
                if (insertErr) {
                    console.error("Fehler beim Schreiben in Logs:", insertErr.message);
                    return res.status(500).json({ message: "Fehler beim Loggen" });
                }

                const timeWindow = new Date(Date.now() - 15 * 60 * 1000).toISOString();
                logDb.get(
                    `SELECT COUNT(*) AS failCount FROM login_logs 
                    WHERE email = ? AND success = 0 AND timestamp >= strftime('%s','now','-15 minutes')`,
                    [email],
                    (countErr, row) => {
                        if (countErr) {
                            console.error("Fehler beim Zaehlen der Fehlschlaege:", countErr.message);
                            return res.status(500).json({ message: "Fehler beim Zaehlen" });
                        }

                        console.log(`[DEBUG] Fehlversuche für ${email}: ${row?.failCount}`);

                        if (row?.failCount >= 5) {
                            console.log(`[DEBUG] Triggering Deaktivierung für ${email}…`);
                            logDb.run("UPDATE users SET active = 0 WHERE email = ?", [email], (updateErr) => {
                                if (updateErr) {
                                    console.error("Fehler beim Deaktivieren:", updateErr.message);
                                    return res.status(500).json({ message: "Fehler beim Deaktivieren des Benutzers" });
                                }

                                console.log(`🚫 Benutzer ${email} wurde nach ${row.failCount} Fehlversuchen deaktiviert.`);
                                return res.status(403).json({
                                    message: "Zu viele Fehlversuche. Dein Benutzerkonto wurde deaktiviert."
                                });
                            });
                        } else {
                            return res.status(401).json({ message: "Ungueltige Anmeldedaten" });
                        }
                    }
                );
            }
        );
    });
};

module.exports = { logFailedAndMaybeBlock };
