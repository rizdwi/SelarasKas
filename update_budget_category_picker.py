import re

with open('app.js', 'r', encoding='utf-8') as f:
    c = f.read()

# Define the new showBudgetForm logic
new_show_budget_form = """async function showBudgetForm(existingCatId = null, existingAmount = null) {
        const categories = await loadCategories('expense');

        let catPickerHTML = categories.map(cat => {
            const hasChildren = cat.children && cat.children.length > 0;
            let childrenHTML = '';
            if (hasChildren) {
                childrenHTML = `<div class="category-children" data-parent="${cat.id}">
                    ${cat.children.map(ch => `
                        <div class="category-child" data-id="${ch.id}" data-name="${ch.name}">
                            <span class="category-child-emoji" style="display:flex;"><i data-lucide="${(ch.emoji && ch.emoji.length < 3) ? 'target' : (ch.emoji || 'target')}" style="width:18px; height:18px; vertical-align:middle; display:inline-block;"></i></span>
                            <span class="category-child-name">${ch.name}</span>
                        </div>
                    `).join('')}
                </div>`;
            }
            return `
                <div class="category-parent" data-id="${cat.id}" data-name="${cat.name}" data-has-children="${hasChildren}">
                    <span class="category-parent-emoji" style="display:flex;"><i data-lucide="${(cat.emoji && cat.emoji.length < 3) ? 'target' : (cat.emoji || 'target')}" style="width:18px; height:18px; vertical-align:middle; display:inline-block;"></i></span>
                    <span class="category-parent-name">${cat.name}</span>
                    <svg class="category-parent-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
                ${childrenHTML}`;
        }).join('');
        
        const html = `
            <div class="form-group">
                <label>Kategori</label>
                <input type="hidden" id="budgetCategoryId" value="${existingCatId ? existingCatId : ''}">
                <div id="budgetSelectedCategory" style="padding:10px 12px;background:var(--bg-card);border-radius:10px;font-size:14px;color:var(--text-primary);border:1px solid var(--border-light);cursor:pointer;" onclick="document.getElementById('budgetCategoryPicker').style.display=document.getElementById('budgetCategoryPicker').style.display==='none'?'flex':'none'">
                    Pilih kategori...
                </div>
                <div class="category-picker" id="budgetCategoryPicker" style="display:none;margin-top:8px;max-height:200px;overflow-y:auto;">
                    ${catPickerHTML}
                </div>
            </div>
            <div class="form-group">
                <label>Jumlah Anggaran (Rp)</label>
                <input type="text" id="budgetAmount" placeholder="Rp 0" value="${existingAmount ? existingAmount : ''}" required inputmode="numeric">
            </div>
            <button class="modal-submit-btn success-btn" id="budgetSubmitBtn">Simpan Anggaran</button>
        `;
        openModal('Atur Anggaran', html);
        setTimeout(() => lucide.createIcons(), 50);
        setTimeout(() => initRupiahFormatter('budgetAmount'), 100);
        
        // Setup existing category name if any
        if (existingCatId) {
            let catName = 'Pilih kategori...';
            categories.forEach(c => {
                if (c.id == existingCatId) catName = c.name;
                if (c.children) {
                    c.children.forEach(ch => { if (ch.id == existingCatId) catName = ch.name; });
                }
            });
            document.getElementById('budgetSelectedCategory').innerHTML = catName;
        }

        setTimeout(() => {
            document.querySelectorAll('#budgetCategoryPicker .category-parent').forEach(parent => {
                parent.addEventListener('click', () => {
                    const hasChildren = parent.dataset.hasChildren === 'true';
                    if (hasChildren) {
                        const children = parent.nextElementSibling;
                        const isOpen = children.classList.contains('show');
                        document.querySelectorAll('#budgetCategoryPicker .category-children').forEach(c => c.classList.remove('show'));
                        document.querySelectorAll('#budgetCategoryPicker .category-parent').forEach(p => p.classList.remove('expanded'));
                        if (!isOpen) {
                            children.classList.add('show');
                            parent.classList.add('expanded');
                        }
                    } else {
                        document.getElementById('budgetCategoryId').value = parent.dataset.id;
                        document.getElementById('budgetSelectedCategory').innerHTML = parent.innerHTML;
                        document.getElementById('budgetCategoryPicker').style.display = 'none';
                    }
                });
            });

            document.querySelectorAll('#budgetCategoryPicker .category-child').forEach(child => {
                child.addEventListener('click', () => {
                    document.getElementById('budgetCategoryId').value = child.dataset.id;
                    document.getElementById('budgetSelectedCategory').innerHTML = child.innerHTML;
                    document.getElementById('budgetCategoryPicker').style.display = 'none';
                });
            });

            document.getElementById('budgetSubmitBtn').addEventListener('click', async () => {
                const category_id = document.getElementById('budgetCategoryId').value;
                const amount = parseRupiah(document.getElementById('budgetAmount').value);
                
                if (!category_id) return showToast('Pilih kategori!');
                if (!amount) return showToast('Masukkan jumlah!');
                
                try {
                    await api('budget.php', {
                        method: 'POST',
                        body: JSON.stringify({ category_id, amount, month: window.currentBudgetMonth }),
                    });
                    closeModal();
                    showToast('Anggaran disimpan! 🎯');
                    loadBudget();
                } catch (err) {
                    alert(err.message);
                }
            });
        }, 150);
    }"""

# Use regex to find and replace the whole showBudgetForm function
c = re.sub(r'async function showBudgetForm.*?^    }', new_show_budget_form, c, flags=re.DOTALL | re.MULTILINE)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(c)

print("Budget category picker updated")
