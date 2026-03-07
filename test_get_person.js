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

        console.log("Fetching Person ID 22..."); // from our earlier test
        const res = await axios.get(`${API_URL}/people/22`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("\n--- API Response for Person ---");
        console.log(JSON.stringify(res.data, null, 2));

    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
}
test();
