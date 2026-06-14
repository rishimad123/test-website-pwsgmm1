const fs = require('fs');

function updateFile(filename) {
    let content = fs.readFileSync(filename, 'utf8');
    
    // 1. Remove required star from Middle Name labels
    // admin.html: <label for="adeMiddleName">Middle Name <span style="color:red;">*</span></label>
    // dashboard.html: <label for="deMiddleName">Middle Name <span style="color:red;">*</span></label>
    content = content.replace(
        /<label for="adeMiddleName">Middle Name <span style="color:red;">\*<\/span><\/label>/g,
        '<label for="adeMiddleName">Middle Name</label>'
    );
    content = content.replace(
        /<label for="deMiddleName">Middle Name <span style="color:red;">\*<\/span><\/label>/g,
        '<label for="deMiddleName">Middle Name</label>'
    );
    
    // Remove the `required` attribute if it exists on the middle name inputs
    // Wait, the input fields are dynamically rendered or explicitly listed.
    // In dashboard.html: <input type="text" id="deMiddleName" ... required> -> remove required
    content = content.replace(
        /(<input type="text" id="deMiddleName"[^>]*?)required([^>]*?>)/g,
        '$1$2'
    );
    content = content.replace(
        /(<input type="text" id="adeMiddleName"[^>]*?)required([^>]*?>)/g,
        '$1$2'
    );

    // 2. Add required star to Landmark label
    // admin.html:
    // Landmark <span style="font-size:.72rem;color:#aaa;font-weight:400;">Step 1 of 3</span>
    // dashboard.html:
    // Landmark <span style="font-size:.72rem;color:#aaa;font-weight:400;">Step 1 of 3</span>
    content = content.replace(
        /Landmark <span style="font-size:\.72rem;color:#aaa;font-weight:400;">Step 1 of 3<\/span>/g,
        'Landmark <span style="color:red;">*</span> <span style="font-size:.72rem;color:#aaa;font-weight:400;">Step 1 of 3</span>'
    );

    fs.writeFileSync(filename, content, 'utf8');
    console.log(`Updated ${filename}`);
}

updateFile('admin.html');
updateFile('dashboard.html');
