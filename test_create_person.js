const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function test() {
    try {
        console.log("Logging in...");
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: 'admin'
        });
        const token = loginRes.data.token;
        console.log("Login successful.");

        console.log("Creating Person...");
        const res = await axios.post(`${API_URL}/people`, {
            name: "John Matrix",
            age: 35,
            siblings: "Sarah Matrix",
            partners: "Jane Matrix",
            additional_info: "Test",
            group_id: null,
            birth_date: "1990-01-01"
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("\n--- API Response for Create People ---");
        console.log(JSON.stringify(res.data, null, 2));

        console.log("Fetching People...");
        const res2 = await axios.get(`${API_URL}/people`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`Found ${res2.data.data.length} people.`);
    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
}

test();
