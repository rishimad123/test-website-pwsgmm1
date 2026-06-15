(function(){
  "use strict";
  var _editId = null;
  
  // Captures the actual live #ade_rcg_receipt element (exactly as displayed on screen)
  window._uploadReceiptPreview = async function(entryId, name, amount, dateRaw, payMode, rcptNo, bookNo, statusLabel) {
      if(!entryId) return;

      var rcptEl = document.getElementById('ade_rcg_receipt');
      var wrapEl = document.getElementById('ade_rcg_wrapper');
      if (!rcptEl) return;

      // Pre-compute display values
      var amtNum  = Number(amount) || 0;
      var amtFmt  = amtNum > 0 ? '\u20b9\u00a0' + amtNum.toLocaleString('en-IN') : '';
      var dateStr = '', yearStr = '';
      if (dateRaw) {
          var dp = dateRaw.split('-');
          dateStr = (dp[2]||'') + '/' + (dp[1]||'') + '/' + (dp[0]||'');
          if (window._receiptYear) {
              yearStr = window._receiptYear;
          } else {
              var yr = parseInt(dp[0], 10), mo = parseInt(dp[1], 10);
              yearStr = mo >= 4 ? yr + '-' + String(yr+1).slice(2) : (yr-1) + '-' + String(yr).slice(2);
          }
      }
      var rcptLabel = (bookNo && rcptNo) ? bookNo+'/'+rcptNo : (rcptNo || bookNo || '\u2014');
      var words = (amtNum > 0 && typeof window.ade_rcg_amtToWords === 'function') ? window.ade_rcg_amtToWords(amtNum) : '';

      return new Promise(function(resolve) {
          function doCapture() {
              // Save wrapper state and all receipt span innerHTML
              var prevWrapDisplay = wrapEl ? wrapEl.style.display : '';
              var ids = ['ade_rcg_r_year','ade_rcg_r_rcptno','ade_rcg_r_date','ade_rcg_r_donor','ade_rcg_r_words','ade_rcg_r_amt'];
              var modeEl = document.getElementById('ade_rcg_r_mode');
              var saved = {};
              ids.forEach(function(id) { var el=document.getElementById(id); if(el) saved[id]=el.innerHTML; });
              var savedMode = modeEl ? modeEl.textContent : '';

              // Make wrapper visible for capture
              if (wrapEl && wrapEl.style.display === 'none') wrapEl.style.display = 'block';

              // Populate receipt spans (same format as ade_rcg_liveSync)
              function setEl(id, html) { var el=document.getElementById(id); if(el) el.innerHTML=html; }
              setEl('ade_rcg_r_year',   yearStr   || '<span style="color:#CCC;font-style:italic;">__</span>');
              setEl('ade_rcg_r_rcptno', rcptLabel || '<span style="color:#CCC;font-style:italic;">___</span>');
              setEl('ade_rcg_r_date',   dateStr   || '<span style="color:#CCC;font-style:italic;">___________</span>');
              setEl('ade_rcg_r_donor',  name      ? '<span style="font-weight:700;color:#111;">'+name+'</span>' : '<span style="color:#CCC;font-style:italic;font-weight:400;">__________________________</span>');
              setEl('ade_rcg_r_words',  words     ? '<span style="color:#222;">'+words+'</span>'               : '<span style="color:#CCC;font-style:italic;font-weight:400;">______________________________</span>');
              setEl('ade_rcg_r_amt',    amtFmt    ? '<span style="font-weight:700;color:#8B1A1A;">'+amtFmt+'</span>' : '<span style="color:#CCC;font-style:italic;font-weight:400;">\u20b9</span>');
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

  window.ade_rcg_saveSnapshot = async function(entryId){
    if(!entryId) return;
    var dt=document.getElementById("adeDonorType"),dn="";
    if(dt&&dt.value==="Business"){dn=(document.getElementById("adeBusinessName")||{}).value||"";
    }else{var fn=(document.getElementById("adeFirstName")||{}).value||"",mn=(document.getElementById("adeMiddleName")||{}).value||"",ln=(document.getElementById("adeLastName")||{}).value||"";dn=[fn,mn,ln].filter(Boolean).join(" ");}
    var snap={donorName:dn.trim().toUpperCase(),amount:parseFloat((document.getElementById("adeAmount")||{}).value)||null,receiptDate:(document.getElementById("adeReceiptDate")||{}).value||null,receiptNo:(document.getElementById("adeReceiptNumber")||{}).value||"",bookNo:(document.getElementById("adeBookNumber")||{}).value||"",paymentMode:(document.getElementById("adePaymentMode")||{}).value||"Cash",savedAt:new Date().toISOString(),savedBy:"Admin"};
    try{await fetch("/api/donation-entries/"+encodeURIComponent(entryId),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({_isAdmin:true,receiptDate:snap.receiptDate,receiptSnapshot:snap})});}catch(e){console.warn("[ade_rcg] snapshot save failed:",e.message);}
    // Upload HD preview image (captured from the actual receipt element on screen)
    var pm = document.getElementById("adePaymentMode")?document.getElementById("adePaymentMode").value:"Cash";
    var rno = document.getElementById("adeReceiptNumber")?document.getElementById("adeReceiptNumber").value:"";
    var bno = document.getElementById("adeBookNumber")?document.getElementById("adeBookNumber").value:"";
    var sl = (pm==="Balance"?"BALANCE":"RECEIVED");
    await _uploadReceiptPreview(entryId, snap.donorName, snap.amount, snap.receiptDate, pm, rno, bno, sl);
  };
  window.ade_rcg_openEditModal = function(entryId){
    var e=(_adeAll||[]).find(function(x){return x.entryId===entryId;});
    if(!e){if(typeof showNotification==="function")showNotification("Entry not found.","error");return;}
    _editId=entryId;
    var dn=e.donorType==="Business"?(e.businessName||""):[e.firstName,e.middleName,e.lastName].filter(Boolean).join(" ");
    if(e.receiptSnapshot&&e.receiptSnapshot.donorName)dn=e.receiptSnapshot.donorName;
    var amt=e.receiptSnapshot&&e.receiptSnapshot.amount!=null?e.receiptSnapshot.amount:(e.amount||"");
    var dt=e.receiptSnapshot&&e.receiptSnapshot.receiptDate?e.receiptSnapshot.receiptDate:(e.receiptDate||"");
    var st=e.status||(e.paymentMode==="Balance"?"Balance":"Received");
    var g=function(id){return document.getElementById(id);};
    if(g("ade_rcg_editName"))g("ade_rcg_editName").value=dn;
    if(g("ade_rcg_editAmount"))g("ade_rcg_editAmount").value=amt;
    if(g("ade_rcg_editDate"))g("ade_rcg_editDate").value=dt;
    if(g("ade_rcg_editStatus"))g("ade_rcg_editStatus").value=st;
    if(g("ade_rcg_editReason"))g("ade_rcg_editReason").value="";
    if(g("ade_rcg_editSubtitle"))g("ade_rcg_editSubtitle").textContent=(e.bookNumber&&e.receiptNumber?"Book "+e.bookNumber+" / Receipt #"+e.receiptNumber:entryId);
    var hb=g("ade_rcg_editHistoryBox"),hist=e.receiptHistory||[];
    if(hb){if(hist.length){hb.style.display="block";hb.innerHTML="<strong style='color:#E65100;'><i class='fas fa-history'></i> Edit History</strong>"+hist.map(function(h){var ch=Object.keys(h.changes||{}).map(function(k){return k+": "+h.changes[k].from+" \u2192 "+h.changes[k].to;}).join(", ");return"<div style='margin-top:4px;border-top:1px solid #ffe0b2;padding-top:4px;'>"+new Date(h.editedAt).toLocaleString("en-IN")+" by "+h.editedBy+(ch?"<br>"+ch:"")+(h.reason?"<br><em>"+h.reason+"</em>":"")+"</div>";}).join("");}else{hb.style.display="none";}}
    if(g("ade_rcg_editStatusMsg"))g("ade_rcg_editStatusMsg").style.display="none";
    var m=g("ade_rcg_editModal");if(m)m.style.display="flex";
  };
  window.ade_rcg_closeEditModal=function(){_editId=null;var m=document.getElementById("ade_rcg_editModal");if(m)m.style.display="none";};
  window.ade_rcg_submitReceiptEdit=async function(ev){
    ev.preventDefault();if(!_editId)return;
    var g=function(id){return document.getElementById(id)||{};};
    var dn=(g("ade_rcg_editName").value||"").trim(),amt=parseFloat(g("ade_rcg_editAmount").value)||null,dt=(g("ade_rcg_editDate").value||"").trim(),st=g("ade_rcg_editStatus").value||"Received",rs=(g("ade_rcg_editReason").value||"").trim();
    if(!dn){if(typeof showNotification==="function")showNotification("Please enter the donor name.","error");return;}
    var e=(_adeAll||[]).find(function(x){return x.entryId===_editId;});
    var btn=document.getElementById("ade_rcg_editSaveBtn");if(btn){btn.disabled=true;btn.innerHTML="<i class='fas fa-spinner fa-spin'></i> Saving\u2026";}
    try{
      var res=await fetch("/api/donation-entries/"+encodeURIComponent(_editId)+"/receipt",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({donorName:dn,amount:amt,receiptDate:dt,status:st,reason:rs,editedBy:"Admin"})});
      var data=await res.json();
      if(res.ok&&data.success){
        var idx=(_adeAll||[]).findIndex(function(x){return x.entryId===_editId;});
        if(idx>=0&&data.entry)_adeAll[idx]=data.entry;
        if(typeof adeRenderCards==="function")adeRenderCards();
        if(typeof showNotification==="function")showNotification("Receipt updated!","success");
        var doWA=confirm("Receipt saved! Re-send updated receipt via WhatsApp?");
        ade_rcg_closeEditModal();
        if(doWA){var ph=(e?(e.whatsappNumber||e.mobileNumber||""):"").replace(/\D/g,"");if(ph.length===10)ph="91"+ph;var pts=dt?dt.split("-"):[];var ds=pts.length===3?(pts[2]+"/"+pts[1]+"/"+pts[0]):"";var rl=e?(e.bookNumber&&e.receiptNumber?e.bookNumber+"/"+e.receiptNumber:(e.receiptNumber||"")):"";var msg=["\uD83D\uDE4F *\u0936\u094D\u0930\u0940 \u092A\u0924\u0947\u0932\u0935\u093E\u0921\u0940 \u0938\u093E\u0930\u094D\u0935\u091C\u0928\u093F\u0915 \u0917\u0923\u0947\u0936\u094B\u0924\u094D\u0938\u0935 \u092E\u0902\u0921\u0933*","\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501","\uD83D\uDCCB *Receipt No:* "+(rl||"\u2014"),"\uD83D\uDC64 *Donor:* "+(dn||"\u2014"),"\uD83D\uDCB0 *Amount:* \u20B9"+(amt?Number(amt).toLocaleString("en-IN"):"\u2014"),"\uD83D\uDCC5 *Date:* "+(ds||"\u2014"),"\uD83D\uDCB3 *Payment:* "+(e?e.paymentMode:""),"\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501","\u2705 *UPDATED RECEIPT*","_Shree Patelwadi Sarvjanik Ganeshostav Mandal_"].join("\n");var url=ph?"https://wa.me/"+ph+"?text="+encodeURIComponent(msg):"https://wa.me/?text="+encodeURIComponent(msg);window.open(url,"_blank");}
      }else{var sm=document.getElementById("ade_rcg_editStatusMsg");if(sm){sm.style.display="block";sm.style.background="#FFEBEE";sm.style.color="#C62828";sm.textContent="\u2717 "+(data.message||"Could not save.");}}
    }catch(err){if(typeof showNotification==="function")showNotification("Network error: "+err.message,"error");}
    finally{if(btn){btn.disabled=false;btn.innerHTML="<i class='fas fa-save'></i> Save & Re-send";}}
  };
  document.addEventListener("click",function(ev){var m=document.getElementById("ade_rcg_editModal");if(m&&ev.target===m)ade_rcg_closeEditModal();});
})();