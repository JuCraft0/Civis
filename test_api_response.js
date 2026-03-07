const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function test() {
    try {
        // 1. Login
        console.log("Logging in...");
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: 'admin'
        });
        const token = loginRes.data.token;
        console.log("Login successful.");

        // 2. Fetch Person 14 (Juri)
        console.log("Fetching Person 14...");
        const personRes = await axios.get(`${API_URL}/people/14`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("\n--- API Response for Person 14 ---");
        console.log(JSON.stringify(personRes.data, null, 2));

    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
}

test();
