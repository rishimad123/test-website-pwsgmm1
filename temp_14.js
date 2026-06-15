(function(){
  "use strict";
  var _deEditId=null,_deEntriesCache=[];
  // ── Receipt Preview Image Uploader ──
  // Captures the actual live #de_rcg_receipt element (exactly as displayed on screen)
  window._deUploadReceiptPreview = async function(entryId, name, amount, dateRaw, payMode, rcptNo, bookNo, statusLabel) {
      if(!entryId) return;

      var rcptEl = document.getElementById('de_rcg_receipt');
      var wrapEl = document.getElementById('de_rcg_wrapper');
      if (!rcptEl) return;

      // Pre-compute display values
      var amtNum  = Number(amount) || 0;
      var amtFmt  = amtNum > 0 ? '\u20b9\u00a0' + amtNum.toLocaleString('en-IN') : '';
      var dateStr = '', yearStr = '';
      if (dateRaw) {
          var dp = dateRaw.split('-');
          dateStr = (dp[2]||'') + '/' + (dp[1]||'') + '/' + (dp[0]||'');
          var yr = parseInt(dp[0], 10), mo = parseInt(dp[1], 10);
          yearStr = window._receiptYear || (mo >= 4 ? yr + '-' + String(yr+1).slice(2) : (yr-1) + '-' + String(yr).slice(2));
      }
      var rcptLabel = (bookNo && rcptNo) ? bookNo+'/'+rcptNo : (rcptNo || bookNo || '\u2014');
      var words = (amtNum > 0 && typeof window.de_rcg_amtToWords === 'function') ? window.de_rcg_amtToWords(amtNum) : '';

      return new Promise(function(resolve) {
          function doCapture() {
              // Save wrapper state and all receipt span innerHTML
              var prevWrapDisplay = wrapEl ? wrapEl.style.display : '';
              var ids = ['de_rcg_r_year','de_rcg_r_rcptno','de_rcg_r_date','de_rcg_r_donor','de_rcg_r_words','de_rcg_r_amt'];
              var modeEl = document.getElementById('de_rcg_r_mode');
              var saved = {};
              ids.forEach(function(id) { var el=document.getElementById(id); if(el) saved[id]=el.innerHTML; });
              var savedMode = modeEl ? modeEl.textContent : '';

              // Make wrapper visible for capture
              if (wrapEl && wrapEl.style.display === 'none') wrapEl.style.display = 'block';

              // Populate receipt spans (same format as de_rcg_liveSync)
              function setEl(id, html) { var el=document.getElementById(id); if(el) el.innerHTML=html; }
              setEl('de_rcg_r_year',   yearStr   || '<span style="color:#CCC;font-style:italic;">__</span>');
              setEl('de_rcg_r_rcptno', rcptLabel || '<span style="color:#CCC;font-style:italic;">___</span>');
              setEl('de_rcg_r_date',   dateStr   || '<span style="color:#CCC;font-style:italic;">___________</span>');
              setEl('de_rcg_r_donor',  name      ? '<span style="font-weight:700;color:#111;">'+name+'</span>' : '<span style="color:#CCC;font-style:italic;font-weight:400;">__________________________</span>');
              setEl('de_rcg_r_words',  words     ? '<span style="color:#222;">'+words+'</span>'               : '<span style="color:#CCC;font-style:italic;font-weight:400;">______________________________</span>');
              setEl('de_rcg_r_amt',    amtFmt    ? '<span style="font-weight:700;color:#8B1A1A;">'+amtFmt+'</span>' : '<span style="color:#CCC;font-style:italic;font-weight:400;">\u20b9</span>');
              if (modeEl) modeEl.textContent = payMode ? '(' + payMode + ')' : '';

              // Capture the actual receipt element at 3x HD (same as WhatsApp send)
              html2canvas(rcptEl, { scale: 3, backgroundColor: null, useCORS: true, logging: false, allowTaint: true })
              .then(function(canvas) {
                  // Restore spans and wrapper
                  ids.forEach(function(id) { var el=document.getElementById(id); if(el&&saved[id]!==undefined) el.innerHTML=saved[id]; });
                  if (modeEl) modeEl.textContent = savedMode;
                  if (wrapEl) wrapEl.style.display = prevWrapDisplay;

                  canvas.toBlob(async function(blob) {
                      if (!blob) return resolve();
                      var fd = new FormData();
                      fd.append('receiptImage', blob, 'preview.png');
                      fd.append('entryId', entryId);
                      try { await fetch('/api/upload-receipt-preview', { method:'POST', body:fd }); } catch(e){}
                      resolve();
                  }, 'image/png');
              }).catch(function() {
                  // Restore on error
                  ids.forEach(function(id) { var el=document.getElementById(id); if(el&&saved[id]!==undefined) el.innerHTML=saved[id]; });
                  if (modeEl) modeEl.textContent = savedMode;
                  if (wrapEl) wrapEl.style.display = prevWrapDisplay;
                  resolve();
              });
          }
          if (typeof html2canvas !== 'undefined') doCapture();
          else {
              var s = document.createElement('script');
              s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
              s.onload = doCapture; s.onerror = resolve;
              document.head.appendChild(s);
          }
      });
  };

  window.de_rcg_saveSnapshot=async function(entryId){
    if(!entryId)return;
    var dt=document.getElementById("deDonorType"),dn="";
    if(dt&&dt.value==="Business"){dn=(document.getElementById("deBusinessName")||{}).value||"";}
    else{var fn=(document.getElementById("deFirstName")||{}).value||"",mn=(document.getElementById("deMiddleName")||{}).value||"",ln=(document.getElementById("deLastName")||{}).value||"";dn=[fn,mn,ln].filter(Boolean).join(" ");}
    var snap={donorName:dn.trim().toUpperCase(),amount:parseFloat((document.getElementById("deAmount")||{}).value)||null,receiptDate:(document.getElementById("deReceiptDate")||{}).value||null,receiptNo:(document.getElementById("deReceiptNumber")||{}).value||"",bookNo:(document.getElementById("deBookNumber")||{}).value||"",paymentMode:(document.getElementById("dePaymentMode")||{}).value||"Cash",savedAt:new Date().toISOString(),savedBy:(currentUser?currentUser.name:"Volunteer")};
    try{await fetch("/api/donation-entries/"+encodeURIComponent(entryId),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({_isAdmin:false,receiptDate:snap.receiptDate,receiptSnapshot:snap})});}catch(e){console.warn("[de_rcg] snapshot save failed:",e.message);}
    // Upload HD preview image
    var pm = document.getElementById("dePaymentMode")?document.getElementById("dePaymentMode").value:"Cash";
    var rno = document.getElementById("deReceiptNumber")?document.getElementById("deReceiptNumber").value:"";
    var bno = document.getElementById("deBookNumber")?document.getElementById("deBookNumber").value:"";
    var sl = (pm==="Balance"?"BALANCE":"RECEIVED");
    await _deUploadReceiptPreview(entryId, dn, snap.amount, snap.receiptDate, pm, rno, bno, sl);
  };
  window.de_rcg_openEditModal=function(entryId){
    fetch("/api/donation-entries?year="+(window._adminSelectedYear || 'active')+"&userId="+(currentUser?currentUser.id:"")).then(function(r){return r.json();}).then(function(data){
      var e=(data.entries||[]).find(function(x){return x.entryId===entryId;});
      if(!e){if(typeof showNotification==="function")showNotification("Entry not found.","error");return;}
      _deEditId=entryId;_deEntriesCache=data.entries||[];
      var dn=e.donorType==="Business"?(e.businessName||""):[e.firstName,e.middleName,e.lastName].filter(Boolean).join(" ");
      if(e.receiptSnapshot&&e.receiptSnapshot.donorName)dn=e.receiptSnapshot.donorName;
      var amt=e.receiptSnapshot&&e.receiptSnapshot.amount!=null?e.receiptSnapshot.amount:(e.amount||"");
      var dt=e.receiptSnapshot&&e.receiptSnapshot.receiptDate?e.receiptSnapshot.receiptDate:(e.receiptDate||"");
      var st=e.status||(e.paymentMode==="Balance"?"Balance":"Received");
      var g=function(id){return document.getElementById(id);};
      if(g("de_rcg_editName"))g("de_rcg_editName").value=dn;
      if(g("de_rcg_editAmount"))g("de_rcg_editAmount").value=amt;
      if(g("de_rcg_editDate"))g("de_rcg_editDate").value=dt;
      if(g("de_rcg_editStatus"))g("de_rcg_editStatus").value=st;
      if(g("de_rcg_editReason"))g("de_rcg_editReason").value="";
      if(g("de_rcg_editSubtitle"))g("de_rcg_editSubtitle").textContent=(e.bookNumber&&e.receiptNumber?"Book "+e.bookNumber+" / Receipt #"+e.receiptNumber:entryId);
      var hb=g("de_rcg_editHistoryBox"),hist=e.receiptHistory||[];
      if(hb){if(hist.length){hb.style.display="block";hb.innerHTML="<strong style='color:#E65100;'><i class='fas fa-history'></i> Edit History</strong>"+hist.map(function(h){return"<div style='margin-top:4px;border-top:1px solid #ffe0b2;padding-top:4px;'>"+new Date(h.editedAt).toLocaleString("en-IN")+" by "+h.editedBy+(h.reason?"<br><em>"+h.reason+"</em>":"")+"</div>";}).join("");}else{hb.style.display="none";}}
      if(g("de_rcg_editStatusMsg"))g("de_rcg_editStatusMsg").style.display="none";
      var m=g("de_rcg_editModal");if(m)m.style.display="flex";
    }).catch(function(){if(typeof showNotification==="function")showNotification("Could not load entry.","error");});
  };
  window.de_rcg_closeEditModal=function(){_deEditId=null;var m=document.getElementById("de_rcg_editModal");if(m)m.style.display="none";};
  window.de_rcg_submitReceiptEdit=async function(ev){
    ev.preventDefault();if(!_deEditId)return;
    var g=function(id){return document.getElementById(id)||{};};
    var dn=(g("de_rcg_editName").value||"").trim(),amt=parseFloat(g("de_rcg_editAmount").value)||null,dt=(g("de_rcg_editDate").value||"").trim(),st=g("de_rcg_editStatus").value||"Received",rs=(g("de_rcg_editReason").value||"").trim();
    if(!dn){if(typeof showNotification==="function")showNotification("Please enter the donor name.","error");return;}
    var e=(_deEntriesCache||[]).find(function(x){return x.entryId===_deEditId;});
    var btn=document.getElementById("de_rcg_editSaveBtn");if(btn){btn.disabled=true;btn.innerHTML="<i class='fas fa-spinner fa-spin'></i> Saving…";}
    try{
      var res=await fetch("/api/donation-entries/"+encodeURIComponent(_deEditId)+"/receipt",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({donorName:dn,amount:amt,receiptDate:dt,status:st,reason:rs,editedBy:(currentUser?currentUser.name:"Volunteer")})});
      var data=await res.json();
      if(res.ok&&data.success){
        if(typeof deLoadMyEntries==="function")deLoadMyEntries();
        if(btn){btn.innerHTML="<i class='fas fa-spinner fa-spin'></i> Saving Image…";} await _deUploadReceiptPreview(_deEditId, dn, amt, dt, e?e.paymentMode:"Cash", e?e.receiptNumber:"", e?e.bookNumber:"", st.toUpperCase()); if(typeof showNotification==="function")showNotification("Receipt updated!","success");
        var doWA=confirm("Receipt saved! Re-send via WhatsApp?");
        de_rcg_closeEditModal();
        if(doWA){var ph=(e?(e.whatsappNumber||e.mobileNumber||""):"").replace(/\D/g,"");if(ph.length===10)ph="91"+ph;var pts=dt?dt.split("-"):[];var ds=pts.length===3?(pts[2]+"/"+pts[1]+"/"+pts[0]):"";var rl=e?(e.bookNumber&&e.receiptNumber?e.bookNumber+"/"+e.receiptNumber:(e.receiptNumber||"")):"";var msg=["\uD83D\uDE4F *\u0936\u094D\u0930\u0940 \u092A\u0924\u0947\u0932\u0935\u093E\u0921\u0940 \u0938\u093E\u0930\u094D\u0935\u091C\u0928\u093F\u0915 \u0917\u0923\u0947\u0936\u094B\u0924\u094D\u0938\u0935 \u092E\u0902\u0921\u0933*","\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501","\uD83D\uDCCB *Receipt No:* "+(rl||"\u2014"),"\uD83D\uDC64 *Donor:* "+(dn||"\u2014"),"\uD83D\uDCB0 *Amount:* \u20B9"+(amt?Number(amt).toLocaleString("en-IN"):"\u2014"),"\uD83D\uDCC5 *Date:* "+(ds||"\u2014"),"\uD83D\uDCB3 *Payment:* "+(e?e.paymentMode:""),"\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501","\u2705 *UPDATED RECEIPT* \u2014 \u0927\u0928\u094D\u092F\u0935\u093E\u0926! \uD83D\uDE4F","_Shree Patelwadi Sarvjanik Ganeshostav Mandal_"].join("\n");var url=ph?"https://wa.me/"+ph+"?text="+encodeURIComponent(msg):"https://wa.me/?text="+encodeURIComponent(msg);window.open(url,"_blank");}
      }else{var sm=document.getElementById("de_rcg_editStatusMsg");if(sm){sm.style.display="block";sm.style.background="#FFEBEE";sm.style.color="#C62828";sm.textContent="\u2717 "+(data.message||"Could not save.");}}
    }catch(err){if(typeof showNotification==="function")showNotification("Network error: "+err.message,"error");}
    finally{if(btn){btn.disabled=false;btn.innerHTML="<i class='fas fa-save'></i> Save & Re-send";}}
  };
  document.addEventListener("click",function(ev){var m=document.getElementById("de_rcg_editModal");if(m&&ev.target===m)de_rcg_closeEditModal();});
})();