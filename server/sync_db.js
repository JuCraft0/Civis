const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'civis.db');
const db = new sqlite3.Database(dbPath);

console.log("Starting DB synchronization...");

db.serialize(() => {
    // 1. Fetch all people
    db.all("SELECT id, name, siblings, partners FROM people", (err, people) => {
        if (err) {
            console.error("Error fetching people:", err);
            return;
        }

        console.log(`Processing ${people.length} people...`);
        const peopleMapByLowerName = {};
        people.forEach(p => {
            peopleMapByLowerName[p.name.toLowerCase()] = p.id;
        });

        let linksCreated = 0;

        const createLink = (id1, id2, type) => {
            if (id1 === id2) return;
            const sql = "INSERT OR IGNORE INTO relationships (person_id_1, person_id_2, type) VALUES (?, ?, ?)";
            db.run(sql, [id1, id2, type]);
            db.run(sql, [id2, id1, type], function (err) {
                if (!err && this.changes > 0) linksCreated++;
            });
        };

        people.forEach(p => {
            // Process siblings string
            if (p.siblings) {
                const sibs = p.siblings.split(',').map(s => s.trim()).filter(s => s);
                sibs.forEach(name => {
                    const linkedId = peopleMapByLowerName[name.toLowerCase()];
                    if (linkedId) {
                        createLink(p.id, linkedId, 'sibling');
                    }
                });
            }

            // Process partners string
            if (p.partners) {
                const parts = p.partners.split(',').map(s => s.trim()).filter(s => s);
                parts.forEach(name => {
                    const linkedId = peopleMapByLowerName[name.toLowerCase()];
                    if (linkedId) {
                        createLink(p.id, linkedId, 'partner');
                    }
                });
            }
        });

        setTimeout(() => {
            console.log(`Synchronization complete. Created bidirectional links where people were found by name.`);
            db.close();
        }, 2000);
    });
});
