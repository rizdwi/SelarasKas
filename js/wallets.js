    // ===== WALLETS =====
    async function loadWallets() {
        try {
            const data = await api('wallets.php?action=list');
            if (data && data.wallets) {
                const switcher = document.getElementById('walletSwitcherGlobal');
                if (switcher) {
                    switcher.innerHTML = '';
                    let activeName = 'Dompet';
                    let myWalletRole = '';
                    data.wallets.forEach(w => {
                        const opt = document.createElement('option');
                        opt.value = w.id;
                        let typeIcon = w.type === 'shared' ? '👥 ' : '👤 ';
                        let roleIcon = w.role === 'owner' ? '👑 ' : '';
                        opt.textContent = typeIcon + roleIcon + w.name;
                        if (w.is_active) {
                            opt.selected = true;
                            activeName = w.name;
                            myWalletRole = w.role;
                        }
                        switcher.appendChild(opt);
                    });
                    
                    // Sembunyikan tombol kelola jika bukan owner
                    const manageBtn = document.getElementById('manageWalletBtn');
                    if (manageBtn) {
                        manageBtn.style.display = (myWalletRole === 'owner') ? 'flex' : 'none';
                    }
                    
                    switcher.onchange = async (e) => {
                        const newWalletId = e.target.value;
                        if (!newWalletId) return;
                        try {
                            const res = await api('wallets.php?action=switch', {
                                method: 'POST',
                                body: JSON.stringify({ wallet_id: newWalletId })
                            });
                            if (res && res.success) {
                                loadDashboard();
                                const activeNavItem = document.querySelector('.nav-item.active');
                                const activePage = activeNavItem ? activeNavItem.dataset.page : 'home';
                                if (activePage === 'analytics') loadAnalytics();
                                if (activePage === 'budget') loadBudgets();
                                if (activePage === 'savings') loadSavings();
                            } else {
                                alert(res.error || 'Gagal pindah dompet');
                            }
                        } catch (err) {
                            alert('Terjadi kesalahan saat pindah dompet');
                        }
                    };
                }
            }
        } catch (err) {
            console.error('Wallet load error:', err);
        }
    }
