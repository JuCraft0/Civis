const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testUserCreation() {
    try {
        console.log("1. Logging in as admin...");
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: 'admin'
        });
        const token = loginRes.data.token;
        console.log("Login successful. Role:", loginRes.data.role);

        console.log("\n2. Creating new user 'testuser'...");
        try {
            const createRes = await axios.post(`${API_URL}/users`, {
                username: 'testuser_' + Date.now(),
                password: 'password123',
                role: 'user'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("User creation successful:", createRes.data);
        } catch (createErr) {
            console.error("Create User Failed Status:", createErr.response?.status);
            console.error("Create User Failed Data:", createErr.response?.data);
        }

    } catch (error) {
        console.error("Login Failed:", error.response ? error.response.data : error.message);
    }
}

testUserCreation();
