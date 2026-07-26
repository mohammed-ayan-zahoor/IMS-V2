import http from 'http';

http.get('http://localhost:3000/api/auth/csrf', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log("Status Code:", res.statusCode);
        console.log("CSRF Body:", data);
    });
}).on('error', err => {
    console.error("HTTP Error:", err.message);
});
