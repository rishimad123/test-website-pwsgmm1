(function() {
    'use strict';

    // ── Amount → English words (Indian system) ─────────────────────────────
    function de_rcg_amtToWords(num) {
        if (!num || isNaN(num) || num <= 0) return '';
        num = Math.round(num);
        const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
                      'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
                      'Seventeen','Eighteen','Nineteen'];
        const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
        function h(n) {
            if (!n) return '';
            if (n < 20) return ones[n];
            if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' '+ones[n%10] : '');
            return ones[Math.floor(n/100)]+' Hundred'+(n%100 ? ' '+h(n%100) : '');
        }
        let r = '', n = num;
        if (n >= 10000000) { r += h(Math.floor(n/10000000))+' Crore '; n %= 10000000; }
        if (n >= 100000)   { r += h(Math.floor(n/100000))+' Lakh ';   n %= 100000;   }
        if (n >= 1000)     { r += h(Math.floor(n/1000))+' Thousand '; n %= 1000;      }
        r += h(n);
        return r.trim() + ' Only';
    }
    // Expose to window so the second IIFE (receipt uploader) can use it
    window.de_rcg_amtToWords = de_rcg_amtToWords;

    // ── Set a receipt field ─────────────────────────────────────────────────
    function de_rcg_set(id, html) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = html;
    }

    // ── Master sync — reads all form fields and paints the receipt ──────────
    window.de_rcg_liveSync = function() {
        var wrapper = document.getElementById('de_rcg_wrapper');
        if (!wrapper) return;

        // Donor name
        var donorType = document.getElementById('deDonorType')?.value || 'Individual';
        var name = '';
        if (donorType === 'Business') {
            name = (document.getElementById('deBusinessName')?.value || '').trim();
        } else {
            var fn = (document.getElementById('deFirstName')?.value   || '').trim();
            var mn = (document.getElementById('deMiddleName')?.value  || '').trim();
            var ln = (document.getElementById('deLastName')?.value    || '').trim();
            name = [fn, mn, ln].filter(Boolean).join(' ');
        }

        var amount    = parseFloat(document.getElementById('deAmount')?.value) || 0;
        var rcptNo    = document.getElementById('deReceiptNumber')?.value || '';
        var bookNo    = document.getElementById('deBookNumber')?.value || '';
        var payMode   = document.getElementById('dePaymentMode')?.value || 'Cash';
        var dateRaw   = document.getElementById('deReceiptDate')?.value || '';

        // Show the wrapper only when at least a name or amount is entered
        var hasData = name || amount > 0;
        wrapper.style.display = hasData ? 'block' : 'none';
        if (!hasData) return;

        // Year from date
        var yearStr = '';
        var formattedDate = '';
        if (dateRaw) {
            var parts = dateRaw.split('-');
            if (parts.length === 3) {
                var yy = parts[0], mm = parts[1], dd = parts[2];
                formattedDate = dd + '/' + mm + '/' + yy;
                // Fiscal year e.g. 2025-26
                var yr = parseInt(yy, 10);
                var mo = parseInt(mm, 10);
                if (window._receiptYear) {
                    yearStr = window._receiptYear;
                } else if (mo >= 4) {
                    yearStr = yr + '-' + String(yr + 1).slice(2);
                } else {
                    yearStr = (yr - 1) + '-' + String(yr).slice(2);
                }
            }
        }

        // Composite receipt label: Book-Receipt
        var rcptLabel = '';
        if (bookNo && rcptNo) rcptLabel = bookNo + ' / ' + rcptNo;
        else if (rcptNo)      rcptLabel = rcptNo;
        else if (bookNo)      rcptLabel = bookNo;

        // Amount words
        var words = amount > 0 ? de_rcg_amtToWords(amount) : '';
        var amtFmt = amount > 0 ? ('₹\u00a0' + Number(amount).toLocaleString('en-IN')) : '';

        // Paint receipt fields
        de_rcg_set('de_rcg_r_year',   yearStr   || '<span style="color:#CCC;font-style:italic;">__</span>');
        de_rcg_set('de_rcg_r_rcptno', rcptLabel || '<span style="color:#CCC;font-style:italic;">___</span>');
        de_rcg_set('de_rcg_r_date',   formattedDate || '<span style="color:#CCC;font-style:italic;">___________</span>');
        de_rcg_set('de_rcg_r_donor',  name
            ? '<span style="font-weight:700;color:#111;">'+name+'</span>'
            : '<span style="color:#CCC;font-style:italic;font-weight:400;">__________________________</span>');
        de_rcg_set('de_rcg_r_words',  words
            ? '<span style="color:#222;">'+words+'</span>'
            : '<span style="color:#CCC;font-style:italic;font-weight:400;">______________________________</span>');
        de_rcg_set('de_rcg_r_amt',    amtFmt
            ? '<span style="font-weight:700;color:#8B1A1A;">'+amtFmt+'</span>'
            : '<span style="color:#CCC;font-style:italic;font-weight:400;">₹</span>');

        var modeEl = document.getElementById('de_rcg_r_mode');
        if (modeEl) modeEl.textContent = payMode ? ('(' + payMode + ')') : '';
    };

    // ── Wire all form fields to trigger live sync ───────────────────────────
    function de_rcg_wireListeners() {
        var ids = ['deFirstName','deMiddleName','deLastName','deBusinessName',
                   'deAmount','deReceiptNumber','deBookNumber','deReceiptDate'];
        ids.forEach(function(id) {
            var el = document.getElementById(id);
            if (el && !el._de_rcg_bound) {
                el._de_rcg_bound = true;
                el.addEventListener('input',  window.de_rcg_liveSync);
                el.addEventListener('change', window.de_rcg_liveSync);
            }
        });

        // Payment mode buttons — they update a hidden input, so watch that too
        var pmEl = document.getElementById('dePaymentMode');
        if (pmEl && !pmEl._de_rcg_bound) {
            pmEl._de_rcg_bound = true;
            // MutationObserver for value changes on hidden input
            var obs = new MutationObserver(window.de_rcg_liveSync);
            obs.observe(pmEl, { attributes: true, attributeFilter: ['value'] });
            // Also intercept the existing deSetMode clicks
            var origSetMode = window.deSetMode;
            if (typeof origSetMode === 'function') {
                window.deSetMode = function(mode) {
                    origSetMode(mode);
                    window.de_rcg_liveSync();
                };
            }
        }

        // Donor type change — also triggers sync
        var dtEl = document.getElementById('deDonorType');
        if (dtEl && !dtEl._de_rcg_bound_dt) {
            dtEl._de_rcg_bound_dt = true;
            var origSetDonorType = window.deSetDonorType;
            if (typeof origSetDonorType === 'function') {
                window.deSetDonorType = function(type) {
                    origSetDonorType(type);
                    window.de_rcg_liveSync();
                };
            }
        }

        // Set today as default date if blank
        var dateEl = document.getElementById('deReceiptDate');
        if (dateEl && !dateEl.value) {
            var t = new Date();
            dateEl.value = t.getFullYear() + '-'
                + String(t.getMonth()+1).padStart(2,'0') + '-'
                + String(t.getDate()).padStart(2,'0');
            window.de_rcg_liveSync();
        }
    }

    // ── Re-wire every time the form section becomes visible ────────────────────
    var _origShowSection = window.showSection;
    document.addEventListener('DOMContentLoaded', function() {
        // Try to wrap showSection if it exists
        function tryWrapToggle() {
            if (typeof window.showSection === 'function' && window.showSection !== _patchedShowSection) {
                var _prev = window.showSection;
                window.showSection = _patchedShowSection = function(secId) {
                    _prev(secId);
                    if(secId === 'donationEntry') {
                        setTimeout(de_rcg_wireListeners, 100);
                    }
                };
            }
        }
        var _patchedShowSection = null;
        tryWrapToggle();
        
        // Also wire via MutationObserver on donationEntry visibility
        var formCard = document.getElementById('donationEntry');
        if (formCard) {
            var obs = new MutationObserver(function(muts) {
                muts.forEach(function(m) {
                    if (m.attributeName === 'style' && formCard.style.display !== 'none') {
                        de_rcg_wireListeners();
                    }
                });
            });
            obs.observe(formCard, { attributes: true, attributeFilter: ['style'] });
        }
        // Retry wrapping showSection (it may be defined after DOMContentLoaded)
        setTimeout(tryWrapToggle, 500);
        setTimeout(tryWrapToggle, 1500);
        
        // Ensure it's wired if already visible on load
        if(formCard && formCard.style.display !== 'none') {
            setTimeout(de_rcg_wireListeners, 100);
        }
    });

    // ── HD WhatsApp send ────────────────────────────────────────────────────
    window.de_rcg_sendWhatsApp = function() {
        var name = '';
        var donorType = document.getElementById('deDonorType')?.value || 'Individual';
        if (donorType === 'Business') {
            name = (document.getElementById('deBusinessName')?.value || '').trim();
        } else {
            var fn = (document.getElementById('deFirstName')?.value  || '').trim();
            var mn = (document.getElementById('deMiddleName')?.value || '').trim();
            var ln = (document.getElementById('deLastName')?.value   || '').trim();
            name = [fn, mn, ln].filter(Boolean).join(' ');
        }
        var amount  = parseFloat(document.getElementById('deAmount')?.value) || 0;
        var rcptNo  = document.getElementById('deReceiptNumber')?.value || '';
        var bookNo  = document.getElementById('deBookNumber')?.value || '';
        var dateRaw = document.getElementById('deReceiptDate')?.value || '';
        var payMode = document.getElementById('dePaymentMode')?.value || 'Cash';
        // Prefer WhatsApp number, fallback to mobile
        var phone   = (document.getElementById('deWhatsapp')?.value || '').replace(/\D/g,'');
        if (!phone) phone = (document.getElementById('deMobile')?.value || '').replace(/\D/g,'');
        if (phone.length === 10) phone = '91' + phone; // prefix India code

        if (!name && amount <= 0) {
            if (typeof showNotification === 'function')
                showNotification('Please fill in at least the donor name and amount.', 'error');
            else
                alert('Please fill in at least the donor name and amount.');
            return;
        }

        var btn = document.getElementById('de_rcg_wa_btn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating HD Image…'; }

        function doCapture() {
            var el = document.getElementById('de_rcg_receipt');
            if (!el) { if (btn) { btn.disabled=false; btn.innerHTML='<i class="fab fa-whatsapp"></i> Send Receipt via WhatsApp'; } return; }

            html2canvas(el, {
                scale: 3,            // ← HD: 3× resolution
                backgroundColor: null,
                useCORS: true,
                logging: false,
                allowTaint: true
            }).then(function(canvas) {
                // Build the WhatsApp text message as a fallback / caption
                var amtFmt = Number(amount).toLocaleString('en-IN');
                var dateStr = '';
                if (dateRaw) {
                    var pts = dateRaw.split('-');
                    dateStr = (pts[2]||'')+'/'+(pts[1]||'')+'/'+(pts[0]||'');
                }
                var rcptLabel = bookNo && rcptNo ? bookNo+'/'+rcptNo : (rcptNo || bookNo || '—');

                var msg = [
                    '🙏 *श्री पटेलवाडी सार्वजनिक गणेशोत्सव मंडळ*',
                    '━━━━━━━━━━━━━━━━━━━━━',
                    '📋 *Receipt No:* ' + rcptLabel,
                    '👤 *Donor:* ' + (name || '—'),
                    '💰 *Amount:* ₹' + amtFmt,
                    '📅 *Date:* ' + (dateStr || '—'),
                    '💳 *Payment:* ' + payMode,
                    '━━━━━━━━━━━━━━━━━━━━━',
                    'धन्यवाद! रोख/चेक मिळाले. 🙏',
                    '_Shree Patelwadi Sarvjanik Ganeshostav Mandal_'
                ].join('\n');

                var encoded = encodeURIComponent(msg);
                var waUrl   = phone
                    ? 'https://wa.me/' + phone + '?text=' + encoded
                    : 'https://wa.me/?text=' + encoded;

                // Also trigger PNG download (HD receipt image)
                var link = document.createElement('a');
                link.download = 'receipt_' + (name || 'donor').replace(/[^a-z0-9]/gi,'_').toLowerCase() + '_' + Date.now() + '.png';
                link.href = canvas.toDataURL('image/png');
                link.click();

                // Small delay then open WhatsApp
                setTimeout(function() {
                    window.open(waUrl, '_blank');
                }, 400);

                if (btn) { btn.disabled=false; btn.innerHTML='<i class="fab fa-whatsapp" style="font-size:1.1rem;"></i> Send Receipt via WhatsApp'; }
            }).catch(function(err) {
                console.error('[de_rcg] html2canvas error:', err);
                if (typeof showNotification === 'function')
                    showNotification('Could not render receipt image. Please try again.', 'error');
                else
                    alert('Could not render receipt image.');
                if (btn) { btn.disabled=false; btn.innerHTML='<i class="fab fa-whatsapp" style="font-size:1.1rem;"></i> Send Receipt via WhatsApp'; }
            });
        }

        // Lazy-load html2canvas if not already available
        if (typeof html2canvas !== 'undefined') {
            doCapture();
        } else {
            var s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
            s.onload  = doCapture;
            s.onerror = function() {
                if (typeof showNotification === 'function')
                    showNotification('Could not load image library. Check internet connection.', 'error');
                else
                    alert('Could not load image library.');
                if (btn) { btn.disabled=false; btn.innerHTML='<i class="fab fa-whatsapp" style="font-size:1.1rem;"></i> Send Receipt via WhatsApp'; }
            };
            document.head.appendChild(s);
        }
    };

})();