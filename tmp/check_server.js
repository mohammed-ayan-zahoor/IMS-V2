import fetch from 'node-fetch';

async function checkServer() {
    try {
        console.log("Checking http://localhost:3000/api/auth/session...");
        const res = await fetch('http://localhost:3000/api/auth/session');
        console.log("Status:", res.status);
        const data = await res.json();
        console.log("Data:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Fetch failed:", err.message);
    }
}

checkServer();
