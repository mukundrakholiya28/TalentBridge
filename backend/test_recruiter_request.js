(async () => {
  try {
    const base = 'http://localhost:5000';
    const loginResp = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'recruiter@demo.com', password: 'password123' })
    });
    console.log('Login status', loginResp.status);
    const loginJson = await loginResp.json();
    console.log('Login body', loginJson);
    const token = loginJson.token;
    const profileResp = await fetch(base + '/api/recruiter/profile', { headers: { Authorization: `Bearer ${token}` } });
    console.log('Profile status', profileResp.status);
    const profileJson = await profileResp.json();
    console.log('Profile body', profileJson);
  } catch (err) {
    console.error('Request failed', err);
  }
})();
