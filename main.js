// ==================== MOBILE MENU ====================
const mobileToggle = document.getElementById('mobileToggle');
const navMenu = document.getElementById('navMenu');

if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.navbar')) {
            navMenu.classList.remove('active');
        }
    });
}

// ==================== COUNTDOWN TIMER ====================
function updateCountdown() {
    // Set event date (Change this to your actual event date)
    const eventDate = new Date('September 19, 2025 10:00:00').getTime();
    const now = new Date().getTime();
    const distance = eventDate - now;
    
    if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        if (document.getElementById('days')) {
            document.getElementById('days').textContent = String(days).padStart(2, '0');
            document.getElementById('hours').textContent = String(hours).padStart(2, '0');
            document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
            document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
        }
    } else {
        if (document.getElementById('days')) {
            document.getElementById('days').textContent = '00';
            document.getElementById('hours').textContent = '00';
            document.getElementById('minutes').textContent = '00';
            document.getElementById('seconds').textContent = '00';
        }
    }
}

if (document.getElementById('countdown')) {
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// ==================== ANIMATED COUNTER ====================
function animateCounter() {
    const counters = document.querySelectorAll('.stat-number');
    
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        const increment = target / 100;
        let current = 0;
        
        const updateCounter = () => {
            current += increment;
            if (current < target) {
                counter.textContent = Math.floor(current).toLocaleString();
                setTimeout(updateCounter, 20);
            } else {
                counter.textContent = target.toLocaleString();
            }
        };
        
        updateCounter();
    });
}

// ==================== INTERSECTION OBSERVER ====================
const observerOptions = {
    threshold: 0.3,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            if (entry.target.classList.contains('stats')) {
                animateCounter();
            }
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe sections
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.stats, .about-preview, .events, .gallery-preview').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
});

// ==================== SMOOTH SCROLLING ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href.length > 1) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// ==================== FORM VALIDATION ====================
const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = e.target.querySelector('input[type="email"]').value;
        if (email) {
            alert('Thank you for subscribing! We will keep you updated.');
            e.target.reset();
        }
    });
}

// ==================== DYNAMIC DATA FETCHING ====================
async function loadPublicData() {
    // Load Events
    const eventsGrid = document.getElementById('publicEventsGrid');
    if (eventsGrid) {
        try {
            const res = await fetch('/api/events');
            const data = await res.json();
            if (res.ok && data.events && data.events.length > 0) {
                // Sort by date closest to today
                const sorted = data.events.sort((a,b) => new Date(a.date) - new Date(b.date));
                eventsGrid.innerHTML = sorted.map(ev => {
                    const d = new Date(ev.date);
                    const day = d.getDate();
                    const month = d.toLocaleString('default', { month: 'short' });
                    return `
                        <div class="event-card">
                            <div class="event-date">
                                <span class="day">${day}</span>
                                <span class="month">${month}</span>
                            </div>
                            <div class="event-content">
                                <h3>${ev.title}</h3>
                                <p><i class="fas fa-clock"></i> ${ev.time || 'All Day'}</p>
                                ${ev.description ? `<p>${ev.description}</p>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                eventsGrid.innerHTML = '<div style="text-align:center;grid-column:1/-1;color:#aaa;">No upcoming events.</div>';
            }
        } catch(e) {
            console.error('Failed to load events:', e);
        }
    }

    // Load Gallery
    const galleryGrid = document.getElementById('publicGalleryGrid');
    if (galleryGrid) {
        try {
            const res = await fetch('/api/gallery');
            const data = await res.json();
            if (res.ok && data.photos && data.photos.length > 0) {
                galleryGrid.innerHTML = data.photos.slice(0, 8).map(photo => `
                    <div class="gallery-item">
                        <img src="${photo.photoUrl}" alt="${photo.description || 'Gallery image'}" style="width:100%;height:100%;object-fit:cover;">
                        <div class="gallery-overlay">
                            <span>${photo.description || 'Photo'}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                galleryGrid.innerHTML = '<div style="text-align:center;grid-column:1/-1;color:#aaa;">No photos in gallery.</div>';
            }
        } catch(e) {
            console.error('Failed to load gallery:', e);
        }
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', loadPublicData);

// Live Updates via SSE
const sse = new EventSource('/api/live');
sse.addEventListener('gallery_updated', loadPublicData);
sse.addEventListener('events_updated', loadPublicData);

console.log('🕉️ Ganpati Bappa Morya! Website loaded successfully.');