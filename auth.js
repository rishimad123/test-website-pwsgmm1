// Demo Users Database (In production, this would be server-side)
const users = [
    {
        id: 1,
        username: 'admin',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin',
        email: 'admin@patelwadiganesh.org'
    },
    {
        id: 2,
        username: 'volunteer1',
        password: 'vol123',
        name: 'Rajesh Kumar',
        role: 'volunteer',
        email: 'rajesh@email.com',
        department: 'Decoration'
    },
    {
        id: 3,
        username: 'volunteer2',
        password: 'vol123',
        name: 'Priya Sharma',
        role: 'volunteer',
        email: 'priya@email.com',
        department: 'Cultural'
    },
    {
        id: 4,
        username: 'committee1',
        password: 'com123',
        name: 'Amit Patel',
        role: 'committee',
        email: 'amit@email.com',
        position: 'Secretary'
    }
];

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Checking…'; }

        // Step 1: Try to find user — check server first, then fallback to built-in list
        let user = null;
        try {
            const chkRes = await fetch(`/api/users`);
            const chkData = await chkRes.json();
            const serverUsers = chkData.users || [];
            // Server users have password stored, match it
            const matched = serverUsers.find(u =>
                (u.username === username || u.email === username)
            );
            if (matched) {
                // Fetch password from a separate secure check
                // Since GET /api/users doesn't return password, we'll do a login check
                const loginRes = await fetch('/api/login', {
                    method : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body   : JSON.stringify({ username, password })
                });
                if (loginRes.ok) {
                    const loginData = await loginRes.json();
                    if (loginData.success) user = loginData.user;
                }
            }
        } catch (e) { /* server unreachable, fall through to hardcoded */ }

        // Fallback: hardcoded built-in users
        if (!user) {
            const found = users.find(u =>
                (u.username === username || u.email === username) &&
                u.password === password
            );
            if (found) user = found;
        }

        if (!user) {
            showAlert('Invalid username or password!', 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login'; }
            return;
        }

        // Step 2: Check if the user is blocked on the server (skip for admin)
        if (user.role !== 'admin') {
            try {
                const res  = await fetch(`/api/check-block?username=${encodeURIComponent(user.username)}`);
                const data = await res.json();
                if (data.blocked) {
                    showAlert('🔒 Your account has been blocked. Please contact the administrator.', 'error');
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login'; }
                    return;
                }
            } catch (err) {
                // Server unreachable — fail safe: allow login (offline mode)
                console.warn('Block check failed, proceeding:', err.message);
            }
        }

        // Step 3: Login success — store session and redirect
        const userData = {
            id      : user.id,
            name    : user.name,
            username: user.username,
            role    : user.role,
            email   : user.email
        };
        sessionStorage.setItem('currentUser', JSON.stringify(userData));
        localStorage.removeItem('currentUser');
        localStorage.removeItem('rememberUser');

        showAlert('Login successful! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = user.role === 'admin' ? 'admin.html' : 'dashboard.html';
        }, 1000);
    });
}

function showAlert(message, type) {
    const alert = document.getElementById('alert');
    if (!alert) return;
    alert.textContent = message;
    alert.className = `alert alert-${type}`;
    alert.style.display = 'block';

    setTimeout(() => {
        alert.style.display = 'none';
    }, 3000);
}

// SECURITY: Do NOT auto-redirect if already logged in.
// Users must always enter credentials after closing the browser.
// sessionStorage is cleared automatically when the browser/tab closes.