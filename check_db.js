const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server', 'civis.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT * FROM people", (err, people) => {
    console.log("--- PEOPLE ---");
    console.table(people);

    db.all("SELECT * FROM relationships", (err, relations) => {
        console.log("\n--- RELATIONSHIPS ---");
        console.table(relations);
        db.close();
    });
});
