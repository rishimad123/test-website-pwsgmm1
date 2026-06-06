function googleTranslateElementInit() {
            new google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: 'en,mr',
                autoDisplay: false
            }, 'google_translate_element');
        }
        // Force hide the banner asynchronously just in case CSS fails
        setInterval(function() {
            var frames = document.getElementsByClassName('goog-te-banner-frame');
            for(var i=0; i<frames.length; i++) { frames[i].style.display = 'none'; frames[i].style.visibility = 'hidden'; }
            if (document.body && document.body.style.top !== '0px') document.body.style.top = '0px';
            if (document.documentElement && document.documentElement.style.marginTop !== '0px') document.documentElement.style.marginTop = '0px';
        }, 300);
        function toggleLanguage() {
            const isMar = document.getElementById('langMar').classList.contains('active');
            const targetLang = isMar ? 'en' : 'mr';
            
            if(isMar) {
                document.getElementById('langMar').classList.remove('active');
                document.getElementById('langEng').classList.add('active');
            } else {
                document.getElementById('langEng').classList.remove('active');
                document.getElementById('langMar').classList.add('active');
            }
            
            const select = document.querySelector('.goog-te-combo');
            if (select) {
                select.value = targetLang;
                select.dispatchEvent(new Event('change'));
            }
        }