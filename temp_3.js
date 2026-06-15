(function(){
                  'use strict';

                  fetch('/api/qr-config').then(function(r){return r.json();}).then(function(cfg){
                    if (!cfg) return;
                    if (cfg.mapsUrl) { document.getElementById('qrMapsUrl').value = cfg.mapsUrl; window.qrCfgPreview(); }
                    if (cfg.placeId) document.getElementById('qrPlaceId').value = cfg.placeId;
                    (cfg.reviewTemplates || []).forEach(function(t){ window.qrAddTemplate(t); });
                  }).catch(function(){});

                  window.qrAddTemplate = function(val) {
                    var list = document.getElementById('qrTemplateList');
                    if (!list) return;
                    if (list.children.length >= 10) { alert('Maximum 10 templates allowed.'); return; }
                    var row = document.createElement('div');
                    row.style.cssText = 'display:flex;gap:6px;align-items:center;';
                    var inp = document.createElement('input');
                    inp.type = 'text'; inp.className = 'form-control';
                    inp.placeholder = 'e.g. Amazing festival! Ganpati Bappa Morya 🙏';
                    inp.style.cssText = 'flex:1;font-size:.85rem;';
                    if (val) inp.value = val;
                    var del = document.createElement('button');
                    del.type = 'button'; del.innerHTML = '<i class="fas fa-times"></i>'; del.title = 'Remove';
                    del.style.cssText = 'padding:6px 10px;background:#fee2e2;border:none;border-radius:7px;color:#dc2626;cursor:pointer;flex:0 0 auto;';
                    del.onclick = function(){ list.removeChild(row); };
                    row.appendChild(inp); row.appendChild(del); list.appendChild(row);
                  };

                  window.qrCfgPreview = function() {
                    var urlEl  = document.getElementById('qrMapsUrl');
                    var img    = document.getElementById('qrPreviewImg');
                    var loader = document.getElementById('qrPreviewLoading');
                    var errBox = document.getElementById('qrPreviewError');
                    if (!urlEl || !img) return;
                    var url = urlEl.value.trim();
                    if (!url) return;
                    // Show spinner
                    img.style.display = 'none';
                    if (errBox) errBox.style.display = 'none';
                    if (loader) { loader.style.display = 'flex'; loader.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:1.5rem;color:#ccc;"></i>'; }
                    // Use QR Server API — no JS library required
                    var apiUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=' + encodeURIComponent(url);
                    img.onload = function() {
                      if (loader) loader.style.display = 'none';
                      img.style.display = 'block';
                      if (errBox) errBox.style.display = 'none';
                    };
                    img.onerror = function() {
                      if (loader) loader.style.display = 'none';
                      img.style.display = 'none';
                      if (errBox) errBox.style.display = 'block';
                    };
                    img.src = apiUrl;
                  };

                  window.qrCfgSave = async function() {
                    var url = (document.getElementById('qrMapsUrl')||{}).value||'';
                    var placeId = (document.getElementById('qrPlaceId')||{}).value||'';
                    var templates = [];
                    document.querySelectorAll('#qrTemplateList input[type=text]').forEach(function(i){ var v=i.value.trim(); if(v) templates.push(v); });
                    var btn = document.getElementById('qrSaveBtn');
                    var msg = document.getElementById('qrSaveMsg');
                    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
                    try {
                      var res = await fetch('/api/qr-config', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ mapsUrl:url.trim(), placeId:placeId.trim(), reviewTemplates:templates }) });
                      var data = await res.json();
                      msg.style.display = 'inline';
                      if (data.success) { msg.style.color='#27ae60'; msg.innerHTML='✅ Saved! QR is now live on the landing page.'; }
                      else { msg.style.color='#dc2626'; msg.textContent='Error: '+(data.message||'Unknown'); }
                    } catch(e) { msg.style.display='inline'; msg.style.color='#dc2626'; msg.textContent='Network error.'; }
                    btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save &amp; Publish to Landing Page';
                    setTimeout(function(){ msg.style.display='none'; }, 6000);
                  };
                })();