const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'civis.db'); // Assumes running from server dir
const db = new sqlite3.Database(dbPath);

console.log("Opening DB at:", dbPath);

db.serialize(() => {
    // 1. Get all current relationships
    db.all("SELECT * FROM relationships", (err, rows) => {
        if (err) {
            console.error("Error fetching relationships:", err);
            return;
        }

        console.log(`Found ${rows.length} relationships.`);
        let addedCount = 0;

        // 2. Check each relationship for its reverse
        const stmt = db.prepare("INSERT OR IGNORE INTO relationships (person_id_1, person_id_2, type) VALUES (?, ?, ?)");

        rows.forEach(row => {
            // We have A -> B. We need B -> A.
            // SQLite INSERT OR IGNORE will handle duplicates if B->A already exists.
            stmt.run(row.person_id_2, row.person_id_1, row.type, function (err) {
                if (err) console.error("Error inserting reverse:", err);
                else {
                    if (this.changes > 0) {
                        console.log(`Added missing reverse link: ${row.person_id_2} -> ${row.person_id_1}`);
                        addedCount++;
                    }
                }
            });
        });

        stmt.finalize(() => {
            console.log(`Repair complete. Added ${addedCount} missing reverse links.`);
        });
    });
});
