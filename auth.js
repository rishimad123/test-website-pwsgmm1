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

        // Step 1: Validate credentials against local user list
        const user = users.find(u =>
            (u.username === username || u.email === username) &&
            u.password === password
        );

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