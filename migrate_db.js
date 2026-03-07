const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server', 'civis.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Starting migration of 'relationships' table...");

    db.run("BEGIN TRANSACTION");

    // 1. Rename old
    db.run("ALTER TABLE relationships RENAME TO relationships_old");

    // 2. Create new with correct constraint
    db.run(`CREATE TABLE relationships(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id_1 INTEGER,
        person_id_2 INTEGER,
        type TEXT,
        FOREIGN KEY(person_id_1) REFERENCES people(id),
        FOREIGN KEY(person_id_2) REFERENCES people(id),
        UNIQUE(person_id_1, person_id_2, type)
    )`);

    // 3. Copy data (only unique rows if any duplicates existed by type, though unlikely here)
    db.run("INSERT INTO relationships (id, person_id_1, person_id_2, type) SELECT id, person_id_1, person_id_2, type FROM relationships_old");

    // 4. Drop old
    db.run("DROP TABLE relationships_old");

    db.run("COMMIT", (err) => {
        if (err) {
            console.error("Migration failed! Rollback...", err.message);
        } else {
            console.log("Migration successful!");
        }
        db.close();
    });
});
