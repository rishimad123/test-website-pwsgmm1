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

        const username  = document.getElementById('username').value.trim();
        const password  = document.getElementById('password').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Checking…'; }

        let user = null;
        let stopFallback = false; // if server found the user but credentials were wrong, don't fallback

        // Step 1: Try server login (handles DB-created users)
        try {
            const loginRes  = await fetch('/api/login', {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify({ username, password })
            });
            const loginData = await loginRes.json();

            if (loginRes.status === 200 && loginData.success) {
                user = loginData.user;           // ✅ Server login success
            } else if (loginRes.status === 401) {
                stopFallback = true;             // ❌ Found on server but wrong password / blocked
                const msg = loginData.message === 'Account is blocked.'
                    ? '🔒 Your account has been blocked. Please contact the administrator.'
                    : 'Invalid username or password!';
                showAlert(msg, 'error');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login'; }
                return;
            }
            // If 404 → user not in DB → fall through to hardcoded list below
        } catch (e) {
            // Server unreachable — fall through to hardcoded
        }

        // Step 2: Fallback to hardcoded built-in users (admin, volunteer1, etc.)
        if (!user && !stopFallback) {
            const found = users.find(u =>
                (u.username === username || u.email === username) &&
                u.password === password
            );
            if (found) {
                // For hardcoded users, still check block status on server
                if (found.role !== 'admin') {
                    try {
                        const blkRes  = await fetch(`/api/check-block?username=${encodeURIComponent(found.username)}`);
                        const blkData = await blkRes.json();
                        if (blkData.blocked) {
                            showAlert('🔒 Your account has been blocked. Please contact the administrator.', 'error');
                            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login'; }
                            return;
                        }
                    } catch (_) { /* offline — allow */ }
                }
                user = found;
            }
        }

        if (!user) {
            showAlert('Invalid username or password!', 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login'; }
            return;
        }

        // Step 3: Login success
        sessionStorage.setItem('currentUser', JSON.stringify({
            id      : user.id,
            name    : user.name,
            username: user.username,
            role    : user.role,
            email   : user.email
        }));
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