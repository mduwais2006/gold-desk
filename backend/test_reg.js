fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        name: "Test",
        email: "test2@example.com",
        password: "password123",
        phone: "1234567890"
    })
}).then(res => res.json().then(data => console.log(res.status, data))).catch(err => console.error(err));
