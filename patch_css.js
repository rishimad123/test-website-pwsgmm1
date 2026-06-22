const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

css = css.replace(
`.logo {
    display: flex;
    align-items: center;
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--primary-color);
}`,
`.logo {
    display: flex;
    align-items: center;
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--primary-color);
}

.logo span {
    white-space: nowrap;
}`
);

css = css.replace(
`.nav-menu {
    display: flex;
    list-style: none;
    align-items: center;
    gap: 30px;
}

.nav-menu a {
    font-weight: 500;
    padding: 8px 0;
    position: relative;
}`,
`.nav-menu {
    display: flex;
    list-style: none;
    align-items: center;
    gap: 15px;
}

.nav-menu a {
    font-weight: 500;
    padding: 8px 0;
    position: relative;
    display: inline-block;
    white-space: nowrap;
}`
);

fs.writeFileSync('style.css', css);
console.log('style.css updated successfully.');
