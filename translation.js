/**
 * translation.js – Stable bilingual (English / Marathi) system
 *
 * Rules:
 *   1. Only ONE GoogleTranslateElementInit call, ever.
 *   2. Default language: Marathi (mr)
 *   3. Language choice persists via localStorage + googtrans cookie.
 *   4. No setInterval, no MutationObserver loops, no duplicate listeners.
 *   5. GT banner / toolbar is completely suppressed via CSS (in style.css)
 *      plus one-time DOM cleanup after GT loads.
 */

(function () {
    'use strict';

    /* ── Guard: ensure this runs only once, even if translation.js is somehow
       included more than once in a page ── */
    if (window.__translationInitialized) return;
    window.__translationInitialized = true;

    // ── Constants ────────────────────────────────────────────────────────────
    var LS_KEY   = 'preferredLang';   // localStorage key
    var DEFAULT  = 'mr';              // Marathi by default
    var COOKIE   = 'googtrans';

    // ── Read stored preference ───────────────────────────────────────────────
    function getStoredLang() {
        try {
            var ls = localStorage.getItem(LS_KEY);
            if (ls === 'en' || ls === 'mr') return ls;
        } catch (e) {}
        // Fall back to cookie
        var m = document.cookie.match(/(?:^|;)\s*googtrans=\/en\/([^;]+)/);
        if (m) return (m[1] === 'mr') ? 'mr' : 'en';
        return DEFAULT;
    }

    // ── Write googtrans cookie (required by Google Translate) ────────────────────
    function setGoogCookie(lang) {
        var host = window.location.hostname;
        if (lang === 'mr') {
            // Set to Marathi translation
            document.cookie = COOKIE + '=/en/mr; path=/; SameSite=Lax';
            if (host && host !== 'localhost' && host !== '127.0.0.1') {
                document.cookie = COOKIE + '=/en/mr; domain=' + host + '; path=/; SameSite=Lax';
            }
        } else {
            // Delete the cookie so GT shows original English
            document.cookie = COOKIE + '=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
            if (host && host !== 'localhost' && host !== '127.0.0.1') {
                document.cookie = COOKIE + '=; domain=' + host + '; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
            }
        }
    }

    // ── Persist language choice ──────────────────────────────────────────────
    function saveLang(lang) {
        try { localStorage.setItem(LS_KEY, lang); } catch (e) {}
        setGoogCookie(lang);
    }

    // ── Update the ENG/MAR toggle UI ─────────────────────────────────────────
    function updateToggleUI(lang) {
        var langEng = document.getElementById('langEng');
        var langMar = document.getElementById('langMar');
        if (!langEng || !langMar) return;
        if (lang === 'mr') {
            langEng.classList.remove('active');
            langMar.classList.add('active');
        } else {
            langMar.classList.remove('active');
            langEng.classList.add('active');
        }
    }

    // ── Apply translation via the GT combo select ─────────────────────────────
    function applyLang(lang) {
        var select = document.querySelector('.goog-te-combo');
        if (!select) return false;
        if (lang === 'en') {
            // Switching back to English: GT's "restore original" is triggered
            // by selecting the blank/empty option and firing both change + input events
            select.value = '';
            select.dispatchEvent(new Event('change'));
            select.dispatchEvent(new Event('input'));
            // Also try clicking the select to force GT to process it
            setTimeout(function() {
                if (select.value !== '') {
                    select.value = '';
                    select.dispatchEvent(new Event('change'));
                }
            }, 200);
        } else {
            // Switching to Marathi
            select.value = 'mr';
            select.dispatchEvent(new Event('change'));
        }
        return true;
    }

    // ── Suppress Google Translate banner / toolbar DOM elements ──────────────
    function suppressGTBanner() {
        // Hide the banner frame
        var banner = document.querySelector('.goog-te-banner-frame');
        if (banner) banner.style.cssText = 'display:none!important;visibility:hidden!important';

        // Reset body.top that Google forces
        if (document.body) document.body.style.top = '0px';
        if (document.documentElement) {
            document.documentElement.style.marginTop = '0px';
            document.documentElement.style.minHeight = '';
        }

        // Hide the skiptranslate iframes
        var skips = document.querySelectorAll('.skiptranslate');
        for (var i = 0; i < skips.length; i++) {
            skips[i].style.cssText = 'display:none!important;visibility:hidden!important';
        }
    }

    // ── Called once when GT has finished loading ─────────────────────────────
    function onGTReady(lang) {
        suppressGTBanner();

        // If English is selected, page is already in English — nothing to do
        if (lang === 'en') {
            setTimeout(suppressGTBanner, 500);
            return;
        }

        // Marathi: wait for GT combo to render then apply
        var attempts = 0;
        function tryApply() {
            attempts++;
            if (applyLang(lang)) {
                // Success – do one final suppression after GT settles
                setTimeout(suppressGTBanner, 500);
                return;
            }
            if (attempts < 20) {
                setTimeout(tryApply, 150);
            }
        }
        tryApply();
    }

    // ── Google Translate element init callback (global, called by GT script) ──
    // Overwrite any previously defined version to avoid duplicates.
    window.googleTranslateElementInit = function () {
        // Prevent double-init if GT script fires callback twice
        if (window.__gtElementCreated) return;
        window.__gtElementCreated = true;

        var lang = getStoredLang();

        new google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'en,mr',
            autoDisplay: false
        }, 'google_translate_element');

        onGTReady(lang);
    };

    // ── Public: toggle called by ENG/MAR buttons ──────────────────────────────
    window.toggleLanguage = function () {
        var langMar = document.getElementById('langMar');
        if (!langMar) return;

        var currentLang = getStoredLang();
        var newLang = (currentLang === 'mr') ? 'en' : 'mr';

        // Save preference BEFORE reload so the new page picks it up
        saveLang(newLang);
        updateToggleUI(newLang);

        var select = document.querySelector('.goog-te-combo');
        if (!select) {
            // GT not loaded yet – reload; cookie carries the preference
            window.location.reload();
            return;
        }

        if (newLang === 'en') {
            // For English restore, a page reload is the most reliable method.
            // The cookie is already set to /en/en above, so GT won't translate on reload.
            window.location.reload();
        } else {
            // Switch to Marathi in-place
            applyLang('mr');
        }
    };

    // ── Initialise on DOM ready ───────────────────────────────────────────────
    function init() {
        var lang = getStoredLang();

        // Ensure cookie is set (for GT to pick up on load)
        setGoogCookie(lang);

        // Set toggle UI immediately (no flicker)
        updateToggleUI(lang);

        // Add hidden GT container if not already present
        if (!document.getElementById('google_translate_element')) {
            var div = document.createElement('div');
            div.id = 'google_translate_element';
            div.style.cssText = 'display:none!important;width:0;height:0;overflow:hidden';
            document.body.appendChild(div);
        }

        // Load the GT script only once
        if (!document.getElementById('gt-script') && !window.__gtScriptLoaded) {
            window.__gtScriptLoaded = true;
            var script = document.createElement('script');
            script.id  = 'gt-script';
            script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            script.async = true;
            document.body.appendChild(script);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
