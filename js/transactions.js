    // ===== TRANSACTIONS =====
    function renderTransactions(container, txList) {
        if (!txList || !txList.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📝</span>
                    <span class="empty-text">Belum ada transaksi</span>
                    <span class="empty-sub">Tap Pemasukan / Pengeluaran untuk menambahkan</span>
                </div>`;
            return;
        }

        let html = '';
        let lastDate = '';

        txList.forEach(tx => {
            const dateLabel = formatDate(tx.transaction_date);
            if (dateLabel !== lastDate) {
                lastDate = dateLabel;
                html += `<div class="transaction-date-header">${dateLabel}</div>`;
            }
            const isIncome = tx.type === 'income';
            const catName = tx.parent_category_name || tx.category_name || 'Lainnya';
            const iconName = tx.emoji || 'box';
            const iconColor = tx.color || '#94a3b8';
            const bg = tx.color ? tx.color + '18' : 'rgba(148,163,184,0.1)';

            html += `
                <div class="transaction-item fade-in-up" data-id="${tx.id}">
                    <div class="transaction-content">
                        <div class="transaction-icon" style="background:${bg}; display:flex; align-items:center; justify-content:center;">${renderEmojiOrIcon(iconName, '20px', iconColor)}</div>
                        <div class="transaction-details">
                            <span class="transaction-name">${escapeHTML(tx.description || tx.category_name || 'Transaksi')}</span>
                            <span class="transaction-category">${escapeHTML(catName)}</span>
                        </div>
                        <div class="transaction-amount-col">
                            <span class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                                ${isIncome ? '+' : '-'}${formatRp(tx.amount)}
                            </span>
                        </div>
                        <button class="transaction-delete" onclick="event.stopPropagation(); window.Selaraskas.deleteTransaction(${tx.id})">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>`;
        });

        container.innerHTML = html;
        setTimeout(() => lucide.createIcons(), 50);
    }

    // ===== TRANSACTION FORM =====
    let categoriesCache = {};

    async function loadCategories(type) {
        if (categoriesCache[type]) return categoriesCache[type];
        const data = await api(`categories.php?type=${type}`);
        categoriesCache[type] = data.categories;
        return data.categories;
    }

    async function showTransactionForm(type) {
        const title = type === 'income' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran';
        const categories = await loadCategories(type);

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

        const formHTML = `
            <div class="form-group">
                <label>Jumlah (Rp)</label>
                <div class="input-with-icon">
                    <span class="input-icon">${renderEmojiOrIcon('banknote', '18px')}</span>
                    <input type="text" id="txAmount" placeholder="Rp 0" required inputmode="numeric">
                </div>
            </div>
            <div class="form-group">
                <label>Kategori</label>
                <input type="hidden" id="txCategoryId" value="">
                <div id="selectedCategory" class="select-category-trigger" onclick="document.getElementById('categoryPicker').style.display=document.getElementById('categoryPicker').style.display==='none'?'flex':'none'">
                    <span class="select-category-icon-wrapper">
                        <span class="input-icon">${renderEmojiOrIcon('tag', '18px')}</span>
                    </span>
                    <span class="select-category-text">Pilih kategori...</span>
                </div>
                <div class="category-picker" id="categoryPicker" style="display:none;margin-top:8px;max-height:200px;overflow-y:auto;">
                    ${catPickerHTML}
                </div>
            </div>
            <div class="form-group">
                <label>Keterangan (opsional)</label>
                <div class="input-with-icon">
                    <span class="input-icon">${renderEmojiOrIcon('document', '18px')}</span>
                    <input type="text" id="txDescription" placeholder="Contoh: Beli sayur di pasar">
                </div>
            </div>
            <div class="form-group">
                <label>Tanggal</label>
                <div class="input-with-icon">
                    <span class="input-icon">${renderEmojiOrIcon('calendar', '18px')}</span>
                    <input type="date" id="txDate" value="${new Date().toISOString().slice(0, 10)}" onclick="this.showPicker()">
                </div>
            </div>
            <button class="modal-submit-btn ${type === 'income' ? 'success-btn' : ''}" id="txSubmitBtn">
                ${type === 'income' ? '💰 Simpan Pemasukan' : '💸 Simpan Pengeluaran'}
            </button>`;

        openModal(title, formHTML);
        setTimeout(() => lucide.createIcons(), 50);
        setTimeout(() => initRupiahFormatter('txAmount'), 100);

        // Category picker logic
        setTimeout(() => {
            document.querySelectorAll('.category-parent').forEach(parent => {
                parent.addEventListener('click', () => {
                    const hasChildren = parent.dataset.hasChildren === 'true';
                    if (hasChildren) {
                        // Toggle children
                        const children = parent.nextElementSibling;
                        const isOpen = children.classList.contains('show');
                        document.querySelectorAll('.category-children').forEach(c => c.classList.remove('show'));
                        document.querySelectorAll('.category-parent').forEach(p => p.classList.remove('expanded'));
                        if (!isOpen) {
                            children.classList.add('show');
                            parent.classList.add('expanded');
                        }
                    } else {
                        // Select parent directly
                        selectCategory(parent.dataset.id, parent.dataset.name, parent.dataset.emoji);
                    }
                });
            });

            document.querySelectorAll('.category-child').forEach(child => {
                child.addEventListener('click', () => {
                    selectCategory(child.dataset.id, child.dataset.name, child.dataset.emoji);
                });
            });

            function selectCategory(id, name, emojiOrIcon) {
                document.getElementById('txCategoryId').value = id;
                const wrapper = document.querySelector('#selectedCategory .select-category-icon-wrapper');
                if (wrapper) wrapper.innerHTML = renderEmojiOrIcon(emojiOrIcon, '18px');
                const text = document.querySelector('#selectedCategory .select-category-text');
                if (text) text.textContent = name;
                document.getElementById('selectedCategory').classList.add('has-value');
                document.getElementById('categoryPicker').style.display = 'none';
                document.querySelectorAll('.category-child').forEach(c => c.classList.remove('selected'));
                const sel = document.querySelector(`.category-child[data-id="${id}"]`);
                if (sel) sel.classList.add('selected');
                setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 10);
            }

            // Submit
            document.getElementById('txSubmitBtn').addEventListener('click', async () => {
                const amount = parseRupiah(document.getElementById('txAmount').value);
                const categoryId = document.getElementById('txCategoryId').value;
                const description = document.getElementById('txDescription').value;
                const date = document.getElementById('txDate').value;

                if (!amount || amount <= 0) { showToast('Masukkan jumlah yang valid'); return; }
                if (!categoryId) { showToast('Pilih kategori'); return; }

                try {
                    await api('transactions.php', {
                        method: 'POST',
                        body: JSON.stringify({ category_id: categoryId, amount, type, description, transaction_date: date }),
                    });
                    closeModal();
                    showToast(type === 'income' ? 'Pemasukan ditambahkan! 💰' : 'Pengeluaran dicatat! 📝');
                    loadDashboard();
        setTimeout(() => lucide.createIcons(), 50);
                } catch (err) {
                    showToast(err.message);
                }
            });
        }, 100);
    }
