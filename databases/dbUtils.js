const getColumnNamesFromDb = (db, tableName) => {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
            if (err) return reject(err);
            const columnNames = rows.map(row => row.name);
            resolve(columnNames);
        });
    });
};

module.exports = { getColumnNamesFromDb };
