const fs = require('fs');

let html = fs.readFileSync('admin.html', 'utf8');

// 1. Replace the table header
const oldThead = `                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Contributor Name</th>
                                        <th>Amount (&#x20B9;)</th>
                                        <th>Date</th>
                                        <th>Note</th>
                                        <th>Added On</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>`;

const newThead = `                                <thead>
                                    <tr>
                                        <th style="min-width:30px;">#</th>
                                        <th style="min-width:180px;">Contributor Name</th>
                                        <th>Jan</th><th>Feb</th><th>Mar</th><th>Apr</th><th>May</th><th>Jun</th>
                                        <th>Jul</th><th>Aug</th><th>Sep</th><th>Oct</th><th>Nov</th><th>Dec</th>
                                        <th style="font-weight:bold;color:#4facfe;">Total (&#x20B9;)</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>`;

html = html.replace(oldThead, newThead);

// 2. Replace contribRender
const oldRenderRegex = /window\.contribRender=function\(\)\{[\s\S]*?\}\s*window\.contribAdd=async function\(\)\{/m;

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

// Open Edit Modal
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
      await contribLoad(); // Reload entirely to sync exact DB changes
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

window.contribAdd=async function(){`;

html = html.replace(oldRenderRegex, newRender);

// 3. Update Excel export
const oldExportRegex = /window\.contribExportExcel=function\(\)\{[\s\S]*?\n\};/m;
const newExport = `window.contribExportExcel=function(){
  if(_contribs.length===0){alert('No contribution records to export.');return;}
  if(typeof XLSX==='undefined'){alert('Excel library not loaded. Please refresh the page.');return;}
  
  var rows=[['#','Contributor Name','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Total (₹)']];
  var groups={};
  _contribs.forEach(function(c){
    var n = (c.name||'').trim().toUpperCase();
    if(!groups[n]) groups[n] = { name: (c.name||'').trim(), total:0, months: Array(12).fill(0) };
    var mMatch = (c.date||'').match(/-(\\d{2})-/);
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
};`;

html = html.replace(oldExportRegex, newExport);

// 4. Add the HTML for contribEditModal
const editModalHTML = `
<!--  CONTRIBUTIONS EDIT MODAL  -->
<div class="modal-overlay" id="contribEditModal">
  <div class="modal-content" style="max-width:550px;">
    <div class="modal-header">
      <h2><i class="fas fa-edit"></i> Edit Contributor</h2>
      <button class="modal-close" onclick="contribEditModalClose()">&times;</button>
    </div>
    <div class="modal-body">
      <form id="cemForm" onsubmit="contribSubmitEdit(event)">
        <input type="hidden" id="cemOriginalName">
        <div class="form-group" style="margin-bottom:15px;">
          <label>Contributor Name</label>
          <input type="text" id="cemName" class="form-control" required>
        </div>
        
        <label style="display:block;margin-bottom:10px;font-weight:600;color:#555;">Monthly Amounts (&#x20B9;)</label>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;">
          <div><label style="font-size:0.75rem;">January</label><input type="number" id="cemMonth1" class="form-control" min="0"></div>
          <div><label style="font-size:0.75rem;">February</label><input type="number" id="cemMonth2" class="form-control" min="0"></div>
          <div><label style="font-size:0.75rem;">March</label><input type="number" id="cemMonth3" class="form-control" min="0"></div>
          <div><label style="font-size:0.75rem;">April</label><input type="number" id="cemMonth4" class="form-control" min="0"></div>
          <div><label style="font-size:0.75rem;">May</label><input type="number" id="cemMonth5" class="form-control" min="0"></div>
          <div><label style="font-size:0.75rem;">June</label><input type="number" id="cemMonth6" class="form-control" min="0"></div>
          <div><label style="font-size:0.75rem;">July</label><input type="number" id="cemMonth7" class="form-control" min="0"></div>
          <div><label style="font-size:0.75rem;">August</label><input type="number" id="cemMonth8" class="form-control" min="0"></div>
          <div><label style="font-size:0.75rem;">September</label><input type="number" id="cemMonth9" class="form-control" min="0"></div>
          <div><label style="font-size:0.75rem;">October</label><input type="number" id="cemMonth10" class="form-control" min="0"></div>
          <div><label style="font-size:0.75rem;">November</label><input type="number" id="cemMonth11" class="form-control" min="0"></div>
          <div><label style="font-size:0.75rem;">December</label><input type="number" id="cemMonth12" class="form-control" min="0"></div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn" id="cemSubmitBtn"><i class="fas fa-save"></i> Save Changes</button>
          <button type="button" class="btn btn-secondary" onclick="contribEditModalClose()">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</div>
<!--  END CONTRIBUTIONS EDIT MODAL  -->
`;

html = html.replace('<!--  END CONTRIBUTIONS MODULE  -->', editModalHTML + '\n<!--  END CONTRIBUTIONS MODULE  -->');

// Also remove individual contribDelete from the old regex if left behind, though we replaced it.

fs.writeFileSync('admin.html', html, 'utf8');
console.log('admin.html successfully patched.');
