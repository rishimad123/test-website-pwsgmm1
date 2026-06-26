function googleTranslateElementInit() {
    new google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'en,mr',
        autoDisplay: false
    }, 'google_translate_element');
}

window.googleTranslateElementInit = googleTranslateElementInit;

function toggleLanguage() {
    const langMar = document.getElementById('langMar');
    const langEng = document.getElementById('langEng');
    if (!langMar || !langEng) return;
    
    const isMar = langMar.classList.contains('active');
    const targetLang = isMar ? 'en' : 'mr';
    
    // Update toggle UI
    if(isMar) {
        langMar.classList.remove('active');
        langEng.classList.add('active');
    } else {
        langEng.classList.remove('active');
        langMar.classList.add('active');
    }
    
    const select = document.querySelector('.goog-te-combo');
    if (select) {
        select.value = targetLang;
        select.dispatchEvent(new Event('change'));
    }
}

window.toggleLanguage = toggleLanguage;

document.addEventListener('DOMContentLoaded', () => {
    // Check if googtrans cookie exists
    if (document.cookie.indexOf('googtrans=') === -1) {
        // Set default to Marathi
        document.cookie = "googtrans=/en/mr; path=/";
        document.cookie = "googtrans=/en/mr; domain=" + window.location.hostname + "; path=/";
    }

    // Initialize toggle UI based on cookie
    const isMr = document.cookie.includes('/en/mr');
    const langEng = document.getElementById('langEng');
    const langMar = document.getElementById('langMar');
    if (langEng && langMar) {
        if (isMr) {
            langEng.classList.remove('active');
            langMar.classList.add('active');
        } else {
            langMar.classList.remove('active');
            langEng.classList.add('active');
        }
    }

    // Add Google Translate Element container if not exists
    if (!document.getElementById('google_translate_element')) {
        const div = document.createElement('div');
        div.id = 'google_translate_element';
        div.style.display = 'none';
        document.body.appendChild(div);
    }
    
    // Automatically load the Google script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(script);
});
