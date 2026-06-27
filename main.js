// ==================== MOBILE MENU ====================
function _bindMobileMenu() {
    var mobileToggle = document.getElementById('mobileToggle');
    var navMenu      = document.getElementById('navMenu');

    if (!mobileToggle || !navMenu) return; // elements not present on this page

    // Toggle open/close — stopPropagation prevents the document listener
    // from immediately closing the menu on the same click event.
    mobileToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        navMenu.classList.toggle('active');
        mobileToggle.classList.toggle('is-open');
    });

    // Close when tapping outside the navbar
    document.addEventListener('click', function (e) {
        if (navMenu.classList.contains('active') && !e.target.closest('.navbar')) {
            navMenu.classList.remove('active');
            mobileToggle.classList.remove('is-open');
        }
    });

    // Close menu when the user taps a nav link (navigates away)
    navMenu.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
            navMenu.classList.remove('active');
            mobileToggle.classList.remove('is-open');
        });
    });
}

// Run immediately if DOM is already ready, otherwise wait for it
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bindMobileMenu);
} else {
    _bindMobileMenu();
}

// ==================== COUNTDOWN TIMER ====================
let _countdownTarget = new Date('August 23, 2026 10:00:00').getTime(); // default fallback – Ganesh Chaturthi 2026

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
        // Only intercept real in-page anchor links, never external or social links
        if (href && href !== '#' && href.length > 1 && !this.getAttribute('target')) {
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
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

    // ── Gallery image registry (shared between highlights & full gallery) ──
    window._galleryImages = [];
    window._galleryIndex  = 0;

    // Load Gallery Highlights (index.html → publicGalleryGrid)
    const galleryGrid = document.getElementById('publicGalleryGrid');
    if (galleryGrid) {
        try {
            const res  = await fetch('/api/gallery');
            const data = await res.json();
            if (res.ok && data.photos && data.photos.length > 0) {
                const photos = data.photos.slice(0, 9);
                // Merge into registry (highlights always go first)
                photos.forEach(p => {
                    if (!window._galleryImages.find(x => x.url === p.photoUrl)) {
                        window._galleryImages.push({ url: p.photoUrl, desc: p.description || '' });
                    }
                });
                galleryGrid.innerHTML = photos.map(photo => {
                    const idx = window._galleryImages.findIndex(x => x.url === photo.photoUrl);
                    return `<div class="gallery-item" onclick="openPublicLightbox(${idx})" style="cursor:pointer;">
                        <img src="${photo.photoUrl}" alt="${(photo.description || '').replace(/"/g, '&quot;')}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
                        <div class="gallery-overlay"><span>${photo.description || 'Photo'}</span></div>
                    </div>`;
                }).join('');
            } else {
                galleryGrid.innerHTML = '<div style="text-align:center;grid-column:1/-1;color:#aaa;">No photos in gallery.</div>';
            }
        } catch(e) { console.error('Failed to load gallery:', e); }
    }

    // Load Full Gallery (gallery.html → publicFullGalleryGrid)
    const fullGalleryGrid = document.getElementById('publicFullGalleryGrid');
    if (fullGalleryGrid) {
        try {
            const res  = await fetch('/api/gallery');
            const data = await res.json();
            if (res.ok && data.photos && data.photos.length > 0) {
                // Reset registry for the full gallery page (all photos)
                window._galleryImages = data.photos.map(p => ({ url: p.photoUrl, desc: p.description || '' }));
                fullGalleryGrid.innerHTML = data.photos.map((photo, idx) => {
                    return `<div class="gallery-item" onclick="openPublicLightbox(${idx})" style="cursor:pointer;">
                        <img src="${photo.photoUrl}" alt="${(photo.description || '').replace(/"/g, '&quot;')}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
                        <div class="gallery-overlay"><span>${photo.description || 'Photo'}</span></div>
                    </div>`;
                }).join('');
            } else {
                fullGalleryGrid.innerHTML = '<div style="text-align:center;grid-column:1/-1;color:#aaa;">No photos uploaded yet.</div>';
            }
        } catch(e) { console.error('Failed to load full gallery:', e); }
    }

    // Load Sponsor Banners (index.html homepage strip)
    await loadSponsorBanners();
}

// ═══════════════════════════════════════════════════════════
// LIGHTBOX — Google-Photos-style with swipe + arrow keys
// ═══════════════════════════════════════════════════════════
(function () {
    var LB_ID   = 'publicLightbox';
    var _touch0 = null; // touchstart X
    var _kBound = false;

    function _getOrCreate() {
        var lb = document.getElementById(LB_ID);
        if (lb) return lb;

        lb = document.createElement('div');
        lb.id = LB_ID;
        lb.setAttribute('role', 'dialog');
        lb.setAttribute('aria-modal', 'true');
        lb.innerHTML = [
            /* backdrop */
            '<div id="plbBackdrop" style="',
                'position:fixed;inset:0;',
                'background:rgba(0,0,0,0.96);',
                'z-index:99998;',
                'opacity:0;transition:opacity .25s ease;">',
            '</div>',
            /* panel */
            '<div id="plbPanel" style="',
                'position:fixed;inset:0;',
                'z-index:99999;',
                'display:flex;align-items:center;justify-content:center;',
                'flex-direction:column;padding:20px;box-sizing:border-box;">',

                /* close btn */
                '<button id="plbClose" aria-label="Close lightbox" style="',
                    'position:absolute;top:16px;right:20px;',
                    'background:rgba(255,255,255,0.12);border:none;color:#fff;',
                    'font-size:28px;line-height:1;cursor:pointer;',
                    'width:44px;height:44px;border-radius:50%;',
                    'display:flex;align-items:center;justify-content:center;',
                    'transition:background .2s;z-index:2;">',
                    '&times;',
                '</button>',

                /* counter */
                '<div id="plbCounter" style="',
                    'position:absolute;top:22px;left:50%;transform:translateX(-50%);',
                    'color:rgba(255,255,255,0.6);font-size:.8rem;letter-spacing:1px;">',
                '</div>',

                /* prev arrow */
                '<button id="plbPrev" aria-label="Previous image" style="',
                    'position:absolute;left:12px;top:50%;transform:translateY(-50%);',
                    'background:rgba(255,255,255,0.12);border:none;color:#fff;',
                    'font-size:26px;cursor:pointer;',
                    'width:48px;height:48px;border-radius:50%;',
                    'display:flex;align-items:center;justify-content:center;',
                    'transition:background .2s;z-index:2;">',
                    '&#8249;',
                '</button>',

                /* image wrapper */
                '<div id="plbImgWrap" style="',
                    'display:flex;align-items:center;justify-content:center;',
                    'max-width:100%;max-height:80vh;',
                    'transition:opacity .2s ease, transform .2s ease;">',
                    '<img id="plbImg" src="" alt="" style="',
                        'max-width:min(95vw,1200px);max-height:80vh;',
                        'border-radius:10px;',
                        'box-shadow:0 8px 40px rgba(0,0,0,0.7);',
                        'object-fit:contain;display:block;">',
                '</div>',

                /* next arrow */
                '<button id="plbNext" aria-label="Next image" style="',
                    'position:absolute;right:12px;top:50%;transform:translateY(-50%);',
                    'background:rgba(255,255,255,0.12);border:none;color:#fff;',
                    'font-size:26px;cursor:pointer;',
                    'width:48px;height:48px;border-radius:50%;',
                    'display:flex;align-items:center;justify-content:center;',
                    'transition:background .2s;z-index:2;">',
                    '&#8250;',
                '</button>',

                /* caption */
                '<p id="plbDesc" style="',
                    'color:rgba(255,255,255,0.85);',
                    'margin-top:16px;font-size:1rem;',
                    'text-align:center;max-width:800px;line-height:1.5;',
                    'min-height:1.5em;">',
                '</p>',

            '</div>'
        ].join('');
        document.body.appendChild(lb);

        /* ── wire up buttons ── */
        document.getElementById('plbClose').addEventListener('click', _close);
        document.getElementById('plbPrev').addEventListener('click', function(e){ e.stopPropagation(); _navigate(-1); });
        document.getElementById('plbNext').addEventListener('click', function(e){ e.stopPropagation(); _navigate(+1); });

        /* close on backdrop click */
        document.getElementById('plbBackdrop').addEventListener('click', _close);

        /* ── touch / swipe ── */
        var wrap = document.getElementById('plbImgWrap');
        wrap.addEventListener('touchstart', function(e){
            _touch0 = e.touches[0].clientX;
        }, { passive: true });
        wrap.addEventListener('touchend', function(e){
            if (_touch0 === null) return;
            var dx = e.changedTouches[0].clientX - _touch0;
            _touch0 = null;
            if (Math.abs(dx) < 40) return;   // too short = tap, ignore
            _navigate(dx < 0 ? +1 : -1);
        }, { passive: true });
        /* prevent vertical page scroll while swiping inside lightbox */
        wrap.addEventListener('touchmove', function(e){ e.preventDefault(); }, { passive: false });

        /* ── hover effects ── */
        ['plbPrev','plbNext','plbClose'].forEach(function(id){
            var btn = document.getElementById(id);
            btn.addEventListener('mouseenter', function(){ this.style.background='rgba(255,255,255,0.25)'; });
            btn.addEventListener('mouseleave', function(){ this.style.background='rgba(255,255,255,0.12)'; });
        });

        return lb;
    }

    function _show(idx) {
        var imgs = window._galleryImages || [];
        if (!imgs.length) return;
        idx = ((idx % imgs.length) + imgs.length) % imgs.length;
        window._galleryIndex = idx;

        var item   = imgs[idx];
        var imgEl  = document.getElementById('plbImg');
        var descEl = document.getElementById('plbDesc');
        var cntEl  = document.getElementById('plbCounter');
        var wrap   = document.getElementById('plbImgWrap');

        /* fade out, swap, fade in */
        wrap.style.opacity   = '0';
        wrap.style.transform = 'scale(0.96)';
        setTimeout(function(){
            imgEl.src  = item.url;
            imgEl.alt  = item.desc;
            if (descEl) descEl.textContent = item.desc || '';
            if (cntEl)  cntEl.textContent  = (idx + 1) + ' / ' + imgs.length;
            /* hide arrows when only 1 photo */
            var hide = imgs.length <= 1;
            document.getElementById('plbPrev').style.display = hide ? 'none' : 'flex';
            document.getElementById('plbNext').style.display = hide ? 'none' : 'flex';
            wrap.style.opacity   = '1';
            wrap.style.transform = 'scale(1)';
        }, 150);
    }

    function _navigate(dir) { _show(window._galleryIndex + dir); }

    function _open(idx) {
        _getOrCreate();
        /* lock body scroll */
        document.body.style.overflow = 'hidden';
        /* show overlay */
        document.getElementById(LB_ID).style.display = 'block';
        requestAnimationFrame(function(){
            document.getElementById('plbBackdrop').style.opacity = '1';
        });
        _show(idx);
        /* keyboard */
        if (!_kBound) {
            _kBound = true;
            document.addEventListener('keydown', function(e){
                var lb = document.getElementById(LB_ID);
                if (!lb || lb.style.display === 'none') return;
                if (e.key === 'ArrowRight') _navigate(+1);
                if (e.key === 'ArrowLeft')  _navigate(-1);
                if (e.key === 'Escape')     _close();
            });
        }
    }

    function _close() {
        var bd = document.getElementById('plbBackdrop');
        if (bd) bd.style.opacity = '0';
        setTimeout(function(){
            var lb = document.getElementById(LB_ID);
            if (lb) lb.style.display = 'none';
            document.body.style.overflow = '';
        }, 250);
    }

    /* public API */
    window.openPublicLightbox = _open;
    window.closeLightbox      = _close;
})();


// Initialize on DOM load
document.addEventListener('DOMContentLoaded', loadPublicData);

// ==================== LOAD FOOTER DEVELOPER ====================
async function loadFooterDeveloperProfile() {
    try {
        const res = await fetch('/api/developers');
        if (!res.ok) return;
        const data = await res.json();
        const fd = data.footerDeveloper;
        if (!fd || (!fd.name && !fd.photoUrl)) return; // nothing to show

        const fName = document.getElementById('footerDevProfileName');
        const fPos = document.getElementById('footerDevProfilePosition');
        const fPhoto = document.getElementById('footerDevProfilePhoto');
        const fContainer = document.getElementById('footerDevProfileContainer');

        if (fName && fd.name) fName.textContent = fd.name;
        if (fPos && fd.position) fPos.textContent = fd.position;
        if (fPhoto && fd.photoUrl) {
            fPhoto.src = fd.photoUrl;
            fPhoto.style.display = 'block';
        }
        if (fContainer) {
            fContainer.style.display = 'flex';
        }
    } catch(err) {
        console.error('Failed to load footer developer:', err);
    }
}
document.addEventListener('DOMContentLoaded', loadFooterDeveloperProfile);

// ==================== LOAD ADMIN-CONTROLLED SITE SETTINGS ====================
async function loadSiteSettings() {
    try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;
        const s = await res.json();

        // --- Years of Service stat ---
        // Only override the HTML default when the admin has set a real (> 0) value.
        const yosEl = document.getElementById('statYearsOfService');
        if (yosEl && s.yearsOfService !== undefined) {
            const val = parseInt(s.yearsOfService) || 0;
            if (val > 0) {
                yosEl.setAttribute('data-target', val);
                yosEl.textContent = val.toLocaleString();
            }
            // val === 0 → keep the hardcoded HTML default (data-target="25")
        }

        // --- Active Volunteers stat ---
        // Only override the HTML default when the admin has set a real (> 0) value.
        const avEl = document.getElementById('statActiveVolunteers');
        if (avEl && s.activeVolunteers !== undefined) {
            const val = parseInt(s.activeVolunteers) || 0;
            if (val > 0) {
                avEl.setAttribute('data-target', val);
                avEl.textContent = val.toLocaleString();
            }
            // val === 0 → keep the hardcoded HTML default (data-target="150")
        }

        // --- About Section text (index.html) ---
        const aboutTextEl = document.getElementById('aboutSectionText');
        if (aboutTextEl && s.aboutText && s.aboutText.trim()) {
            // Render line breaks as paragraphs
            const paras = s.aboutText.split('\n').filter(l => l.trim());
            aboutTextEl.innerHTML = paras.map(p => `<p>${p}</p>`).join('');
        }

        // --- About Section photo (index.html) ---
        const aboutImg = document.getElementById('aboutSectionImg');
        const aboutSvg = document.getElementById('aboutSectionSvg');
        if (aboutImg && s.aboutPhoto) {
            aboutImg.src = s.aboutPhoto;
            aboutImg.style.display = 'block';
            if (aboutSvg) aboutSvg.style.display = 'none';
        }

        // --- About Page text (about.html) ---
        const aboutPageTextEl = document.getElementById('aboutPageContentText');
        if (aboutPageTextEl && s.aboutPageText && s.aboutPageText.trim()) {
            const paras = s.aboutPageText.split('\n').filter(l => l.trim());
            aboutPageTextEl.innerHTML = paras.map(p => `<p>${p}</p>`).join('');
        }

        // --- About Page photo (about.html) ---
        const aboutPageImg = document.getElementById('aboutPageImg');
        const aboutPageSvg = document.getElementById('aboutPageSvg');
        if (aboutPageImg && s.aboutPagePhoto) {
            aboutPageImg.src = s.aboutPagePhoto;
            aboutPageImg.style.display = 'block';
            if (aboutPageSvg) aboutPageSvg.style.display = 'none';
        }

        // --- Footer Settings ---
        if (s.footerAboutText) {
            const el = document.querySelector('.footer-col p');
            if (el && el.parentElement.querySelector('h3') && el.parentElement.querySelector('h3').textContent.includes('About Us')) {
                el.textContent = s.footerAboutText;
            }
        }
        if (s.contactAddress) {
            const el = document.querySelector('.contact-info li i.fa-map-marker-alt');
            if (el && el.parentElement) el.parentElement.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${s.contactAddress}`;
        }
        if (s.contactPhone) {
            const el = document.querySelector('.contact-info li i.fa-phone');
            if (el && el.parentElement) el.parentElement.innerHTML = `<i class="fas fa-phone"></i> ${s.contactPhone}`;
        }
        if (s.contactEmail) {
            const el = document.querySelector('.contact-info li i.fa-envelope');
            if (el && el.parentElement) el.parentElement.innerHTML = `<i class="fas fa-envelope"></i> ${s.contactEmail}`;
        }
        const formatUrl = (url) => {
            if (!url) return null;
            url = url.trim();
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return 'https://' + url;
            }
            return url;
        };

        // Helper: apply URL to a social link anchor by ID, with full cross-platform safety
        const applySocialLink = (id, url) => {
            const formattedUrl = formatUrl(url);
            if (!formattedUrl) return;
            
            // Apply to all elements with this ID
            const els = document.querySelectorAll(`[id="${id}"]`);
            els.forEach(el => {
                el.href = formattedUrl;
                el.target = '_blank';
                el.rel = 'noopener noreferrer';
            });
            
            // Fallback: find by icon class inside .social-links (if none found by ID)
            if (els.length === 0) {
                const iconClass = {
                    socialFacebookLink: 'fa-facebook',
                    socialInstagramLink: 'fa-instagram',
                    socialYoutubeLink: 'fa-youtube',
                    socialTwitterLink: 'fa-twitter'
                }[id];
                const icons = document.querySelectorAll(`.social-links a i.${iconClass}`);
                icons.forEach(icon => {
                    const el = icon.parentElement;
                    if (el) {
                        el.href = formattedUrl;
                        el.target = '_blank';
                        el.rel = 'noopener noreferrer';
                    }
                });
            }
        };

        if (s.socialFacebook)  applySocialLink('socialFacebookLink',  s.socialFacebook);
        if (s.socialInstagram) {
            applySocialLink('socialInstagramLink', s.socialInstagram);
            applySocialLink('heroInstagramLink', s.socialInstagram);
        }
        if (s.socialYoutube) {
            applySocialLink('socialYoutubeLink', s.socialYoutube);
            applySocialLink('heroYoutubeLink', s.socialYoutube);
            const heroYt = document.getElementById('heroYoutubeLink');
            if (heroYt) heroYt.style.display = 'inline-flex';
            // Hide Committee btn so YouTube takes its grid slot in row 2
            // Committee button now shown explicitly.
        }
        if (s.socialTwitter)   applySocialLink('socialTwitterLink',   s.socialTwitter);

        // Guarantee hero Instagram button always matches the footer icon,
        // even when no admin URL is set (fallback sync from footer element href).
        const heroInstaBtn = document.getElementById('heroInstagramLink');
        const footerInstaIcon = document.getElementById('socialInstagramLink');
        if (heroInstaBtn && footerInstaIcon && footerInstaIcon.href) {
            heroInstaBtn.href = footerInstaIcon.href;
            heroInstaBtn.target = '_blank';
            heroInstaBtn.rel = 'noopener noreferrer';
        }

        // --- YouTube Live Embed ---
        const ytLiveSection = document.getElementById('youtubeLiveSection');
        const ytLiveFrame = document.getElementById('youtubeLiveFrame');
        if (ytLiveSection && ytLiveFrame && s.youtubeLiveLink && s.youtubeLiveLink.trim()) {
            let embedUrl = s.youtubeLiveLink.trim();
            // Convert watch link to embed link if necessary
            if (embedUrl.includes('watch?v=')) {
                const videoId = new URL(embedUrl).searchParams.get('v');
                if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
            } else if (embedUrl.includes('youtu.be/')) {
                const videoId = embedUrl.split('youtu.be/')[1].split('?')[0];
                if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
            } else if (embedUrl.includes('/live/')) {
                const videoId = embedUrl.split('/live/')[1].split('?')[0];
                if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
            }
            ytLiveFrame.src = embedUrl;
            ytLiveSection.style.display = 'block';
        } else if (ytLiveSection) {
            ytLiveSection.style.display = 'none';
        }

        // --- T-shirt Showcase Grid ---
        const tshirtGrid = document.getElementById('tshirtShowcaseGrid');
        if (tshirtGrid) {
            let html = '';
            const photos = (s.tshirtPhotos || []).filter(p => p && p.trim());
            photos.forEach((photoUrl, i) => {
                html += `<div class="tshirt-photo-item"><img src="${photoUrl}" alt="T-shirt ${i+1}" onerror="this.parentElement.style.display='none'"></div>`;
            });
            tshirtGrid.innerHTML = html;
        }

    } catch(e) {
        console.warn('Failed to load site settings:', e.message);
    }
}

document.addEventListener('DOMContentLoaded', loadSiteSettings);


// ==================== SPONSOR BANNERS (Homepage Strip) ====================
async function loadSponsorBanners() {
    const section = document.getElementById('sponsorBannersSection');
    const row     = document.getElementById('sponsorBannersRow');
    if (!section || !row) return;
    try {
        const res  = await fetch('/api/sponsors');
        if (!res.ok) return;
        const data = await res.json();
        const active = (data.sponsors || [])
            .filter(s => s.active !== false && s.bannerUrl)
            .slice(0, 5);

        if (!active.length) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        row.innerHTML = active.map(s => {
            const flex = active.length === 1 ? '0 0 min(520px,90vw)' :
                         active.length === 2 ? '1 1 min(420px,44vw)' :
                         '1 1 min(300px,28vw)';
            return `
            <a href="sponsors.html#sponsor-${s.id}" title="${s.name}" style="
                flex:${flex};
                min-width:200px;
                max-width:520px;
                border-radius:16px;
                overflow:hidden;
                display:block;
                border:2px solid rgba(217,119,6,0.25);
                box-shadow:0 6px 24px rgba(0,0,0,0.35);
                transition:transform .3s ease,box-shadow .3s ease;
                text-decoration:none;
            "
            onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 36px rgba(0,0,0,0.5)'"
            onmouseout="this.style.transform='';this.style.boxShadow='0 6px 24px rgba(0,0,0,0.35)'">
                <img src="${s.bannerUrl}" alt="${s.name} banner"
                     style="width:100%;height:160px;object-fit:cover;display:block;">
                <div style="background:rgba(26,7,0,0.85);padding:10px 14px;display:flex;align-items:center;gap:10px;">
                    ${s.photoUrl ? `<img src="${s.photoUrl}" alt="${s.name}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid rgba(217,119,6,0.5);">` : ''}
                    <span style="color:#FCD34D;font-weight:600;font-size:.85rem;font-family:'Inter',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.name}</span>
                </div>
            </a>`;
        }).join('');
    } catch(e) {
        console.warn('Could not load sponsor banners:', e.message);
    }
}

// Live Updates via SSE
const sse = new EventSource('/api/live-updates');
window.sse = sse;
sse.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        if (data.type === 'events_updated' || data.type === 'gallery_updated') {
            loadPublicData();
        }
        if (data.type === 'settings_updated') {
            loadSiteSettings();
        }
        if (data.type === 'sponsors_updated') {
            loadSponsorBanners();
        }
    } catch(e) {}
};
sse.addEventListener('gallery_updated', loadPublicData);
sse.addEventListener('events_updated', loadPublicData);
sse.addEventListener('settings_updated', loadSiteSettings);
sse.addEventListener('sponsors_updated', loadSponsorBanners);

console.log('\u1F549\uFE0F Ganpati Bappa Morya! Website loaded successfully.');