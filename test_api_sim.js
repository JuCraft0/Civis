const axios = require('axios');

async function testApi() {
    try {
        // We need a token. Since I don't have an easy way to get a new one without login,
        // I'll try to find if there's any existing token or just use a dummy one if the server allows (it probably doesn't).
        // Actually, I'll just create a new test script that uses the database logic to simulate the response.

        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const dbPath = path.resolve(__dirname, 'server', 'civis.db');
        const db = new sqlite3.Database(dbPath);

        const sql = `
            SELECT p.*, g.name as group_name 
            FROM people p 
            LEFT JOIN groups g ON p.group_id = g.id
        `;

        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log("Simulated API Data (People):");
            console.log(JSON.stringify(rows, null, 2));
            db.close();
        });
    } catch (e) {
        console.error(e);
    }
}

testApi();
