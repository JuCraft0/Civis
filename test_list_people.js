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

        // 2. Fetch People
        console.log("Fetching People...");
        const res = await axios.get(`${API_URL}/people`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("\n--- API Response for People ---");
        console.log(JSON.stringify(res.data, null, 2));

    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
}

test();
