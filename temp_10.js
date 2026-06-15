(function(){
'use strict';
var _contribs=[],_loaded=false;
function fmtAmt(n){return '\u20b9'+Number(n).toLocaleString('en-IN',{minimumFractionDigits:0});}
function fmtDate(iso){if(!iso)return '\u2014';var p=iso.split('-');return p.length!==3?iso:p[2]+'/'+p[1]+'/'+p[0];}
function monthKey(iso){return iso?iso.slice(0,7):'0000-00';}
function monthLabel(yyyymm){var m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];var p=yyyymm.split('-');return m[parseInt(p[1],10)-1]+' '+p[0];}
async function contribLoad(){
  try{var res=await fetch('/api/contributors');var data=await res.json();
  _contribs=(data.contributors||[]).sort(function(a,b){return b.date.localeCompare(a.date);});
  _loaded=true;contribUpdateStats();contribRender();}catch(e){console.error('[Contributions] Load error:',e.message);}
}
function contribUpdateStats(){
  var total=0,count=_contribs.length,names=new Set();
  var now=new Date(),thisMonth=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  var monthTotal=0;
  _contribs.forEach(function(c){total+=c.amount||0;names.add((c.name||'').toLowerCase().trim());if(monthKey(c.date)===thisMonth)monthTotal+=c.amount||0;});
  function el(id){return document.getElementById(id);}
  if(el('contrib-stat-total-amt'))el('contrib-stat-total-amt').textContent=fmtAmt(total);
  if(el('contrib-stat-count'))el('contrib-stat-count').textContent=count;
  if(el('contrib-stat-contributors'))el('contrib-stat-contributors').textContent=names.size;
  if(el('contrib-stat-this-month'))el('contrib-stat-this-month').textContent=fmtAmt(monthTotal);
}
window.contribRender=function(){
  var search=((document.getElementById('contrib-search')||{}).value||'').toLowerCase().trim();
  var filtered=search?_contribs.filter(function(c){return(c.name||'').toLowerCase().includes(search)||(c.note||'').toLowerCase().includes(search);}):_contribs;
  var tbody=document.getElementById('contrib-tbody'),tbl=document.getElementById('contrib-tbl'),empty=document.getElementById('contrib-empty');
  if(!tbody)return;
  if(filtered.length===0){if(tbl)tbl.style.display='none';if(empty)empty.style.display='block';return;}
  if(tbl)tbl.style.display='table';if(empty)empty.style.display='none';
  
  // Aggregate by contributor name
  var groups={};
  filtered.forEach(function(c){
    var n = (c.name||'').trim().toUpperCase();
    if(!groups[n]) groups[n] = { name: (c.name||'').trim(), total:0, months: Array(12).fill(0) };
    
    // Parse month from date (YYYY-MM-DD)
    var mMatch = (c.date||'').match(/-(\d{2})-/);
    if(mMatch) {
      var mIdx = parseInt(mMatch[1], 10) - 1;
      if(mIdx >= 0 && mIdx <= 11) {
        groups[n].months[mIdx] += (c.amount||0);
        groups[n].total += (c.amount||0);
      }
    }
  });
  
  var sortedNames = Object.keys(groups).sort(function(a,b){return a.localeCompare(b);});
  var rows='',rowIdx=1;
  
  sortedNames.forEach(function(nKey){
    var g = groups[nKey];
    var monthCells = '';
    g.months.forEach(function(amt) {
      monthCells += '<td style="font-size:0.85rem;color:'+(amt>0?'#1565C0':'#ccc')+'">' + (amt>0?fmtAmt(amt):'-') + '</td>';
    });
    
    rows += '<tr><td style="color:#aaa;font-size:.78rem;">'+(rowIdx++)+'</td>' +
            '<td class="contrib-name" style="font-weight:600;">'+g.name.replace(/</g,'&lt;')+'</td>' +
            monthCells +
            '<td style="font-weight:bold;color:#1B5E20;font-size:.9rem;">'+fmtAmt(g.total)+'</td>' +
            '<td style="white-space:nowrap;">' +
              '<button class="contrib-edit-btn" title="Edit" onclick="contribEditModalOpen(\''+g.name.replace(/'/g,"\\'")+'\')" style="margin-right:6px;background:none;border:none;color:#3949AB;cursor:pointer;"><i class="fas fa-edit"></i></button>' +
              '<button class="contrib-del-btn" title="Delete All" onclick="contribDeleteAll(\''+g.name.replace(/'/g,"\\'")+'\')" style="background:none;border:none;color:#C62828;cursor:pointer;"><i class="fas fa-trash-alt"></i></button>' +
            '</td></tr>';
  });
  
  tbody.innerHTML=rows;
};

window.contribEditModalOpen=function(name){
  var groups={};
  _contribs.forEach(function(c){
    var n = (c.name||'').trim().toUpperCase();
    if(!groups[n]) groups[n] = { name: (c.name||'').trim(), months: Array(12).fill(0) };
    var mMatch = (c.date||'').match(/-(\d{2})-/);
    if(mMatch) {
      var mIdx = parseInt(mMatch[1], 10) - 1;
      if(mIdx >= 0 && mIdx <= 11) groups[n].months[mIdx] += (c.amount||0);
    }
  });
  
  var g = groups[name.toUpperCase()];
  if(!g) return;
  
  document.getElementById('cemOriginalName').value = g.name;
  document.getElementById('cemName').value = g.name;
  for(var i=1; i<=12; i++) {
    document.getElementById('cemMonth'+i).value = g.months[i-1] || '';
  }
  
  document.getElementById('contribEditModal').classList.add('active');
};

window.contribEditModalClose=function(){
  document.getElementById('contribEditModal').classList.remove('active');
};

window.contribSubmitEdit=async function(ev){
  ev.preventDefault();
  var origName = document.getElementById('cemOriginalName').value;
  var newName = document.getElementById('cemName').value.trim();
  
  var amounts = {};
  for(var i=1; i<=12; i++) {
    var val = document.getElementById('cemMonth'+i).value;
    amounts[String(i).padStart(2, '0')] = Number(val) || 0;
  }
  
  var btn = document.getElementById('cemSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  
  try {
    var res = await fetch('/api/contributors-bulk', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalName: origName, newName: newName, monthlyAmounts: amounts })
    });
    var data = await res.json();
    if(res.ok && data.success) {
      contribEditModalClose();
      await contribLoad();
      if(typeof showNotification==='function') showNotification('Contributor updated successfully!', 'success');
    } else {
      alert(data.message || 'Could not update.');
    }
  } catch(e) {
    alert('Network error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
  }
};

window.contribDeleteAll=async function(name){
  if(!confirm('Delete ALL contributions for "' + name + '"? This cannot be undone.')) return;
  
  var toDelete = _contribs.filter(function(c){ return (c.name||'').trim().toUpperCase() === name.toUpperCase(); });
  var deletedCount = 0;
  for(var i=0; i<toDelete.length; i++){
    try {
      var res = await fetch('/api/contributors/'+encodeURIComponent(toDelete[i].id), { method:'DELETE' });
      if(res.ok) deletedCount++;
    } catch(e){}
  }
  if(deletedCount>0) {
    await contribLoad();
    if(typeof showNotification==='function') showNotification('Deleted ' + deletedCount + ' records.', 'success');
  }
};

window.contribAdd=async function(){
  var name=((document.getElementById('contrib-name')||{}).value||'');
  var amount=((document.getElementById('contrib-amount')||{}).value||'');
  var date=((document.getElementById('contrib-date')||{}).value||'');
  var note=((document.getElementById('contrib-note')||{}).value||'');
  var msg=document.getElementById('contrib-form-msg'),btn=document.getElementById('contrib-add-btn');
  function setMsg(txt,ok){if(!msg)return;msg.textContent=txt;msg.style.color=ok?'#059669':'#C62828';if(txt)setTimeout(function(){msg.textContent='';},3500);}
  if(!name.trim()){setMsg('\u26a0 Please enter a contributor name.',false);return;}
  if(!amount||Number(amount)<=0){setMsg('\u26a0 Please enter a valid amount.',false);return;}
  if(!date){setMsg('\u26a0 Please select a date.',false);return;}
  if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Saving\u2026';}
  try{
    var res=await fetch('/api/contributors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim(),amount:Number(amount),date:date,note:note.trim()})});
    var data=await res.json();
    if(res.ok&&data.success){
      _contribs.unshift(data.entry);_contribs.sort(function(a,b){return b.date.localeCompare(a.date);});
      contribUpdateStats();contribRender();
      document.getElementById('contrib-name').value='';document.getElementById('contrib-amount').value='';document.getElementById('contrib-note').value='';
      setMsg('\u2713 Contribution added successfully!',true);
    }else{setMsg('\u2717 '+(data.message||'Could not save.'),false);}
  }catch(e){setMsg('\u2717 Network error: '+e.message,false);}
  finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-plus"></i> Add Contribution';}}
};
window.contribDelete=async function(id){
  if(!confirm('Delete this contribution record? This cannot be undone.'))return;
  try{
    var res=await fetch('/api/contributors/'+encodeURIComponent(id),{method:'DELETE'});
    var data=await res.json();
    if(res.ok&&data.success){_contribs=_contribs.filter(function(c){return c.id!==id;});contribUpdateStats();contribRender();if(typeof showNotification==='function')showNotification('Contribution record deleted.','success');}
    else{if(typeof showNotification==='function')showNotification(data.message||'Delete failed.','error');}
  }catch(e){if(typeof showNotification==='function')showNotification('Network error: '+e.message,'error');}
};
window.contribExportExcel=function(){
  if(_contribs.length===0){alert('No contribution records to export.');return;}
  if(typeof XLSX==='undefined'){alert('Excel library not loaded. Please refresh the page.');return;}
  
  var rows=[['#','Contributor Name','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Total (₹)']];
  var groups={};
  _contribs.forEach(function(c){
    var n = (c.name||'').trim().toUpperCase();
    if(!groups[n]) groups[n] = { name: (c.name||'').trim(), total:0, months: Array(12).fill(0) };
    var mMatch = (c.date||'').match(/-(\d{2})-/);
    if(mMatch) {
      var mIdx = parseInt(mMatch[1], 10) - 1;
      if(mIdx >= 0 && mIdx <= 11) {
        groups[n].months[mIdx] += (c.amount||0);
        groups[n].total += (c.amount||0);
      }
    }
  });
  
  var sortedNames=Object.keys(groups).sort(function(a,b){return a.localeCompare(b);});
  var idx=1, grandTotal=0;
  var monthTotals = Array(12).fill(0);
  
  sortedNames.forEach(function(nKey){
    var g = groups[nKey];
    var row = [idx++, g.name];
    g.months.forEach(function(amt, i) {
      row.push(amt > 0 ? amt : '-');
      monthTotals[i] += amt;
    });
    row.push(g.total);
    rows.push(row);
    grandTotal += g.total;
  });
  
  rows.push(['','','','','','','','','','','','','','','']);
  var subRow = ['','GRAND TOTAL'];
  monthTotals.forEach(function(m) { subRow.push(m); });
  subRow.push(grandTotal);
  rows.push(subRow);
  
  var ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:5},{wch:30},{wch:8},{wch:8},{wch:8},{wch:8},{wch:8},{wch:8},{wch:8},{wch:8},{wch:8},{wch:8},{wch:8},{wch:8},{wch:12}];
  var range=XLSX.utils.decode_range(ws['!ref']);
  for(var C=range.s.c;C<=range.e.c;C++){var cell=ws[XLSX.utils.encode_cell({r:0,c:C})];if(cell){cell.s={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'4F46E5'}},alignment:{horizontal:'center'}};}}
  var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Contributions');
  var now=new Date();
  XLSX.writeFile(wb,'ContributionsGrid_'+now.getFullYear()+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0')+'.xlsx');
};
// Expose contribLoad so admin.js showAdminSection can call it
window._contribLoad=contribLoad;
// Set today's date on section open via admin.js hook
window._contribSetDate=function(){var di=document.getElementById('contrib-date');if(di&&!di.value){var t=new Date();di.value=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');}};
document.addEventListener('DOMContentLoaded',function(){var sec=document.getElementById('contributions');if(sec&&sec.classList.contains('active'))contribLoad();});
})();