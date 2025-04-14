exports.buildInsertQuery = (table, fields) => ({
    sql: `INSERT INTO ${table} (${fields.join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`
});

exports.buildUpdateQuery = (table, fields, idField = "id") => ({
    sql: `UPDATE ${table} SET ${fields.map(f => `${f} = ?`).join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE ${idField} = ?`
});
