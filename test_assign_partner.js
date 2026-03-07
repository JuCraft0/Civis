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

        // 1. Get Juri (ID 14)
        console.log("Fetching Juri (14)...");
        const juriRes = await axios.get(`${API_URL}/people/14`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const juri = juriRes.data.data;
        console.log("Juri Current Partners:", juri.partners);

        // 2. Add Theo as partner
        console.log("Adding Theo Schmalzhaf as partner...");
        const updateRes = await axios.put(`${API_URL}/people/14`, {
            partners: "Theo Schmalzhaf"
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("Update Success:", updateRes.data.message);
        console.log("Juri Updated Partners (Response):", updateRes.data.data.partners);

        // 3. Get Theo (ID 12) to see if he now has Juri as partner
        console.log("\nFetching Theo (12)...");
        const theoRes = await axios.get(`${API_URL}/people/12`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Theo Updated Partners:", theoRes.data.data.partners);

    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
}

test();
