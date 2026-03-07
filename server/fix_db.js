const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'civis.db');
const db = new sqlite3.Database(dbPath);

console.log("Opening DB at:", dbPath);

db.serialize(() => {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT
            )`, (err) => {
        if (err) {
            console.error("Error creating users table:", err);
            return;
        }
        console.log("Users table ensured.");

        // Check for admin
        db.get("SELECT * FROM users WHERE username = 'admin'", [], async (err, row) => {
            if (err) {
                console.error("Error checking admin:", err);
                return;
            }

            if (!row) {
                console.log("Admin not found, creating...");
                const hashedPassword = await bcrypt.hash('admin', 10);
                db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
                    ['admin', hashedPassword, 'admin'],
                    (err) => {
                        if (err) console.error("Error creating admin:", err);
                        else console.log("Admin created successfully.");
                    }
                );
            } else {
                console.log("Admin already exists.");
                // Reset password just in case
                const hashedPassword = await bcrypt.hash('admin', 10);
                db.run(`UPDATE users SET password = ? WHERE username = 'admin'`, [hashedPassword], (err) => {
                    if (err) console.error("Error resetting admin password:", err);
                    else console.log("Admin password reset to 'admin'.");
                });
            }
        });
    });
});
