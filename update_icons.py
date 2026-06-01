import re

with open('app.js', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace SAVINGS_EMOJIS array
c = re.sub(r'const SAVINGS_EMOJIS = \[.*?\];', "const SAVINGS_ICONS = ['target','plane','laptop','home','car','smartphone','gem','graduation-cap','umbrella','landmark','gift','building'];", c)

# 1. Update showSavingsForm
c = c.replace("let selectedEmoji = 'dYZ_';", "let selectedIcon = 'target';")
# Actually, the emojis string in code might be messed up due to encoding in my python replacement.
# So I will just use regex to find the variables.
c = re.sub(r"let selectedEmoji = '.*?';", "let selectedIcon = 'target';", c)

html_emoji_grid = """<div class="emoji-grid">
                    ${SAVINGS_ICONS.map(i => `<div class="icon-option ${i === selectedIcon ? 'selected' : ''}" data-icon="${i}"><i data-lucide="${i}"></i></div>`).join('')}
                </div>"""
c = re.sub(r'<div class="emoji-grid">.*?</div>', html_emoji_grid, c, flags=re.DOTALL)

submit_btn = """<button class="modal-submit-btn success-btn" id="savingSubmitBtn"><i data-lucide="plus-circle" style="width:18px;height:18px;margin-right:6px;vertical-align:-4px"></i> Buat Target</button>"""
c = re.sub(r'<button class="modal-submit-btn success-btn" id="savingSubmitBtn">.*?</button>', submit_btn, c)

# Update emoji listener in showSavingsForm
old_listener = """document.querySelectorAll('.emoji-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    document.querySelectorAll('.emoji-option').forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    selectedEmoji = opt.dataset.emoji;
                });
            });"""
new_listener = """document.querySelectorAll('.icon-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    selectedIcon = opt.dataset.icon;
                });
            });"""
c = c.replace("document.querySelectorAll('.emoji-option').forEach(opt => {", "document.querySelectorAll('.icon-option').forEach(opt => {")
c = c.replace("document.querySelectorAll('.emoji-option').forEach(o => o.classList.remove('selected'));", "document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));")
c = c.replace("selectedEmoji = opt.dataset.emoji;", "selectedIcon = opt.dataset.icon;")

# Change the API payload from icon: selectedEmoji to icon: selectedIcon
c = c.replace("icon: selectedEmoji", "icon: selectedIcon")

# 2. Update renderSavingsGoals list
old_icon_div = """<div class="savings-goal-icon" style="background:${g.color}20; color:${g.color};">
                            ${g.icon}
                        </div>"""
new_icon_div = """<div class="savings-goal-icon" style="background:${g.color}20; color:${g.color}; display:flex; align-items:center; justify-content:center;">
                            <i data-lucide="${g.icon.length < 3 ? 'target' : g.icon}" style="width:24px; height:24px;"></i>
                        </div>"""
c = re.sub(r'<div class="savings-goal-icon".*?</div>', new_icon_div, c, flags=re.DOTALL)

# Add lucide.createIcons() call inside showApp, renderSavingsGoals, and openModal (via settimeout)
c = c.replace("renderSavingsGoals(data.goals);", "renderSavingsGoals(data.goals);\n            setTimeout(() => lucide.createIcons(), 50);")
c = c.replace("openModal('Target Nabung Baru', formHTML);", "openModal('Target Nabung Baru', formHTML);\n        setTimeout(() => lucide.createIcons(), 50);")

c = c.replace("loadDashboard();", "loadDashboard();\n        setTimeout(() => lucide.createIcons(), 50);")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(c)

print("app.js updated for lucide icons")
