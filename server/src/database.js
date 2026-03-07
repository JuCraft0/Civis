const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '..', 'civis.db');

const db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        await initDB();
    }
});

const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) { err ? reject(err) : resolve(this); });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

async function initDB() {
    try {
        await run(`CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            parent_id INTEGER,
            FOREIGN KEY (parent_id) REFERENCES groups (id)
        )`);

        await run(`CREATE TABLE IF NOT EXISTS people (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            age INTEGER,
            siblings TEXT,
            partners TEXT,
            additional_info TEXT,
            group_id INTEGER,
            birth_date TEXT,
            gender TEXT,
            aliases TEXT,
            location TEXT,
            FOREIGN KEY (group_id) REFERENCES groups (id)
        )`);

        try { await run("ALTER TABLE people ADD COLUMN group_id INTEGER"); } catch (e) { }
        try { await run("ALTER TABLE people ADD COLUMN birth_date TEXT"); } catch (e) { }
        try { await run("ALTER TABLE people ADD COLUMN partners TEXT"); } catch (e) { }
        try { await run("ALTER TABLE people ADD COLUMN gender TEXT"); } catch (e) { }
        try { await run("ALTER TABLE people ADD COLUMN aliases TEXT"); } catch (e) { }
        try { await run("ALTER TABLE people ADD COLUMN location TEXT"); } catch (e) { }
        try { await run("ALTER TABLE people ADD COLUMN photo_url TEXT"); } catch (e) { }
        try { await run("ALTER TABLE people ADD COLUMN photo_urls TEXT"); } catch (e) { }
        try { await run("ALTER TABLE people ADD COLUMN online_profiles TEXT"); } catch (e) { }
        try { await run("ALTER TABLE people ADD COLUMN ai_metadata TEXT"); } catch (e) { }
        try { await run("ALTER TABLE people ADD COLUMN face_descriptor TEXT"); } catch (e) { }

        await run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT
        )`);

        const adminPassword = 'admin';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const adminUser = await get("SELECT * FROM users WHERE username = 'admin'");
        if (!adminUser) {
            await run(`INSERT INTO users(username, password, role) VALUES(?, ?, ?)`, ['admin', hashedPassword, 'admin']);
            console.log("Default admin account created.");
        }

        await run(`CREATE TABLE IF NOT EXISTS relationships(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person_id_1 INTEGER,
            person_id_2 INTEGER,
            type TEXT,
            status TEXT,
            FOREIGN KEY(person_id_1) REFERENCES people(id),
            FOREIGN KEY(person_id_2) REFERENCES people(id),
            UNIQUE(person_id_1, person_id_2, type, status)
        )`);

        try { await run("ALTER TABLE relationships ADD COLUMN status TEXT"); } catch (e) { }

        console.log("Database initialized successfully.");
    } catch (error) {
        console.error("Database initialization failed:", error);
    }
}

module.exports = {
    db,
    run,
    get,
    all
};
