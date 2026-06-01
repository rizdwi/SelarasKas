import re

with open('app.js', 'r', encoding='utf-8') as f:
    c = f.read()

# Helper for category icon logic inside template literals
def icon_html(var_name, color_var=None, size=24):
    if color_var:
        return f'<i data-lucide="${{({var_name} && {var_name}.length < 3) ? \'target\' : ({var_name} || \'target\')}}" style="width:{size}px; height:{size}px; color:${{{color_var}}}"></i>'
    else:
        return f'<i data-lucide="${{({var_name} && {var_name}.length < 3) ? \'target\' : ({var_name} || \'target\')}}" style="width:{size}px; height:{size}px; vertical-align:middle; display:inline-block;"></i>'

# 1. Update showBudgetForm to accept pre-filled params
c = c.replace("async function showBudgetForm() {", "async function showBudgetForm(existingCatId = null, existingAmount = null) {")

old_budget_select = '<select id="budgetCategory" style="width:100%;padding:10px;border-radius:10px;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border-light);">'
new_budget_select = '<select id="budgetCategory" style="width:100%;padding:10px;border-radius:10px;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border-light);">'

# Replace the budget option mapping to remove emoji and just use name (since select options can't easily render SVG icons)
c = re.sub(r'let res = `<option value="\${cat\.id}">\${cat\.emoji} \${cat\.name}</option>`;', 'let res = `<option value="${cat.id}">${cat.name}</option>`;', c)
c = re.sub(r'res \+= cat\.children\.map\(ch => `<option value="\${ch\.id}">&nbsp;&nbsp;&nbsp;\${ch\.emoji} \${ch\.name}</option>`\)\.join\(\'\'\);', 'res += cat.children.map(ch => `<option value="${ch.id}">&nbsp;&nbsp;&nbsp;${ch.name}</option>`).join(\'\');', c)

# Update budget html inputs to use existing data if provided
c = c.replace('<input type="text" id="budgetAmount" placeholder="Rp 0" required inputmode="numeric">', 
              '<input type="text" id="budgetAmount" placeholder="Rp 0" value="${existingAmount ? existingAmount : \'\'}" required inputmode="numeric">')

# Select the existing category
select_logic = """
        openModal('Atur Anggaran', html);
        setTimeout(() => lucide.createIcons(), 50);
        setTimeout(() => initRupiahFormatter('budgetAmount'), 100);
        if (existingCatId) document.getElementById('budgetCategory').value = existingCatId;
"""
c = re.sub(r"openModal\('Atur Anggaran', html\);\s*setTimeout\(\(\) => initRupiahFormatter\('budgetAmount'\), 100\);", select_logic.strip(), c)

# 2. Update renderBudgets
# Make budget items clickable to edit
old_budget_item = '<div class="budget-item fade-in-up">'
new_budget_item = '<div class="budget-item fade-in-up" onclick="window.FinFlow.showBudgetForm(${b.category_id}, ${b.amount})" style="cursor:pointer">'
c = c.replace(old_budget_item, new_budget_item)

# Update budget icon
old_budget_icon = '<div class="budget-item-icon" style="background:${b.category_color}18">${b.category_emoji}</div>'
new_budget_icon = f'<div class="budget-item-icon" style="background:${{b.category_color}}18; display:flex; align-items:center; justify-content:center;">{icon_html("b.category_emoji", "b.category_color", 20)}</div>'
c = c.replace(old_budget_icon, new_budget_icon)

# 3. Fix other category emojis
# renderTransactions
c = re.sub(r'<div class="transaction-icon" style="background:\$\{tx\.color\}18">\$\{emoji\}</div>', 
           f'<div class="transaction-icon" style="background:${{tx.color}}18; display:flex; align-items:center; justify-content:center;">{icon_html("tx.emoji", "tx.color", 20)}</div>', c)

# renderTopSpending
c = re.sub(r'<div class="top-spending-icon" style="background:\$\{item\.color\}18">\$\{item\.emoji\}</div>', 
           f'<div class="top-spending-icon" style="background:${{item.color}}18; display:flex; align-items:center; justify-content:center;">{icon_html("item.emoji", "item.color", 20)}</div>', c)

# analytics overview (Analytics Breakdown)
c = re.sub(r'<span class="category-name">\$\{item\.emoji\} \$\{item\.category_name\}</span>',
           f'<span class="category-name" style="display:flex;align-items:center;gap:8px;">{icon_html("item.emoji", None, 16)} ${{item.category_name}}</span>', c)

# showTransactionForm category pickers
c = re.sub(r'<span class="category-child-emoji">\$\{ch\.emoji\}</span>',
           f'<span class="category-child-emoji" style="display:flex;">{icon_html("ch.emoji", None, 18)}</span>', c)
c = re.sub(r'<span class="category-parent-emoji">\$\{cat\.emoji\}</span>',
           f'<span class="category-parent-emoji" style="display:flex;">{icon_html("cat.emoji", None, 18)}</span>', c)

# Add lucide.createIcons() to renderTransactions, renderTopSpending, loadAnalytics
c = c.replace("renderTransactions(data.transactions);", "renderTransactions(data.transactions);\n            setTimeout(() => lucide.createIcons(), 50);")
c = c.replace("renderTopSpending(data.top_spending);", "renderTopSpending(data.top_spending);\n            setTimeout(() => lucide.createIcons(), 50);")
c = c.replace("const catEl = document.getElementById('spendingCategories');", "const catEl = document.getElementById('spendingCategories');\n          setTimeout(() => lucide.createIcons(), 50);")

# Update showBudgetForm assignment to global window
c = c.replace("window.FinFlow = {", "window.FinFlow = {\n        showBudgetForm,")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(c)

print("app.js updated")
