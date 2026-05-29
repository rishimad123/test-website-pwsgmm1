import re

def fix_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Fix balanceRecovery missing admin-card
    # Find balanceRecovery and fix the div inside it
    if 'id="balanceRecovery"' in content:
        # We know it has <div style="margin-bottom:28px;"> right before <div class="card-header">
        # Let's replace it carefully inside the balanceRecovery section
        pattern = r'(id="balanceRecovery"[\s\S]*?)(<div style="margin-bottom:28px;">)(\s*<div class="card-header">)'
        content = re.sub(pattern, r'\1<div class="admin-card">\3', content)

    # 2. Rewrite tshirtSection to be cleanly wrapped and without Coordinators
    # We will extract the application form and sizes overview
    # and put them into proper .admin-card wrappers.
    # First, let's find the Application Form HTML block
    app_form_pattern = r'(<!-- Application Form \+ Admin Price Settings -->.*?)(?=<!-- Sizes Overview -->)'
    app_form_match = re.search(app_form_pattern, content, re.DOTALL)
    if not app_form_match:
        print(f"Could not find Application Form in {filepath}")
        return

    app_form_html = app_form_match.group(1).strip()
    # Let's remove the inline style wrapper for the form to let admin-card handle it
    # We will just keep it as is since it has its own grid and backgrounds, but we'll put it in an admin-card or just leave it since the grid items look like cards already.
    # Wait, the app form uses: <div style="display:grid..."><div style="background:#fff;border-radius:12px;...">
    # Those inner divs ARE essentially cards.
    # We can just wrap the whole tshirtSection properly.

    sizes_pattern = r'(<!-- Sizes Overview -->.*?)(?=</div>\s*</div>\s*</div>\s*<!-- \S* END)'
    # Wait, the end of tshirtSection is a bit messy to regex. Let's just grab the whole tshirtSection
    tshirt_pattern = r'(<!-- ---------- T-SHIRT SECTION ---------- -->\s*<div id="tshirtSection".*?>).*?(</div>\s*</div>\s*</div>)'
    tshirt_match = re.search(tshirt_pattern, content, re.DOTALL)
    if not tshirt_match:
        print(f"Could not find full tshirtSection in {filepath}")
        # fallback for dashboard.html which might not have the comment exact match
        tshirt_pattern2 = r'(<div id="tshirtSection" class="content-section".*?>).*?(</div>\s*</div>\s*</div>)'
        tshirt_match = re.search(tshirt_pattern2, content, re.DOTALL)
        if not tshirt_match:
            print(f"Still could not find tshirtSection in {filepath}")
            return

    # Now let's extract just the parts we want:
    # 1. The forms grid
    forms_match = re.search(r'(<div style="display:grid;grid-template-columns:repeat.*?</div>\s*</div>\s*</div>)', tshirt_match.group(0), re.DOTALL)
    forms_html = forms_match.group(1) if forms_match else ""

    # 2. Sizes Overview
    sizes_match = re.search(r'(<!-- Sizes Overview -->.*?</div>\s*</div>)', tshirt_match.group(0), re.DOTALL)
    sizes_html = sizes_match.group(1) if sizes_match else ""

    display_style = ' style="display:none;"' if 'dashboard.html' in filepath else ''

    new_tshirt_section = f"""<!-- ---------- T-SHIRT SECTION ---------- -->
                <div id="tshirtSection" class="content-section"{display_style}>
                    <div class="page-title">
                        <h1><i class="fas fa-tshirt" style="color:var(--primary-color);margin-right:10px;"></i>T-shirt Section</h1>
                        <p>Manage T-shirt applications and size summaries</p>
                    </div>

                    <!-- Application Form + Admin Price Settings -->
                    {forms_html}

                    {sizes_html}
                </div>"""

    # Replace the old tshirtSection with the new one
    # We replace from <div id="tshirtSection"... up to the last closing div of the section
    content = content[:tshirt_match.start()] + new_tshirt_section + content[tshirt_match.end():]

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Fixed layout in {filepath}")

fix_file("dashboard.html")
fix_file("admin.html")
