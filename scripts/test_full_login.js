import http from 'http';
import querystring from 'querystring';

// Step 1: Get CSRF
http.get('http://localhost:3000/api/auth/csrf', (res) => {
    let raw = '';
    const cookies = res.headers['set-cookie'] || [];
    res.on('data', c => raw += c);
    res.on('end', () => {
        const csrfToken = JSON.parse(raw).csrfToken;
        console.log("CSRF Token:", csrfToken);
        console.log("CSRF Cookies:", cookies);

        // Step 2: Post Credentials
        const postData = querystring.stringify({
            csrfToken: csrfToken,
            email: 'student@ims.com',
            password: 'Student@123',
            instituteCode: 'DEFAULT',
            json: 'true'
        });

        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/callback/credentials',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'Cookie': cookies.join('; ')
            }
        }, (loginRes) => {
            let loginBody = '';
            const sessionCookies = loginRes.headers['set-cookie'] || [];
            loginRes.on('data', chunk => loginBody += chunk);
            loginRes.on('end', () => {
                console.log("Login Status Code:", loginRes.statusCode);
                console.log("Login Body:", loginBody);
                console.log("Session Cookies:", sessionCookies);

                // Step 3: Check Session
                const allCookies = [...cookies, ...sessionCookies];
                http.get({
                    hostname: 'localhost',
                    port: 3000,
                    path: '/api/auth/session',
                    headers: {
                        'Cookie': allCookies.join('; ')
                    }
                }, (sessionRes) => {
                    let sBody = '';
                    sessionRes.on('data', c => sBody += c);
                    sessionRes.on('end', () => {
                        console.log("Session Status Code:", sessionRes.statusCode);
                        console.log("Session User Output:", sBody);
                    });
                });
            });
        });

        req.write(postData);
        req.end();
    });
});
