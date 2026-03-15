fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        loginIdentifier: "test2@example.com",
        password: "password123"
    })
}).then(res => res.json().then(data => console.log("STATUS:", res.status, data))).catch(err => console.error(err));
