const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit the process! Allow standard reconnections.
});

const run = async (sql, params = []) => {
    // Convert SQLite ? to Postgres $1, $2, etc.
    let index = 1;
    const pgSql = sql.replace(/\?/g, () => `$${index++}`);

    // For INSERT statements, we might need RETURNING id to mimic lastID
    let modifiedSql = pgSql;
    if (modifiedSql.trim().toUpperCase().startsWith('INSERT')) {
        modifiedSql += ' RETURNING id';
    }

    const { rows, rowCount } = await pool.query(modifiedSql, params);
    return {
        lastID: rows.length > 0 ? rows[0].id : null,
        changes: rowCount
    };
};

const get = async (sql, params = []) => {
    let index = 1;
    const pgSql = sql.replace(/\?/g, () => `$${index++}`);
    const { rows } = await pool.query(pgSql, params);
    return rows[0];
};

const all = async (sql, params = []) => {
    let index = 1;
    const pgSql = sql.replace(/\?/g, () => `$${index++}`);
    const { rows } = await pool.query(pgSql, params);
    return rows;
};

async function initDB(retries = 5) {
    while (retries > 0) {
        try {
        await pool.query(`CREATE TABLE IF NOT EXISTS groups (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            parent_id INTEGER,
            CONSTRAINT fk_parent FOREIGN KEY (parent_id) REFERENCES groups (id)
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS people (
            id SERIAL PRIMARY KEY,
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
            photo_url TEXT,
            photo_urls TEXT,
            online_profiles TEXT,
            ai_metadata TEXT,
            face_descriptor TEXT,
            immich_person_id TEXT,
            CONSTRAINT fk_group FOREIGN KEY (group_id) REFERENCES groups (id)
        )`);

        // Handle migrations/missing columns (Postgres syntax)
        const checkColumn = async (table, column) => {
            const res = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name=$1 AND column_name=$2
            `, [table, column]);
            return res.rowCount > 0;
        };

        const addColumnIfMissing = async (table, column, type) => {
            if (!(await checkColumn(table, column))) {
                await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
            }
        };

        await addColumnIfMissing('people', 'group_id', 'INTEGER');
        await addColumnIfMissing('people', 'birth_date', 'TEXT');
        await addColumnIfMissing('people', 'partners', 'TEXT');
        await addColumnIfMissing('people', 'gender', 'TEXT');
        await addColumnIfMissing('people', 'aliases', 'TEXT');
        await addColumnIfMissing('people', 'location', 'TEXT');
        await addColumnIfMissing('people', 'photo_url', 'TEXT');
        await addColumnIfMissing('people', 'photo_urls', 'TEXT');
        await addColumnIfMissing('people', 'online_profiles', 'TEXT');
        await addColumnIfMissing('people', 'ai_metadata', 'TEXT');
        await addColumnIfMissing('people', 'face_descriptor', 'TEXT');
        await addColumnIfMissing('people', 'immich_person_id', 'TEXT');

        await pool.query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS person_photos (
            id SERIAL PRIMARY KEY,
            person_id INTEGER,
            photo_data BYTEA NOT NULL,
            mime_type TEXT DEFAULT 'image/webp',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_person_photo FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS relationships (
            id SERIAL PRIMARY KEY,
            person_id_1 INTEGER NOT NULL,
            person_id_2 INTEGER NOT NULL,
            type TEXT NOT NULL,
            status TEXT,
            UNIQUE (person_id_1, person_id_2, type),
            CONSTRAINT fk_rel_1 FOREIGN KEY (person_id_1) REFERENCES people(id) ON DELETE CASCADE,
            CONSTRAINT fk_rel_2 FOREIGN KEY (person_id_2) REFERENCES people(id) ON DELETE CASCADE
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS immich_faces (
            id SERIAL PRIMARY KEY,
            person_id INTEGER NOT NULL,
            asset_id TEXT NOT NULL,
            photo_data BYTEA NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_immich_face FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
        )`);

        await addColumnIfMissing('relationships', 'status', 'TEXT');
        await addColumnIfMissing('immich_faces', 'quality', 'DOUBLE PRECISION');
        await addColumnIfMissing('immich_faces', 'quality_details', 'TEXT');
        await addColumnIfMissing('person_photos', 'quality', 'DOUBLE PRECISION');
        await addColumnIfMissing('person_photos', 'quality_details', 'TEXT');

        console.log("Database initialized successfully.");
        return; // Success, exit loop
    } catch (error) {
        console.error("Database initialization failed:", error.message);
        retries -= 1;
        if (retries === 0) {
            console.error("No more retries left. Database might not be initialized properly.");
        } else {
            console.log(`Retries left: ${retries}. Waiting 5 seconds before retrying...`);
            await new Promise(res => setTimeout(res, 5000));
        }
    }
    }
}

// Initial call to initDB
initDB();

module.exports = {
    pool,
    run,
    get,
    all
};

