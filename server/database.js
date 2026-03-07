const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'civis.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');

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

        db.run(`CREATE TABLE IF NOT EXISTS people (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            age INTEGER,
            siblings TEXT,
            additional_info TEXT,
            group_id INTEGER,
            FOREIGN KEY (group_id) REFERENCES groups (id)
            )`, (err) => {
            if (err) {
                console.error('Error creating people table', err.message);
            } else {
                console.log('People table created or already exists.');
                // Ensure group_id column exists
                db.run("ALTER TABLE people ADD COLUMN group_id INTEGER", (err2) => {
                    if (err2 && !err2.message.includes("duplicate column name")) {
                        console.error("Error adding group_id to people:", err2.message);
                    } else if (!err2) {
                        console.log("Added group_id column to people table.");
                    }
                });
                db.run("ALTER TABLE people ADD COLUMN birth_date TEXT", (err2) => {
                    if (err2 && !err2.message.includes("duplicate column name")) {
                        console.error("Error adding birth_date to people:", err2.message);
                    } else if (!err2) {
                        console.log("Added birth_date column to people table.");
                    }
                });
                db.run("ALTER TABLE people ADD COLUMN partners TEXT", (err2) => {
                    if (err2 && !err2.message.includes("duplicate column name")) {
                        console.error("Error adding partners to people:", err2.message);
                    } else if (!err2) {
                        console.log("Added partners column to people table.");
                    }
                });
                db.run(`CREATE TABLE IF NOT EXISTS users (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            username TEXT UNIQUE,
                            password TEXT,
                            role TEXT
                            )`, async (err) => {
                    if (err) {
                        console.error('Error creating users table', err.message);
                    } else {
                        console.log('Users table created or already exists.');
                        // Seed Admin User
                        const bcrypt = require('bcryptjs');
                        const adminPassword = 'admin';
                        const hashedPassword = await bcrypt.hash(adminPassword, 10);

                        db.get("SELECT * FROM users WHERE username = 'admin'", [], (err, row) => {
                            if (err) {
                                console.error("Error checking for admin user", err.message);
                            } else if (!row) {
                                db.run(`INSERT INTO users(username, password, role) VALUES(?, ?, ?)`,
                                    ['admin', hashedPassword, 'admin'],
                                    (err) => {
                                        if (err) console.error("Error creating admin user", err.message);
                                        else console.log("Default admin account created.");
                                    }
                                );
                            } else {
                                console.log("Admin user already exists.");
                            }
                        });
                    }
                });
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS relationships(
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            person_id_1 INTEGER,
                            person_id_2 INTEGER,
                            type TEXT,
                            FOREIGN KEY(person_id_1) REFERENCES people(id),
                            FOREIGN KEY(person_id_2) REFERENCES people(id),
                            UNIQUE(person_id_1, person_id_2, type)
                        )`, (err) => {
            if (err) console.error('Error creating relationships table', err.message);
            else console.log('Relationships table created or already exists.');
        });
    }
});

module.exports = db;
