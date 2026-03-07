const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'server', 'civis.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');

    db.serialize(() => {
        // 1. Create groups table
        db.run(`CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            parent_id INTEGER,
            FOREIGN KEY (parent_id) REFERENCES groups (id)
        )`, (err) => {
            if (err) console.error("Error creating groups table:", err.message);
            else console.log('Groups table created or already exists.');
        });

        // 2. Add group_id to people table
        db.run("ALTER TABLE people ADD COLUMN group_id INTEGER", (err) => {
            if (err) {
                if (err.message.includes("duplicate column name")) {
                    console.log("group_id column already exists in people table.");
                } else {
                    console.error("Error adding group_id column:", err.message);
                }
            } else {
                console.log("Added group_id column to people table.");
            }
        });

        // 3. Check for sibling_links table vs relationships
        db.all("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('relationships', 'sibling_links')", [], (err, rows) => {
            if (err) console.error(err.message);
            else {
                console.log("Existing relationship tables:", rows.map(r => r.name).join(', '));
            }
            db.close();
        });
    });
});
