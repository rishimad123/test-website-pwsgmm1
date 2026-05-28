const fs = require('fs');

// Admin HTML
let admin = fs.readFileSync('admin.html', 'utf8');
const adminStatCardRegex = /\.admin-stat-card\s*\{[^}]*\}/;
const adminStatCardNew = `.admin-stat-card {
    background: white;
    padding: 30px;
    border-radius: 15px;
    box-shadow: 0 3px 15px rgba(0,0,0,0.08);
    display: flex;
    align-items: center;
    gap: 20px;
    transition: all 0.3s ease;
    border-top: 4px solid var(--secondary-color);
}`;
admin = admin.replace(adminStatCardRegex, adminStatCardNew);

// Add mobile responsiveness to admin sidebar if missing
if(!admin.includes('@media (max-width: 900px)')) {
    admin = admin.replace('</style>', `
        @media (max-width: 900px) {
            .admin-sidebar { left: -280px; transition: 0.3s; z-index: 1000; }
            .admin-sidebar.open { left: 0; }
            .admin-main { margin-left: 0; }
            .admin-topbar { padding: 15px; }
            .admin-content { padding: 15px; }
            /* Make tables scrollable */
            .table-responsive { overflow-x: auto; }
        }
    </style>`);
}

fs.writeFileSync('admin.html', admin);

// Dashboard HTML
let dashboard = fs.readFileSync('dashboard.html', 'utf8');
const dashCardRegex = /\.dash-card\s*\{[^}]*\}/;
const dashCardNew = `.dash-card {
    background: var(--white);
    padding: 24px;
    border-radius: 12px;
    box-shadow: var(--shadow);
    display: flex;
    align-items: center;
    gap: 16px;
    transition: all 0.3s ease;
    border-top: 4px solid var(--secondary-color);
}`;
if(dashboard.match(dashCardRegex)) {
    dashboard = dashboard.replace(dashCardRegex, dashCardNew);
} else {
    // maybe it's not dash-card, but card
    const cardRegex = /\.card\s*\{[^}]*\}/;
    const cardNew = `.card {
        background: var(--white);
        border-radius: 15px;
        box-shadow: var(--shadow);
        padding: 24px;
        margin-bottom: 24px;
        border-top: 4px solid var(--secondary-color);
    }`;
    dashboard = dashboard.replace(cardRegex, cardNew);
}

// ensure horizontal scroll for tables
if(!dashboard.includes('.table-responsive { overflow-x: auto; }')) {
    dashboard = dashboard.replace('</style>', `
        .table-responsive { overflow-x: auto; width: 100%; display: block; }
    </style>`);
}

fs.writeFileSync('dashboard.html', dashboard);
console.log('Admin and Dashboard updated for richness and responsiveness');
