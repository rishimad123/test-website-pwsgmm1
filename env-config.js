/**
 * env-config.js
 * Global API Interceptor for Firebase Hosting
 * 
 * This script intercepts all API calls (fetch, EventSource, window.open, and images)
 * and dynamically routes them to the Render backend when the site is hosted on Firebase.
 * It ignores localhost and render environments so local development is untouched.
 */
(function() {
    var host = window.location.hostname;
    
    // Activate proxy ONLY if not running locally and not directly on Render backend
    if (host !== 'localhost' && host !== '127.0.0.1' && !host.includes('onrender.com')) {
        
        var BACKEND = 'https://test-website-pwsgmm1.onrender.com';
        
        // 1. Intercept `fetch` calls
        var origFetch = window.fetch;
        window.fetch = function() {
            var args = Array.prototype.slice.call(arguments);
            if (typeof args[0] === 'string') {
                if (args[0].startsWith('/api/')) args[0] = BACKEND + args[0];
                if (args[0].startsWith('/uploads/')) args[0] = BACKEND + args[0];
            } else if (args[0] instanceof Request) {
                if (args[0].url.startsWith('/api/') || args[0].url.startsWith('/uploads/')) {
                    args[0] = new Request(BACKEND + new URL(args[0].url).pathname, args[0]);
                }
            }
            return origFetch.apply(this, args);
        };

        // 2. Intercept `EventSource` (for live updates)
        var OrigEventSource = window.EventSource;
        window.EventSource = function(url, init) {
            if (typeof url === 'string' && (url.startsWith('/api/') || url.startsWith('/uploads/'))) {
                url = BACKEND + url;
            }
            return new OrigEventSource(url, init);
        };

        // 3. Intercept `window.open` (for PDFs and HD receipts)
        var origWindowOpen = window.open;
        window.open = function(url, name, specs) {
            if (typeof url === 'string' && (url.startsWith('/api/') || url.startsWith('/uploads/'))) {
                url = BACKEND + url;
            }
            return origWindowOpen.call(window, url, name, specs);
        };

        // 4. Expose a helper for inline HTML image fixing
        window.fixUrl = function(url) {
            if (!url) return url;
            if (url.startsWith('/api/') || url.startsWith('/uploads/')) {
                return BACKEND + url;
            }
            return url;
        };
        
        // 5. Use MutationObserver to auto-fix src attributes for images (e.g., local fallbacks)
        document.addEventListener('DOMContentLoaded', function() {
            function fixNode(node) {
                if (node.tagName === 'IMG' && node.getAttribute('src')) {
                    var src = node.getAttribute('src');
                    if (src.startsWith('/api/') || src.startsWith('/uploads/')) {
                        node.setAttribute('src', BACKEND + src);
                    }
                }
                if (node.querySelectorAll) {
                    node.querySelectorAll('img[src^="/api/"], img[src^="/uploads/"]').forEach(function(img) {
                        img.setAttribute('src', BACKEND + img.getAttribute('src'));
                    });
                }
            }
            
            // Fix existing nodes on load
            fixNode(document.body);
            
            // Observe future dynamically injected nodes
            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(function(node) {
                            if (node.nodeType === 1) fixNode(node);
                        });
                    } else if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                        var src = mutation.target.getAttribute('src');
                        if (src && (src.startsWith('/api/') || src.startsWith('/uploads/'))) {
                            mutation.target.setAttribute('src', BACKEND + src);
                        }
                    }
                });
            });
            observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
        });
    } else {
        // Dummy fallback for local dev
        window.fixUrl = function(url) { return url; };
    }
})();
