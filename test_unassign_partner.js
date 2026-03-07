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

        // 1. Current State
        const juriRes = await axios.get(`${API_URL}/people/14`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Juri Current Partners:", juriRes.data.data.partners);

        // 2. Remove partner
        console.log("Removing Theo from Juri's partners...");
        await axios.put(`${API_URL}/people/14`, {
            partners: ""
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // 3. Verify Juri
        const juriRes2 = await axios.get(`${API_URL}/people/14`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Juri New Partners:", juriRes2.data.data.partners);

        // 4. Verify Theo
        const theoRes = await axios.get(`${API_URL}/people/12`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Theo New Partners:", theoRes.data.data.partners);

    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
}

test();
