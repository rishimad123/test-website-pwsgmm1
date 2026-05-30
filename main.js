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
let _countdownTarget = new Date('September 19, 2025 10:00:00').getTime(); // default fallback

function updateCountdown() {
    const now = new Date().getTime();
    const distance = _countdownTarget - now;
    
    if (distance > 0) {
        const days    = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours   = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        if (document.getElementById('days')) {
            document.getElementById('days').textContent    = String(days).padStart(2, '0');
            document.getElementById('hours').textContent   = String(hours).padStart(2, '0');
            document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
            document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
        }
    } else {
        if (document.getElementById('days')) {
            document.getElementById('days').textContent    = '00';
            document.getElementById('hours').textContent   = '00';
            document.getElementById('minutes').textContent = '00';
            document.getElementById('seconds').textContent = '00';
        }
    }
}

if (document.getElementById('countdown')) {
    // Fetch admin-configured countdown date from settings
    fetch('/api/settings')
        .then(r => r.json())
        .then(data => {
            const isoDate = (data && (data.countdownDate || data.eventDate)) || null;
            if (isoDate) {
                const parsed = new Date(isoDate).getTime();
                if (!isNaN(parsed)) _countdownTarget = parsed;
            }
        })
        .catch(() => {}) // silently fall back to default
        .finally(() => {
            updateCountdown();
            setInterval(updateCountdown, 1000);
        });
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

    // Load Gallery (Highlights on index.html)
    const galleryGrid = document.getElementById('publicGalleryGrid');
    if (galleryGrid) {
        try {
            const res = await fetch('/api/gallery');
            const data = await res.json();
            if (res.ok && data.photos && data.photos.length > 0) {
                // Exactly 9 photos in the highlights
                galleryGrid.innerHTML = data.photos.slice(0, 9).map(photo => `
                    <div class="gallery-item" onclick="openPublicLightbox('${photo.photoUrl.replace(/'/g, "\\'")}', '${(photo.description || '').replace(/'/g, "\\'")}')" style="cursor:pointer;">
                        <img src="${photo.photoUrl}" alt="${(photo.description || '').replace(/"/g, '&quot;')}" style="width:100%;height:100%;object-fit:cover;">
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

    // Load Full Gallery (gallery.html)
    const fullGalleryGrid = document.getElementById('publicFullGalleryGrid');
    if (fullGalleryGrid) {
        try {
            const res = await fetch('/api/gallery');
            const data = await res.json();
            if (res.ok && data.photos && data.photos.length > 0) {
                // All photos
                fullGalleryGrid.innerHTML = data.photos.map(photo => `
                    <div class="gallery-item" onclick="openPublicLightbox('${photo.photoUrl.replace(/'/g, "\\'")}', '${(photo.description || '').replace(/'/g, "\\'")}')" style="cursor:pointer;">
                        <img src="${photo.photoUrl}" alt="${(photo.description || '').replace(/"/g, '&quot;')}" style="width:100%;height:100%;object-fit:cover;">
                        <div class="gallery-overlay">
                            <span>${photo.description || 'Photo'}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                fullGalleryGrid.innerHTML = '<div style="text-align:center;grid-column:1/-1;color:#aaa;">No photos uploaded yet.</div>';
            }
        } catch(e) {
            console.error('Failed to load full gallery:', e);
        }
    }
}

// Lightbox logic for public gallery
window.openPublicLightbox = function(url, desc) {
    let lb = document.getElementById('publicLightbox');
    if (!lb) {
        lb = document.createElement('div');
        lb.id = 'publicLightbox';
        lb.innerHTML = `
            <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:10000;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:20px;box-sizing:border-box;">
                <span style="position:absolute;top:20px;right:30px;color:white;font-size:40px;cursor:pointer;line-height:1;" onclick="document.getElementById('publicLightbox').style.display='none'">&times;</span>
                <img id="plbImg" src="" style="max-width:100%;max-height:80vh;border-radius:10px;box-shadow:0 5px 25px rgba(0,0,0,0.5);object-fit:contain;">
                <p id="plbDesc" style="color:white;margin-top:20px;font-size:1.1rem;text-align:center;max-width:800px;line-height:1.4;"></p>
            </div>
        `;
        document.body.appendChild(lb);
    }
    document.getElementById('plbImg').src = url;
    document.getElementById('plbDesc').textContent = desc || '';
    lb.style.display = 'block';
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', loadPublicData);

// Live Updates via SSE
const sse = new EventSource('/api/live-updates');
sse.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        if (data.type === 'events_updated' || data.type === 'gallery_updated') {
            loadPublicData();
        }
    } catch(e) {}
};
sse.addEventListener('gallery_updated', loadPublicData);
sse.addEventListener('events_updated', loadPublicData);

console.log('🕉️ Ganpati Bappa Morya! Website loaded successfully.');