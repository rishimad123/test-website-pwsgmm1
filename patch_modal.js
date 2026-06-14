const fs = require('fs');

let html = fs.readFileSync('admin.html', 'utf8');

const editModalHTML = `
<!--  CONTRIBUTIONS EDIT MODAL  -->
<div class="modal" id="contribEditModal">
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

if (!html.includes('id="contribEditModal"')) {
    html = html.replace('</body>', editModalHTML + '\n</body>');
    fs.writeFileSync('admin.html', html, 'utf8');
    console.log('Appended modal to admin.html');
} else {
    console.log('Modal already exists.');
}
