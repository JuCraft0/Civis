const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server', 'civis.db');
const db = new sqlite3.Database(dbPath);

db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='relationships'", (err, row) => {
    if (err) {
        console.error(err);
    } else {
        console.log("SCHEMA:", row.sql);
    }
    db.close();
});
