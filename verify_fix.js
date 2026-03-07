const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'server', 'civis.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        process.exit(1);
    }

    db.run("INSERT INTO groups (name, description) VALUES (?, ?)", ['Verification Group', 'Test group to verify fix'], function (err) {
        if (err) {
            console.error("Failed to insert group:", err.message);
        } else {
            console.log("Successfully inserted group with ID:", this.lastID);
            db.get("SELECT * FROM groups WHERE id = ?", [this.lastID], (err, row) => {
                if (err) console.error(err.message);
                else console.log("Retrieved group:", row);

                // Cleanup
                db.run("DELETE FROM groups WHERE id = ?", [this.lastID], () => {
                    console.log("Cleanup: Deleted verification group.");
                    db.close();
                });
            });
        }
    });
});
