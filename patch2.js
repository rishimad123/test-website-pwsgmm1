const fs = require('fs');

let html = fs.readFileSync('admin.html', 'utf8');

// 1. Replace the table header using a more flexible regex
html = html.replace(/<table class="admin-table" id="contrib-tbl"[^>]*>[\s\S]*?<\/thead>/i, 
`<table class="admin-table" id="contrib-tbl" style="display:none;">
    <thead>
        <tr>
            <th style="min-width:30px;">#</th>
            <th style="min-width:180px;">Contributor Name</th>
            <th>Jan</th><th>Feb</th><th>Mar</th><th>Apr</th><th>May</th><th>Jun</th>
            <th>Jul</th><th>Aug</th><th>Sep</th><th>Oct</th><th>Nov</th><th>Dec</th>
            <th style="font-weight:bold;color:#4facfe;">Total (&#x20B9;)</th>
            <th>Action</th>
        </tr>
    </thead>`);

// 2. Replace contribRender
const oldRenderRegex = /window\.contribRender=function\(\)\{[\s\S]*?\}\s*window\.contribAdd=async function/m;

const newRender = `window.contribRender=function(){
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
    var mMatch = (c.date||'').match(/-(\\d{2})-/);
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
              '<button class="contrib-edit-btn" title="Edit" onclick="contribEditModalOpen(\\''+g.name.replace(/'/g,"\\\\'")+'\\')" style="margin-right:6px;background:none;border:none;color:#3949AB;cursor:pointer;"><i class="fas fa-edit"></i></button>' +
              '<button class="contrib-del-btn" title="Delete All" onclick="contribDeleteAll(\\''+g.name.replace(/'/g,"\\\\'")+'\\')" style="background:none;border:none;color:#C62828;cursor:pointer;"><i class="fas fa-trash-alt"></i></button>' +
            '</td></tr>';
  });
  
  tbody.innerHTML=rows;
};

window.contribEditModalOpen=function(name){
  var groups={};
  _contribs.forEach(function(c){
    var n = (c.name||'').trim().toUpperCase();
    if(!groups[n]) groups[n] = { name: (c.name||'').trim(), months: Array(12).fill(0) };
    var mMatch = (c.date||'').match(/-(\\d{2})-/);
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

window.contribAdd=async function`;

html = html.replace(oldRenderRegex, newRender);

fs.writeFileSync('admin.html', html, 'utf8');
console.log('admin.html successfully patched part 2.');
