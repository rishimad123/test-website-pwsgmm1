const fs = require('fs');
const content = fs.readFileSync('admin.js', 'utf8');
const replacement = fs.readFileSync('replacement.js', 'utf8');
const searchString = 'tbody.innerHTML = list.map(r => {';
let firstIndex = content.indexOf(searchString);
let secondIndex = content.indexOf(searchString, firstIndex + 1);

let endMarker = '}).join(\'\');';
let endIndex = content.indexOf(endMarker, secondIndex);

if (secondIndex !== -1 && endIndex !== -1) {
    let endOfReplaced = endIndex + endMarker.length;
    let newContent = content.substring(0, secondIndex) + replacement + content.substring(endOfReplaced);
    fs.writeFileSync('admin.js', newContent, 'utf8');
    console.log('Successfully updated admin.js!');
} else {
    console.log('Could not find the target indices. secondIndex:', secondIndex, 'endIndex:', endIndex);
}
