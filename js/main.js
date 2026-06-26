    // ===== INIT =====
    function init() {
        updateTime();
        setInterval(updateTime, 30000);

        initAuth();
        initTheme();
        initNavigation();
        initModal();
        initMonthNav();
        
        initPullToRefresh();
        initSwipeToDelete(document.getElementById('transactionsList'));
        initOfflineMode();
        loadAuthConfig();
        initProfileFeatures();
        initPushNotification();
        initAIChat();

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').then(reg => {
                reg.update();
            }).catch(e => console.error('SW init failed:', e));
        }

        // Button handlers
        document.getElementById('addIncomeBtn').addEventListener('click', () => showTransactionForm('income'));
        document.getElementById('addExpenseBtn').addEventListener('click', () => showTransactionForm('expense'));
        document.getElementById('addSavingBtn').addEventListener('click', showSavingsForm);
        
        const scanReceiptBtn = document.getElementById('scanReceiptBtn');
        if (scanReceiptBtn) scanReceiptBtn.addEventListener('click', showScanReceiptForm);

        const exportBtn = document.getElementById('exportReportBtn');
        if (exportBtn) exportBtn.addEventListener('click', exportAnalyticsAsPng);
        
        const exportPdfBtn = document.getElementById('exportReportPdfBtn');
        if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportAnalyticsAsPdf);
        
        const addBudgetBtn = document.getElementById('addBudgetBtn');
        if (addBudgetBtn) addBudgetBtn.addEventListener('click', showBudgetForm);
        
        const pbBtn = document.getElementById('prevBudgetMonth');
        if (pbBtn) pbBtn.addEventListener('click', () => {
            const d = new Date(currentBudgetMonth + '-01'); d.setMonth(d.getMonth() - 1);
            currentBudgetMonth = d.toISOString().slice(0, 7); loadBudgets();
        });
        
        const nbBtn = document.getElementById('nextBudgetMonth');
        if (nbBtn) nbBtn.addEventListener('click', () => {
            const d = new Date(currentBudgetMonth + '-01'); d.setMonth(d.getMonth() + 1);
            currentBudgetMonth = d.toISOString().slice(0, 7); loadBudgets();
        });

        // Expose for inline onclick
        window.Selaraskas = {
        showBudgetForm, deleteTransaction, deleteSaving, deleteBudget, showAddToSaving, showScanReceiptForm, registerBiometric,
        openWalletMembers: async function() {
            const walletId = document.getElementById('walletSwitcherGlobal').value;
            if (!walletId) return;
            const html = `
                <div style="display:flex; gap:8px; margin-bottom:16px;">
                    <input type="email" id="inviteEmail" class="form-input" placeholder="Email teman..." style="flex:1">
                    <button class="btn btn-primary" onclick="window.Selaraskas.inviteWalletMember(${walletId})">Undang</button>
                </div>
                <div id="walletMembersList" style="display:flex; flex-direction:column; gap:12px;">
                    <div style="text-align:center; color:var(--text-secondary); padding:20px;">Memuat anggota...</div>
                </div>
            `;
            openModal('Kelola Anggota Dompet', html);
            window.Selaraskas.loadWalletMembers(walletId);
        },
        loadWalletMembers: async function(walletId) {
            const listDiv = document.getElementById('walletMembersList');
            if (!listDiv) return;
            try {
                const res = await api('wallets.php?action=list_members&wallet_id=' + walletId);
                if (res && res.success && res.members) {
                    listDiv.innerHTML = '';
                    res.members.forEach(m => {
                        let roleBadge = m.role === 'owner' ? '<span style="background:var(--color-primary); color:#fff; font-size:10px; padding:2px 6px; border-radius:12px;">Owner</span>' : '<span style="background:rgba(255,255,255,0.1); font-size:10px; padding:2px 6px; border-radius:12px;">' + escapeHTML(m.role) + '</span>';
                        let deleteBtn = (res.my_role === 'owner' && m.id !== window.currentUserId) ? 
                            `<button onclick="window.Selaraskas.removeWalletMember(${parseInt(walletId)}, ${parseInt(m.id)})" style="background:var(--color-danger); color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:12px; cursor:pointer;">Hapus</button>` : '';
                        
                        listDiv.innerHTML += `
                            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <div class="avatar" style="width:32px; height:32px; font-size:14px;"><span>${escapeHTML(m.avatar_initial || '?')}</span></div>
                                    <div>
                                        <div style="font-size:14px; font-weight:600;">${escapeHTML(m.name)} ${roleBadge}</div>
                                        <div style="font-size:12px; color:var(--text-secondary);">${escapeHTML(m.email)}</div>
                                    </div>
                                </div>
                                ${deleteBtn}
                            </div>
                        `;
                    });
                }
            } catch (err) {
                listDiv.innerHTML = `<div style="color:var(--color-danger); text-align:center;">Gagal memuat: ${err.message}</div>`;
            }
        },
        inviteWalletMember: async function(walletId) {
            const emailInput = document.getElementById('inviteEmail');
            const email = emailInput.value.trim();
            if (!email) return alert('Masukkan email');
            try {
                const res = await api('wallets.php?action=invite', {
                    method: 'POST',
                    body: JSON.stringify({ wallet_id: walletId, email: email })
                });
                if (res && res.success) {
                    showToast('Berhasil mengundang anggota');
                    emailInput.value = '';
                    window.Selaraskas.loadWalletMembers(walletId);
                } else {
                    alert(res.error || 'Gagal mengundang');
                }
            } catch (err) {
                alert(err.message || 'Gagal mengundang anggota');
            }
        },
        removeWalletMember: async function(walletId, userId) {
            if (!confirm('Yakin ingin mengeluarkan anggota ini dari dompet?')) return;
            try {
                const res = await api('wallets.php?action=remove_member', {
                    method: 'POST',
                    body: JSON.stringify({ wallet_id: walletId, user_id: userId })
                });
                if (res && res.success) {
                    showToast('Anggota dikeluarkan');
                    window.Selaraskas.loadWalletMembers(walletId);
                } else {
                    alert(res.error || 'Gagal mengeluarkan');
                }
            } catch (err) {
                alert(err.message || 'Gagal mengeluarkan anggota');
            }
        },
        deleteBiometricCred: async function(id) {
            if (!confirm('Hapus sidik jari ini?')) return;
            try {
                await api('auth.php?action=webauthn_credentials', {
                    method: 'DELETE',
                    body: JSON.stringify({ id })
                });
                showToast('Credential dihapus');
                loadBiometricSettings();
            } catch (err) {
                showToast(err.message || 'Gagal menghapus');
            }
        },
        openSupportModal: function() {
            document.getElementById('modalSupport').classList.add('active');
            setTimeout(() => {
                document.getElementById('supportChatInput').focus();
            }, 100);
        },
        closeSupportModal: function() {
            document.getElementById('modalSupport').classList.remove('active');
        },
        sendSupportMessage: async function() {
            const input = document.getElementById('supportChatInput');
            const msg = input.value.trim();
            if (!msg) return;

            const chatArea = document.getElementById('supportChatArea');
            chatArea.innerHTML += `
                <div class="chat-message user-message" style="display:flex; gap:10px; align-items:flex-end; justify-content:flex-end;">
                    <div class="chat-bubble" style="background:var(--color-primary); color:white; padding:10px 14px; border-radius:12px 12px 0 12px; font-size:14px; line-height:1.4; box-shadow:0 2px 5px rgba(0,0,0,0.1); max-width:85%;">
                        ${escapeHTML(msg)}
                    </div>
                </div>
            `;
            input.value = '';
            chatArea.scrollTop = chatArea.scrollHeight;

            const typingId = 'typing-' + Date.now();
            chatArea.innerHTML += `
                <div id="${typingId}" class="chat-message ai-message" style="display:flex; gap:10px; align-items:flex-start;">
                    <div class="chat-avatar" style="width:30px; height:30px; border-radius:50%; background:var(--color-primary); display:flex; align-items:center; justify-content:center; color:white; font-size:14px; flex-shrink:0;">🤖</div>
                    <div class="chat-bubble" style="background:var(--bg-card); padding:10px 14px; border-radius:0 12px 12px 12px; font-size:14px; color:var(--text-muted); font-style:italic;">
                        Mengetik...
                    </div>
                </div>
            `;
            chatArea.scrollTop = chatArea.scrollHeight;

            try {
                const res = await api('ai_chat.php?action=support', {
                    method: 'POST',
                    body: JSON.stringify({ message: msg })
                });
                
                const typingEl = document.getElementById(typingId);
                if (typingEl) typingEl.remove();
                if (res.error) throw new Error(res.error);
                
                let replyHtml = escapeHTML(res.reply).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                
                chatArea.innerHTML += `
                    <div class="chat-message ai-message" style="display:flex; gap:10px; align-items:flex-start;">
                        <div class="chat-avatar" style="width:30px; height:30px; border-radius:50%; background:var(--color-primary); display:flex; align-items:center; justify-content:center; color:white; font-size:14px; flex-shrink:0;">🤖</div>
                        <div class="chat-bubble" style="background:var(--bg-card); padding:10px 14px; border-radius:0 12px 12px 12px; font-size:14px; line-height:1.4; box-shadow:0 2px 5px rgba(0,0,0,0.05); color:var(--text-color);">
                            ${replyHtml}
                        </div>
                    </div>
                `;
            } catch (err) {
                const typingEl = document.getElementById(typingId);
                if (typingEl) typingEl.remove();
                chatArea.innerHTML += `
                    <div class="chat-message ai-message" style="display:flex; gap:10px; align-items:flex-start;">
                        <div class="chat-avatar" style="width:30px; height:30px; border-radius:50%; background:var(--danger-color); display:flex; align-items:center; justify-content:center; color:white; font-size:14px; flex-shrink:0;">⚠️</div>
                        <div class="chat-bubble" style="background:var(--bg-card); padding:10px 14px; border-radius:0 12px 12px 12px; font-size:14px; color:var(--danger-color);">
                            ${escapeHTML(err.message || 'Gagal menghubungi server')}
                        </div>
                    </div>
                `;
            }
            chatArea.scrollTop = chatArea.scrollHeight;
        },
        contactAdmin: function(type) {
            const adminWA = '6281385084327';
            const adminEmail = 'rizkidwisandy1@gmail.com';
            
            if (type === 'wa') {
                const msg = 'Halo Admin SelarasKas, saya butuh bantuan.';
                window.open(`https://wa.me/${adminWA}?text=${encodeURIComponent(msg)}`, '_blank');
            } else if (type === 'email') {
                window.location.href = `mailto:${adminEmail}?subject=Bantuan SelarasKas`;
            }
        }
        };

        // Check session
        checkSession();
    }
