const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'server', 'civis.db');
console.log('Using database at:', dbPath);

const db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }

    const username = 'admin';
    const password = 'admin';
    const role = 'admin';

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT
    )`, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
            process.exit(1);
        }

        db.run(`INSERT OR REPLACE INTO users (username, password, role) VALUES (?, ?, ?)`,
            [username, hashedPassword, role],
            function (err) {
                if (err) {
                    console.error('Error inserting user:', err.message);
                } else {
                    console.log(`User '${username}' created/updated successfully with password '${password}'.`);
                }
                db.close();
            }
        );
    });
});
