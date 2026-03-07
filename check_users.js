const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/civis.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("SELECT * FROM people", (err, people) => {
        if (err) console.error("Error:", err);
        else console.log("People:", people);

        db.all("SELECT * FROM relationships", (err, rels) => {
            if (err) console.error("Error:", err);
            else console.log("Relationships:", rels);
        });
    });
});
