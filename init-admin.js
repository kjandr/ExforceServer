require('module-alias/register');
const bcrypt = require("bcrypt");
const { userDb, logDb, controllerDb, engineDb, initializeTables } = require("@databases");
const { admin_email, admin_password } = require("@config");
const { runAsync, getAsync } = require("@databases/dbUtils");

async function createAdmin() {
    try {
        await initializeTables();

        const row = await getAsync(userDb, "SELECT COUNT(*) as count FROM user WHERE role = 'admin'");
        if (row?.count > 0) {
            console.log("👤 Admin existiert bereits – kein Einfügen notwendig.");
            return;
        }

        const hashedPassword = await bcrypt.hash(admin_password, 10);
        const admin_cpu_id = "ADMIN-" + Date.now();

        await runAsync(userDb,
            `INSERT INTO user (password, salutation, last_name, first_name, email, role, active, cpu_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [hashedPassword, 'Herr', 'Admin', 'System', admin_email, 'admin', 1, admin_cpu_id]
        );

        console.log("✅ Admin-Benutzer erfolgreich erstellt mit Email:", admin_email);

    } catch (err) {
        console.error("❌ Fehler bei Admin-Initialisierung:", err);
    } finally {
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
