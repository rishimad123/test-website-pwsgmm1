const fs = require('fs');
let js = fs.readFileSync('admin.js', 'utf8');

// ─── 1. Section A Cash Balance row: add bold blue style to <td class="bs-particulars">
js = js.replace(
  /<td class="bs-particulars">\r?\n    <input class="bs-particulars-input" id="bs_aCashPart"/,
  '<td class="bs-particulars" style="font-weight:700;color:#1565C0;">\n    <input class="bs-particulars-input" id="bs_aCashPart" style="font-weight:700;color:#1565C0;"'
);

// ─── 2. Section A Bank Balance row: add bold blue style
js = js.replace(
  /<td class="bs-particulars">\r?\n    <input class="bs-particulars-input" id="bs_aBankPart"/,
  '<td class="bs-particulars" style="font-weight:700;color:#1565C0;">\n    <input class="bs-particulars-input" id="bs_aBankPart" style="font-weight:700;color:#1565C0;"'
);

// ─── 3. Section B Cash Received row: add bold green style
js = js.replace(
  /<td class="bs-particulars">\r?\n    <input class="bs-particulars-input" id="bs_bCashPart"/,
  '<td class="bs-particulars" style="font-weight:700;color:#1B5E20;">\n    <input class="bs-particulars-input" id="bs_bCashPart" style="font-weight:700;color:#1B5E20;"'
);

// ─── 4. Section B Bank Received row: add bold green style
js = js.replace(
  /<td class="bs-particulars">\r?\n    <input class="bs-particulars-input" id="bs_bBankPart"/,
  '<td class="bs-particulars" style="font-weight:700;color:#1B5E20;">\n    <input class="bs-particulars-input" id="bs_bBankPart" style="font-weight:700;color:#1B5E20;"'
);

// ─── 5. Section B Cash Box row: add bold green style
js = js.replace(
  /<td class="bs-particulars">\r?\n    <input class="bs-particulars-input" id="bs_bBoxPart"/,
  '<td class="bs-particulars" style="font-weight:700;color:#1B5E20;">\n    <input class="bs-particulars-input" id="bs_bBoxPart" style="font-weight:700;color:#1B5E20;"'
);

// ─── 6. Insert Section A subtotal row after the bank balance row (before <!-- B) Income...)
const sectionAEndMarker = '<!-- B) Income for Current Year -->';
const sectionASubtotalRow = `<tr style="background:#E3F2FD;">
  <td></td>
  <td style="text-align:right;font-weight:700;color:#0D47A1;font-style:italic;padding-right:12px;">Section A Total (Previous Year Balance)</td>
  <td></td>
  <td class="bs-amt">
    <input class="bs-input" id="bs_aTotalDisp" type="number" readonly style="background:#BBDEFB;cursor:not-allowed;font-weight:bold;color:#0D47A1;border:2px solid #1565C0;">
  </td>
</tr>
`;
js = js.replace(sectionAEndMarker, sectionASubtotalRow + sectionAEndMarker);

// ─── 7. Replace the old total row with: Section B subtotal + new combined row
const oldTotalRow = `<tr class="bs-total-row">
  <td></td>
  <td style="text-align:right;font-style:italic;">
    Total Collections for C.Y.&nbsp;<span id="bs_cyYearLabel">\${escHtml(cyYear)}</span>
  </td>
  <td class="bs-amts" style="text-decoration:underline;">
    <input class="bs-input" id="bs_totalColl" type="number" readonly style="background:#f5f5f5;cursor:not-allowed;font-weight:bold;color:#1a1a7a;">
  </td>
  <td class="bs-amt"></td>
</tr>`;

const newTotalRows = `<tr style="background:#E8F5E9;">
  <td></td>
  <td style="text-align:right;font-weight:700;color:#1B5E20;font-style:italic;padding-right:12px;">Section B Total (Current Year Income)</td>
  <td></td>
  <td class="bs-amt">
    <input class="bs-input" id="bs_bTotalDisp" type="number" readonly style="background:#C8E6C9;cursor:not-allowed;font-weight:bold;color:#1B5E20;border:2px solid #2E7D32;">
  </td>
</tr>
<tr style="background:#FFF3E0;border-top:3px solid #E65100;">
  <td></td>
  <td style="text-align:right;font-weight:800;color:#E65100;font-size:1rem;padding-right:12px;">
    Collection for Current Year&nbsp;<span id="bs_cyYearLabel">\${escHtml(cyYear)}</span>
  </td>
  <td class="bs-amts" style="text-decoration:underline;">
    <input class="bs-input" id="bs_totalColl" type="number" readonly style="background:#FFE0B2;cursor:not-allowed;font-weight:bold;color:#E65100;border:2px solid #FF9800;">
  </td>
  <td class="bs-amt"></td>
</tr>`;

if (js.includes(oldTotalRow)) {
  js = js.replace(oldTotalRow, newTotalRows);
  console.log('✅ Total row replaced.');
} else {
  console.log('❌ Total row NOT found - checking for variant...');
  // try with \r\n
  const variant = oldTotalRow.replace(/\n/g, '\r\n');
  if (js.includes(variant)) {
    js = js.replace(variant, newTotalRows);
    console.log('✅ Total row replaced (CRLF variant).');
  } else {
    console.log('❌ Still not found.');
  }
}

fs.writeFileSync('admin.js', js, 'utf8');
console.log('Done.');
