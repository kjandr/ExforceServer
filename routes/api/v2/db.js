const express = require("express");
const { controllerDb } = require("@databases");
const { runAsync, allAsync }  = require("@databases/dbUtils");


// === Boolean-Konvertierung ===
// ⬇️ Globale Liste aller booleschen Spalten
const boolColumns = [];

const boolToInt = (v) => (v === true || v === 'true' || v === 1 ? 1 : 0);
const intToBool = (v) => v === 1 || v === '1';

function convertBoolsToInt(obj) {
    const out = { ...obj };
    boolColumns.forEach((col) => {
        if (col in out) out[col] = boolToInt(out[col]);
    });
    return out;
}

function convertIntsToBool(obj) {
    const out = { ...obj };
    boolColumns.forEach((col) => {
        if (col in out) out[col] = intToBool(out[col]);
    });
    return out;
}

module.exports = () => {
    const router = express.Router();

    router.get('/controllers/columns', async (req, res, next) => {
        try {
            /* PRAGMA table_info liefert:
               cid | name | type | notnull | dflt_value | pk   */
            const rows = await allAsync(controllerDb, 'PRAGMA table_info(controller)');
            /* Wir interessieren uns meist nur für name & type */
            const columns = rows.map((r) => ({
                name: r.name,
                type: r.type,
                primaryKey: r.pk === 1,
                notNull: r.notnull === 1,
                default: r.dflt_value,
            }));
            res.json({ columns });
        } catch (err) {
            next(err);
        }
    });

    // GET /controllers – alle Controller auslesen
    router.get('/controllers', async (req, res, next) => {
        try {
            const rows = await allAsync(controllerDb, 'SELECT * FROM controller');
            res.json({ controllers: rows.map(convertIntsToBool) });
            console.log(rows);
        } catch (err) {
            next(err);
        }
    });

    // POST /controllers – neuen Controller anlegen
    router.post('/controllers', async (req, res, next) => {
        try {
            const input = convertBoolsToInt(req.body);
            const { serial_no, uuid } = input;
            if (!serial_no || !uuid) {
                return res
                    .status(400)
                    .json({ error: 'Seriennummer und UUID sind erforderlich' });
            }

            input.created_at = new Date().toISOString();

            const columns = Object.keys(input).filter((k) => k !== 'id');
            const placeholders = columns.map(() => '?').join(', ');
            const values = columns.map((k) => input[k]);
            const sql = `INSERT INTO controller (${columns.join(
                ', '
            )}) VALUES (${placeholders})`;

            const result = await runAsync(controllerDb, sql, values);
            res.json({ id: result.lastID });
        } catch (err) {
            next(err);
        }
    });

    // PUT /controllers/:id – bestehenden Controller komplett aktualisieren
    router.put('/controllers/:id', async (req, res, next) => {
        try {
            const { id } = req.params;
            const input = convertBoolsToInt(req.body);
            input.updated_at = new Date().toISOString();

            const columns = Object.keys(input);
            const setStmt = columns.map((k) => `${k} = ?`).join(', ');
            const values = columns.map((k) => input[k]).concat(id);
            const sql = `UPDATE controller SET ${setStmt} WHERE id = ?`;

            const result = await runAsync(controllerDb, sql, values);
            res.json({ updated: result.changes });
        } catch (err) {
            next(err);
        }
    });

// DELETE /controllers/:id – Controller löschen
    router.delete('/controllers/:id', async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await runAsync(controllerDb, 'DELETE FROM controller WHERE id = ?', [id]);
            res.json({ deleted: result.changes });
        } catch (err) {
            next(err);
        }
    });

    return router;
};
