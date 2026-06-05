const cp = require('child_process');
const fs = require('fs');

// Fetch the content of dashboard.html at commit 7c52e9d (before location cascade)
const oldHtml = cp.execSync('git show 7c52e9d:dashboard.html').toString();

const lines = oldHtml.split('\n');
let capture = false;
let capturedLines = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("document.getElementById('donationEntryForm')?.addEventListener('submit'")) {
        capture = true;
    }
    
    if (capture) {
        capturedLines.push(line);
        if (line.includes('deShowStatus(') && line.includes('function deShowStatus')) {
            // Keep going until end of deShowStatus
        }
        
        // Stop capturing when we see the next major function block: deLoadLandmarks or deAutoReceipt
        if (line.includes('async function deLoadLandmarks') || line.includes('async function deAutoReceipt')) {
            // Pop the last line since it matches the break condition
            capturedLines.pop();
            break;
        }
    }
}

const submitHandlerText = capturedLines.join('\n');

// Now inject it into the current dashboard.html
const currentHtml = fs.readFileSync('dashboard.html', 'utf8');
const curLines = currentHtml.split('\n');

let insertIndex = -1;
for (let i = 0; i < curLines.length; i++) {
    // Insert just before async function deAutoReceipt()
    if (curLines[i].includes('async function deAutoReceipt()')) {
        insertIndex = i;
        break;
    }
}

if (insertIndex !== -1) {
    // Modify the payload logic slightly to include the new fields
    // The previous payload read from deLandmark, deArea, deBuildingName. 
    // Wait, let's just insert it and then I will review the payload logic.
    curLines.splice(insertIndex, 0, submitHandlerText);
    fs.writeFileSync('dashboard.html', curLines.join('\n'), 'utf8');
    console.log('Restored submit handler!');
} else {
    console.log('Could not find insert index');
}
