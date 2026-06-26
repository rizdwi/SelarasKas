    // ===== BUDGETING =====
    let currentBudgetMonth = currentMonth;
    
    async function loadBudgets() {
        document.getElementById('budgetMonthLabel').textContent = formatMonthLabel(currentBudgetMonth);
        const list = document.getElementById('budgetList');
        list.innerHTML = '<div class="skeleton sk-card fade-in-up"></div><div class="skeleton sk-item fade-in-up"></div>';
        
        try {
            const data = await api(`budget.php?month=${currentBudgetMonth}`);
            renderBudgets(data);
        } catch(err) {
            console.error('Budget error', err);
        }
    }
    
    function renderBudgets(data) {
        document.getElementById('budgetTotalAmount').textContent = formatRp(data.total_budget);
        const remainEl = document.getElementById('budgetTotalRemain');
        const remain = data.total_budget - data.total_spent;
        if (remain < 0) {
            remainEl.innerHTML = 'Melebihi: ' + formatRp(Math.abs(remain)) + ' <span style="font-weight:bold;color:var(--color-danger)">!</span>';
        } else {
            remainEl.textContent = 'Sisa: ' + formatRp(remain);
        }
        
        let pct = data.total_budget > 0 ? (data.total_spent / data.total_budget) * 100 : 0;
        pct = Math.min(100, Math.max(0, pct));
        
        document.getElementById('budgetTotalPct').textContent = pct.toFixed(0) + '%';
        const circle = document.getElementById('budgetTotalProgress');
        const offset = 175 - (175 * pct / 100);
        circle.style.strokeDashoffset = offset;
        
        if (pct >= 100) { circle.style.stroke = 'var(--color-danger)'; remainEl.className = 'budget-total-remain danger'; }
        else if (pct >= 80) { circle.style.stroke = 'var(--color-warning)'; remainEl.className = 'budget-total-remain warning'; }
        else { circle.style.stroke = 'var(--color-success)'; remainEl.className = 'budget-total-remain good'; }
        
        const list = document.getElementById('budgetList');
        if (!data.budgets || !data.budgets.length) {
            list.innerHTML = '<div class="empty-state"><span class="empty-icon">📊</span><span class="empty-text">Belum ada anggaran</span><span class="empty-sub">Tap + untuk buat anggaran</span></div>';
            return;
        }
        
        list.innerHTML = data.budgets.map(b => {
            let itemPct = (b.spent / b.amount) * 100;
            itemPct = Math.min(100, Math.max(0, itemPct));
            let color = 'var(--color-success)';
            if (itemPct >= 100) color = 'var(--color-danger)';
            else if (itemPct >= 80) color = 'var(--color-warning)';
            
            let remainText = 'Sisa ' + formatRp(b.amount - b.spent, true);
            if (b.amount - b.spent < 0) {
                remainText = 'Melebihi ' + formatRp(Math.abs(b.amount - b.spent), true) + ' <span style="font-weight:bold;color:var(--color-danger)">!</span>';
            }
            
            return `
            <div class="budget-item fade-in-up" onclick="window.Selaraskas.showBudgetForm(${b.category_id}, ${b.amount})" style="cursor:pointer">
                <div class="budget-item-top">
                    <div class="budget-item-icon" style="background:${b.category_color}18; display:flex; align-items:center; justify-content:center;">${renderEmojiOrIcon(b.category_emoji, '20px', b.category_color)}</div>
                    <div class="budget-item-info">
                        <span class="budget-item-title">${escapeHTML(b.category_name)}</span>
                        <span class="budget-item-amounts">${formatRp(b.spent, true)} / ${formatRp(b.amount, true)}</span>
                    </div>
                    <button class="budget-item-delete" onclick="event.stopPropagation(); window.Selaraskas.deleteBudget(${b.id})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
                <div class="budget-progress-bar">
                    <div class="budget-progress-fill" style="width:${itemPct}%;background:${color}"></div>
                </div>
                <div class="budget-progress-row">
                    <span class="budget-progress-text" style="color:${color}">${itemPct.toFixed(0)}%</span>
                    <span class="budget-remain-text">${remainText}</span>
                </div>
            </div>`;
        }).join('');
    }
    
    async function showBudgetForm(existingCatId = null, existingAmount = null) {
        const categories = await loadCategories('expense');

        let catPickerHTML = categories.map(cat => {
            const hasChildren = cat.children && cat.children.length > 0;
            let childrenHTML = '';
            if (hasChildren) {
                childrenHTML = `<div class="category-children" data-parent="${cat.id}">
                    ${cat.children.map(ch => `
                        <div class="category-child" data-id="${ch.id}" data-name="${ch.name}" data-emoji="${ch.emoji || ''}">
                            <span class="category-child-emoji" style="display:flex; align-items:center;">${renderEmojiOrIcon(ch.emoji, '18px')}</span>
                            <span class="category-child-name">${ch.name}</span>
                        </div>
                    `).join('')}
                </div>`;
            }
            return `
                <div class="category-parent" data-id="${cat.id}" data-name="${cat.name}" data-emoji="${cat.emoji || ''}" data-has-children="${hasChildren}">
                    <span class="category-parent-emoji" style="display:flex; align-items:center;">${renderEmojiOrIcon(cat.emoji, '18px')}</span>
                    <span class="category-parent-name">${cat.name}</span>
                    <svg class="category-parent-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
                ${childrenHTML}`;
        }).join('');
        
        const html = `
            <div class="form-group">
                <label>Kategori</label>
                <input type="hidden" id="budgetCategoryId" value="${existingCatId ? existingCatId : ''}">
                <div id="budgetSelectedCategory" class="select-category-trigger" onclick="document.getElementById('budgetCategoryPicker').style.display=document.getElementById('budgetCategoryPicker').style.display==='none'?'flex':'none'">
                    <span class="select-category-icon-wrapper">
                        <span class="input-icon">${renderEmojiOrIcon('tag', '18px')}</span>
                    </span>
                    <span class="select-category-text">Pilih kategori...</span>
                </div>
                <div class="category-picker" id="budgetCategoryPicker" style="display:none;margin-top:8px;max-height:200px;overflow-y:auto;">
                    ${catPickerHTML}
                </div>
            </div>
            <div class="form-group">
                <label>Jumlah Anggaran (Rp)</label>
                <div class="input-with-icon">
                    <span class="input-icon">${renderEmojiOrIcon('wallet', '18px')}</span>
                    <input type="text" id="budgetAmount" placeholder="Rp 0" value="${existingAmount ? 'Rp ' + parseInt(existingAmount).toLocaleString('id-ID') : ''}" required inputmode="numeric">
                </div>
            </div>
            <button class="modal-submit-btn success-btn" id="budgetSubmitBtn">Simpan Anggaran</button>
        `;
        openModal('Atur Anggaran', html);
        setTimeout(() => lucide.createIcons(), 50);
        setTimeout(() => initRupiahFormatter('budgetAmount'), 100);
        
        // Setup existing category name if any
        if (existingCatId) {
            let catName = 'Pilih kategori...';
            let catEmoji = 'tag';
            categories.forEach(c => {
                if (c.id == existingCatId) { catName = c.name; catEmoji = c.emoji; }
                if (c.children) {
                    c.children.forEach(ch => { if (ch.id == existingCatId) { catName = ch.name; catEmoji = ch.emoji; } });
                }
            });
            const wrapper = document.querySelector('#budgetSelectedCategory .select-category-icon-wrapper');
            if (wrapper) wrapper.innerHTML = renderEmojiOrIcon(catEmoji, '18px');
            const text = document.querySelector('#budgetSelectedCategory .select-category-text');
            if (text) text.textContent = catName;
            document.getElementById('budgetSelectedCategory').classList.add('has-value');
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
                        const wrapper = document.querySelector('#budgetSelectedCategory .select-category-icon-wrapper');
                        if (wrapper) wrapper.innerHTML = renderEmojiOrIcon(parent.dataset.emoji, '18px');
                        const text = document.querySelector('#budgetSelectedCategory .select-category-text');
                        if (text) text.textContent = parent.dataset.name;
                        document.getElementById('budgetSelectedCategory').classList.add('has-value');
                        document.getElementById('budgetCategoryPicker').style.display = 'none';
                        setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 10);
                    }
                });
            });

            document.querySelectorAll('#budgetCategoryPicker .category-child').forEach(child => {
                child.addEventListener('click', () => {
                    document.getElementById('budgetCategoryId').value = child.dataset.id;
                    const wrapper = document.querySelector('#budgetSelectedCategory .select-category-icon-wrapper');
                    if (wrapper) wrapper.innerHTML = renderEmojiOrIcon(child.dataset.emoji, '18px');
                    const text = document.querySelector('#budgetSelectedCategory .select-category-text');
                    if (text) text.textContent = child.dataset.name;
                    document.getElementById('budgetSelectedCategory').classList.add('has-value');
                    document.getElementById('budgetCategoryPicker').style.display = 'none';
                    setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 10);
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
                        body: JSON.stringify({ category_id, amount, month: currentBudgetMonth }),
                    });
                    closeModal();
                    showToast('Anggaran disimpan! 🎯');
                    loadBudgets();
                } catch (err) {
                    alert(err.message);
                }
            });
        }, 150);
    }
    
    async function deleteBudget(id) {
        if(!confirm('Hapus anggaran ini?')) return;
        try {
            await api(`budget.php?id=${id}`, { method: 'DELETE' });
            loadBudgets();
            showToast('Anggaran dihapus');
        } catch(e) { showToast(e.message); }
    }
