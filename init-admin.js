require('module-alias/register');
const bcrypt = require("bcrypt");
const { userDb, logDb, controllerDb, engineDb, initializeTables } = require("@databases");
const { admin_email, admin_password } = require("@config");

async function createAdmin() {
    try {
        // Zuerst sicherstellen, dass alle Tabellen erstellt wurden
        await initializeTables();

        // Prüfen, ob bereits ein Admin existiert
        const adminExists = await new Promise((resolve, reject) => {
            userDb.get("SELECT COUNT(*) as count FROM user WHERE role = 'admin'", [], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row && row.count > 0);
                }
            });
        });

        // Wenn bereits ein Admin existiert, breche ab
        if (adminExists) {
            console.log("Admin existiert bereits, keine Initialisierung notwendig.");
            return;
        }

        // Generiere eine einzigartige CPU-ID für den Admin
        const admin_cpu_id = "ADMIN-" + Date.now().toString();

        // Hash-Passwort erstellen
        const hashedPassword = await bcrypt.hash(admin_password, 10);

        // Admin einfügen
        await new Promise((resolve, reject) => {
            userDb.run(
                "INSERT INTO user (password, salutation, last_name, first_name, email, role, active, cpu_id) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [hashedPassword, 'Herr', 'Admin', 'System', admin_email, 'admin', 1, admin_cpu_id],
                function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        console.log("Admin-Benutzer erfolgreich erstellt mit Email:", admin_email);
                        resolve(this.lastID);
                    }
                }
            );
        });

    } catch (error) {
        console.error("Fehler bei Admin-Initialisierung:", error);
    } finally {
        // Optional: Datenbank schließen, wenn das Skript separat ausgeführt wird
        userDb.close();
        logDb.close();
        controllerDb.close();
        engineDb.close();
    }
}

// Hauptausführung
createAdmin().then(() => {
    console.log("Admin-Initialisierung abgeschlossen.");
}).catch(err => {
    console.error("Fehler bei der Ausführung:", err);
});
