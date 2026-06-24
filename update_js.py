import os
import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update Navigation Selectors
js = js.replace("document.querySelectorAll('#bottomNav .nav-item')", "document.querySelectorAll('#mainNav .nav-item')")

# 2. Update Theme Toggle
js = js.replace("document.getElementById('themeToggle')", "document.getElementById('themeToggleCheckbox')")
js = js.replace("toggle.classList.toggle('dark')", "")
js = js.replace("const isDark = toggle.classList.contains('dark')", "const isDark = toggle.checked")

# If there's an initialization, we need to set the checkbox state instead of class
js = re.sub(
    r"if \(savedTheme === 'light'\) \{[\s\S]*?toggle\.classList\.remove\('dark'\);[\s\S]*?\} else \{[\s\S]*?toggle\.classList\.add\('dark'\);[\s\S]*?\}",
    """if (savedTheme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
                if(toggle) toggle.checked = false;
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                if(toggle) toggle.checked = true;
            }""",
    js
)

# Also update the toggle event listener body
js = re.sub(
    r"toggle\.addEventListener\('click', \(\) => \{[\s\S]*?toggle\.classList\.toggle\('dark'\);[\s\S]*?const isDark = toggle\.classList\.contains\('dark'\);[\s\S]*?\}\);",
    """toggle.addEventListener('change', () => {
            const isDark = toggle.checked;
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            
            // Re-render chart to match theme
            if (window.Selaraskas && window.Selaraskas.renderSpendingChart) {
                window.Selaraskas.renderSpendingChart();
            }
        });""",
    js
)

# 3. Update Push Notification UI
# Line 2500: function updatePushToggleUI(isActive) { ... }
js = re.sub(
    r"function updatePushToggleUI\(isActive\) \{[\s\S]*?if \(toggleBtn\) \{[\s\S]*?\}[\s\S]*?if \(label\) \{[\s\S]*?\}[\s\S]*?\}",
    """function updatePushToggleUI(isActive) {
        const toggleBtn = document.getElementById('pushNotifToggleCheckbox');
        if (toggleBtn) {
            toggleBtn.checked = isActive;
        }
    }""",
    js
)

# Push toggle listener
js = js.replace("const pushToggle = document.getElementById('pushNotifToggleBtn');", "const pushToggle = document.getElementById('pushNotifToggleCheckbox');")
js = js.replace("const isActive = pushToggle && pushToggle.classList.contains('active');", "const isActive = pushToggle && pushToggle.checked;")
js = js.replace("pushToggle.addEventListener('click'", "pushToggle.addEventListener('change'")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("JS successfully updated.")
