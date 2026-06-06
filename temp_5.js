function googleTranslateElementInit() {
            new google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: 'en,mr',
                autoDisplay: false
            }, 'google_translate_element');
        }

        function toggleLanguage() {
            const isMar = document.getElementById('langMar').classList.contains('active');
            const targetLang = isMar ? 'en' : 'mr';
            
            // Update toggle UI
            if(isMar) {
                document.getElementById('langMar').classList.remove('active');
                document.getElementById('langEng').classList.add('active');
            } else {
                document.getElementById('langEng').classList.remove('active');
                document.getElementById('langMar').classList.add('active');
            }
            
            // Trigger Google Translate
            const select = document.querySelector('.goog-te-combo');
            if (select) {
                select.value = targetLang;
                select.dispatchEvent(new Event('change'));
            }
        }