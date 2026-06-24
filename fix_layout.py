import os
import re

with open('index.css', 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Fix the extra closing brace
css = css.replace("}\n\n}\n\n/* ===== AUTH SCREEN ===== */", "}\n\n/* ===== AUTH SCREEN ===== */")

# 2. Remove the max-width 430px override
css = re.sub(r'@media\s*\(min-width:\s*768px\)\s*\{\s*\.app-container\s*\{\s*max-width:\s*430px;\s*margin:\s*0\s*auto;\s*\}\s*\}', '', css)

with open('index.css', 'w', encoding='utf-8') as f:
    f.write(css)

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 3. Change default theme to light
html = html.replace('<html lang="id" data-theme="dark">', '<html lang="id" data-theme="light">')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Fixes applied.")
