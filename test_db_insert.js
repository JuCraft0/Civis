const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server', 'civis.db');
const db = new sqlite3.Database(dbPath);

console.log("Attempting to insert partner relationship (14, 12, 'partner')...");
db.run("INSERT INTO relationships (person_id_1, person_id_2, type) VALUES (14, 12, 'partner')", (err) => {
    if (err) {
        console.error("ERROR:", err.message);
    } else {
        console.log("SUCCESS!");
    }
    db.close();
});
