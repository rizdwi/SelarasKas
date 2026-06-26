    // ===== SAVINGS =====
    async function loadSavings() {
        try {
            const data = await api('savings.php');
            document.getElementById('savingsTotalAmount').textContent = formatRp(data.total_saved);
            renderSavingsGoals(data.goals);
            setTimeout(() => lucide.createIcons(), 50);
        } catch (err) {
            console.error('Savings error:', err);
        }
    }

    function renderSavingsGoals(goals) {
        const el = document.getElementById('savingsGoalsList');
        if (!goals || !goals.length) {
            el.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🎯</span>
                    <span class="empty-text">Belum ada target nabung</span>
                    <span class="empty-sub">Tap + untuk membuat target</span>
                </div>`;
            return;
        }

        el.innerHTML = goals.map(g => {
            const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0;
            const deadlineStr = g.deadline ? new Date(g.deadline).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }) : '';
            const safeTitle = escapeHTML(g.title);
            const escapedOnclickTitle = escapeHTML(g.title.replace(/'/g, "\\'"));
            return `
                <div class="savings-goal-card">
                    <div class="savings-goal-top">
                        <div class="savings-goal-emoji" style="background:${g.color}18; display:flex; align-items:center; justify-content:center;">
                            ${renderEmojiOrIcon(g.emoji, '24px', g.color)}
                        </div>
                        <div class="savings-goal-info">
                            <span class="savings-goal-title">${safeTitle}</span>
                            <span class="savings-goal-amounts">${formatRp(g.current_amount, true)} / ${formatRp(g.target_amount, true)}</span>
                        </div>
                        <div class="savings-goal-actions">
                            <button class="savings-action-add" onclick="event.stopPropagation(); window.Selaraskas.showAddToSaving(${g.id}, '${escapedOnclickTitle}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </button>
                            <button class="savings-action-delete" onclick="event.stopPropagation(); window.Selaraskas.deleteSaving(${g.id})">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="savings-progress-bar">
                        <div class="savings-progress-fill" style="width:${pct}%;background:${g.color}"></div>
                    </div>
                    <div class="savings-progress-row">
                        <span class="savings-progress-text" style="color:${g.color}">${pct}%</span>
                        ${deadlineStr ? `<span class="savings-deadline">🗓 ${deadlineStr}</span>` : ''}
                    </div>
                </div>`;
        }).join('');
    }

    // ===== SAVINGS FORM =====
    function showSavingsForm() {
        let selectedIcon = 'target';
        let selectedColor = '#818cf8';

        const formHTML = `
            <div class="form-group">
                <label>Nama Target</label>
                <div class="input-with-icon">
                    <span class="input-icon">${renderEmojiOrIcon('flag', '18px')}</span>
                    <input type="text" id="savingTitle" placeholder="Contoh: Dana Liburan" required>
                </div>
            </div>
            <div class="form-group">
                <label>Target (Rp)</label>
                <div class="input-with-icon">
                    <span class="input-icon">${renderEmojiOrIcon('banknote', '18px')}</span>
                    <input type="text" id="savingTarget" placeholder="Rp 0" required inputmode="numeric">
                </div>
            </div>
            <div class="form-group">
                <label>Sudah Terkumpul (Rp)</label>
                <div class="input-with-icon">
                    <span class="input-icon">${renderEmojiOrIcon('piggy-bank', '18px')}</span>
                    <input type="text" id="savingCurrent" placeholder="Rp 0" value="Rp 0" inputmode="numeric">
                </div>
            </div>
            <div class="form-group">
                <label>Deadline (opsional)</label>
                <div class="input-with-icon">
                    <span class="input-icon">${renderEmojiOrIcon('calendar', '18px')}</span>
                    <input type="date" id="savingDeadline" onclick="this.showPicker()">
                </div>
            </div>
            <div class="form-group">
                <label>Ikon Target</label>
                <div class="emoji-grid">
                    ${SAVINGS_ICONS.map(i => `<div class="icon-option ${i === selectedIcon ? 'selected' : ''}" data-icon="${i}">${renderEmojiOrIcon(i, '20px')}</div>`).join('')}
                </div>
            </div>
            <button class="modal-submit-btn success-btn" id="savingSubmitBtn">${renderEmojiOrIcon('plus-circle', '18px', '', 'margin-right:6px;vertical-align:-4px')} Buat Target</button>`;

        openModal('Target Nabung Baru', formHTML);
        setTimeout(() => lucide.createIcons(), 50);
        setTimeout(() => { initRupiahFormatter('savingTarget'); initRupiahFormatter('savingCurrent'); }, 100);

        setTimeout(() => {
            document.querySelectorAll('.icon-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    selectedIcon = opt.dataset.icon;
                });
            });

            document.getElementById('savingSubmitBtn').addEventListener('click', async () => {
                const title = document.getElementById('savingTitle').value.trim();
                const target = parseRupiah(document.getElementById('savingTarget').value);
                const current = parseRupiah(document.getElementById('savingCurrent').value) || 0;
                const deadline = document.getElementById('savingDeadline').value || null;

                if (!title) { showToast('Masukkan nama target'); return; }
                if (!target || target <= 0) { showToast('Masukkan target yang valid'); return; }

                const colorIdx = Math.floor(Math.random() * SAVINGS_COLORS.length);
                try {
                    await api('savings.php', {
                        method: 'POST',
                        body: JSON.stringify({ title, emoji: selectedIcon, target_amount: target, current_amount: current, deadline, color: SAVINGS_COLORS[colorIdx] }),
                    });
                    closeModal();
                    showToast('Target nabung dibuat! 🎯');
                    loadSavings();
                } catch (err) { showToast(err.message); }
            });
        }, 100);
    }

    function showAddToSaving(id, title) {
        const formHTML = `
            <p style="font-size:14px;color:var(--text-secondary);margin-bottom:12px;">Menambah ke: <strong>${escapeHTML(title)}</strong></p>
            <div class="form-group">
                <label>Jumlah Tambah (Rp)</label>
                <div class="input-with-icon">
                    <span class="input-icon">${renderEmojiOrIcon('banknote', '18px')}</span>
                    <input type="text" id="addSavingAmount" placeholder="Rp 0" required inputmode="numeric">
                </div>
            </div>
            <button class="modal-submit-btn success-btn" id="addSavingSubmitBtn">💰 Tambah Tabungan</button>`;

        openModal('Tambah Tabungan', formHTML);
        setTimeout(() => lucide.createIcons(), 50);
        setTimeout(() => initRupiahFormatter('addSavingAmount'), 100);

        setTimeout(() => {
            document.getElementById('addSavingSubmitBtn').addEventListener('click', async () => {
                const amount = parseRupiah(document.getElementById('addSavingAmount').value);
                if (!amount || amount <= 0) { showToast('Masukkan jumlah yang valid'); return; }

                try {
                    await api('savings.php', {
                        method: 'PUT',
                        body: JSON.stringify({ id, add_amount: amount }),
                    });
                    closeModal();
                    showToast('Tabungan ditambahkan! 💰');
                    loadSavings();
                } catch (err) { showToast(err.message); }
            });
        }, 100);
    }
