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

        // Find user - always require fresh credentials, never auto-login
        let user = users.find(u =>
            (u.username === username || u.email === username) &&
            u.password === password
        );

        if (user) {
            try {
                const res2 = await fetch('/api/check-block?username=' + encodeURIComponent(username));
                const data = await res2.json();
                if (data.blocked) {
                    showAlert('Your account has been blocked. Contact admin.', 'error');
                    user = null;
                }
            } catch(e) {}
        }

        if (user) {
            const userData = {
                id: user.id,
                name: user.name,
                role: user.role,
                email: user.email
            };
            sessionStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.removeItem('currentUser');
            localStorage.removeItem('rememberUser');
            showAlert('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                if (user.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 1000);
        } else {
            showAlert('Invalid username or password!', 'error');
        }
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
