import io
with io.open('admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    'â‚¹': '&#x20B9;',
    'â€”': '—',
    'ðŸ’°': '💰',
    'â€¦': '...',
    'â€“': '–',
    'â€œ': '"',
    'â€ ': '"',
    'â€˜': "'",
    'â€™': "'",
    'â€¢': '•',
    'â”€': '─'
}

count = 0
for bad, good in replacements.items():
    if bad in content:
        c = content.count(bad)
        print(f'Replaced {c} of {bad} with {good}')
        content = content.replace(bad, good)
        count += c

if count > 0:
    with io.open('admin.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('admin.html fixed')
