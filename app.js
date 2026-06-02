/* ============================================
   FinFlow — Personal Finance App
   Full Application Logic
   ============================================ */

(function () {
    'use strict';

    // ===== CONFIG =====
    const API = 'api';
    let currentUser = null;
    let authConfig = { google_client_id: '', facebook_app_id: '' };
    let currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const SAVINGS_ICONS = ['target','plane','laptop','home','car','smartphone','gem','graduation-cap','umbrella','landmark','gift','building'];
    const SAVINGS_COLORS = ['#818cf8','#34d399','#fbbf24','#ff6b6b','#f472b6','#38bdf8','#a78bfa','#fb923c'];

    // ===== API CLIENT =====
    async function api(endpoint, options = {}) {
        try {
            const res = await fetch(`${API}/${endpoint}`, {
                headers: { 'Content-Type': 'application/json' },
                ...options,
            });
            const data = await res.json();
            if (!res.ok) {
                const err = new Error(data.error || 'Request failed');
                // Pass through verification data for OTP flow
                if (data.needs_verification) {
                    err.needs_verification = true;
                    err.email = data.email;
                    err.message = data.message || data.error;
                }
                if (data.wait) err.wait = data.wait;
                throw err;
            }
            return data;
        } catch (err) {
            if (err.message && err.message.includes('Unauthorized')) {
                showAuth();
            }
            throw err;
        }
    }

    // ===== UTILITIES =====
    
    function parseRupiah(str) {
        if (!str) return 0;
        return parseInt(str.toString().replace(/[^0-9]/g, '')) || 0;
    }

    function initRupiahFormatter(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        function formatValue() {
            let val = input.value.replace(/[^0-9]/g, '');
            if (val === '' || val === '0') { input.value = ''; return; }
            input.value = 'Rp ' + parseInt(val).toLocaleString('id-ID');
        }
        
        // Format existing value immediately if present
        if (input.value && input.value.trim() !== '') {
            formatValue();
        }
        
        input.addEventListener('input', formatValue);
    }

    function formatRp(amount, short = false) {
        const abs = Math.abs(Number(amount));
        if (short && abs >= 1000000) return 'Rp ' + (abs / 1000000).toFixed(1) + ' Jt';
        if (short && abs >= 1000) return 'Rp ' + (abs / 1000).toFixed(0) + ' Rb';
        return 'Rp ' + abs.toLocaleString('id-ID');
    }

    // Safely resolve a Lucide icon name, falling back to 'box' for missing/emoji values
    function safeIcon(name) {
        if (!name || name.length < 3) return 'box';
        return name;
    }

    // Render either an emoji character or a Lucide icon depending on the value
    function renderEmojiOrIcon(emojiOrIcon, size = '16px', color = '', extraStyles = '') {
        if (!emojiOrIcon) {
            return `<i data-lucide="box" style="width:${size}; height:${size}; color:${color}; ${extraStyles}"></i>`;
        }
        // If it looks like a Lucide icon (3+ chars, lowercase, numbers, hyphens only)
        if (/^[a-z0-9\-]{3,}$/.test(emojiOrIcon)) {
            return `<i data-lucide="${emojiOrIcon}" style="width:${size}; height:${size}; color:${color}; ${extraStyles}"></i>`;
        }
        // Otherwise treat it as a raw emoji character
        return `<span class="icon-emoji" style="font-size:${size}; line-height:1; display:inline-flex; align-items:center; justify-content:center; width:${size}; height:${size}; ${extraStyles}">${emojiOrIcon}</span>`;
    }

    function getGreeting() {
        const h = new Date().getHours();
        if (h < 11) return 'Selamat Pagi';
        if (h < 15) return 'Selamat Siang';
        if (h < 18) return 'Selamat Sore';
        return 'Selamat Malam';
    }

    function showToast(msg) {
        const t = document.getElementById('toast');
        document.getElementById('toastMessage').textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2500);
    }

    function formatMonthLabel(ym) {
        const [y, m] = ym.split('-');
        return MONTHS_ID[parseInt(m) - 1] + ' ' + y;
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        const today = new Date(); today.setHours(0,0,0,0);
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        if (d.getTime() === today.getTime()) return 'Hari Ini';
        if (d.getTime() === yesterday.getTime()) return 'Kemarin';
        return d.getDate() + ' ' + MONTHS_ID[d.getMonth()];
    }

    // ===== AUTH =====
    function showAuth() {
        document.getElementById('authScreen').classList.add('active');
        document.getElementById('mainApp').classList.remove('active');
        // Reset to login form, hide OTP
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const otpScreen = document.getElementById('otpScreen');
        if (loginForm) loginForm.classList.add('active');
        if (registerForm) registerForm.classList.remove('active');
        if (otpScreen) otpScreen.classList.remove('active');
        currentUser = null;
    }

    function showApp(user) {
        currentUser = user;
        document.getElementById('authScreen').classList.remove('active');
        document.getElementById('mainApp').classList.add('active');
        
        updateUserUI();
        
        if (user.theme === 'light') {
            document.body.classList.add('light-mode');
            document.getElementById('themeLabel').textContent = 'Light Mode';
        }

        loadDashboard();
        setTimeout(() => lucide.createIcons(), 50);
    }

    function updateUserUI() {
        if (!currentUser) return;
        
        const homeAvatarInitial = document.getElementById('avatarInitial');
        if (homeAvatarInitial) homeAvatarInitial.textContent = currentUser.avatar_initial || 'U';
        
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = currentUser.name;
        
        const greetingTextEl = document.getElementById('greetingText');
        if (greetingTextEl) greetingTextEl.textContent = getGreeting();
        
        const homeAvatarEl = document.getElementById('avatar');
        if (homeAvatarEl) {
            if (currentUser.avatar_url) {
                homeAvatarEl.style.backgroundImage = `url(${API}/../${currentUser.avatar_url})`;
                homeAvatarEl.style.backgroundSize = 'cover';
                homeAvatarEl.style.backgroundPosition = 'center';
                if (homeAvatarInitial) homeAvatarInitial.style.display = 'none';
            } else {
                homeAvatarEl.style.backgroundImage = 'none';
                if (homeAvatarInitial) homeAvatarInitial.style.display = 'inline-block';
            }
        }

        const profileNameEl = document.getElementById('profileName');
        if (profileNameEl) profileNameEl.textContent = currentUser.name;
        
        const profileEmailEl = document.getElementById('profileEmail');
        if (profileEmailEl) profileEmailEl.textContent = currentUser.email;

        const profileAvatarEl = document.querySelector('.profile-avatar');
        const profileInitialEl = document.getElementById('profileInitial');
        if (profileAvatarEl) {
            if (currentUser.avatar_url) {
                profileAvatarEl.style.backgroundImage = `url(${API}/../${currentUser.avatar_url})`;
                profileAvatarEl.style.backgroundSize = 'cover';
                profileAvatarEl.style.backgroundPosition = 'center';
                if (profileInitialEl) profileInitialEl.style.display = 'none';
            } else {
                profileAvatarEl.style.backgroundImage = 'none';
                if (profileInitialEl) {
                    profileInitialEl.style.display = 'inline-block';
                    profileInitialEl.textContent = currentUser.avatar_initial || 'U';
                }
            }
        }
    }

    function initAuth() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const otpScreen = document.getElementById('otpScreen');
        const authError = document.getElementById('authError');
        let pendingEmail = '';
        let resendCountdown = null;

        function showOtpScreen(email) {
            pendingEmail = email;
            loginForm.classList.remove('active');
            registerForm.classList.remove('active');
            otpScreen.classList.add('active');
            authError.textContent = '';
            document.getElementById('otpEmailDisplay').textContent = email;
            document.getElementById('otpError').textContent = '';
            // Clear OTP inputs
            document.querySelectorAll('.otp-digit').forEach(inp => {
                inp.value = '';
                inp.classList.remove('filled', 'error');
            });
            document.querySelector('.otp-digit[data-index="0"]').focus();
            startResendCountdown(60);
        }

        function startResendCountdown(seconds) {
            const btn = document.getElementById('otpResendBtn');
            const countdown = document.getElementById('otpCountdown');
            btn.disabled = true;
            let remaining = seconds;
            countdown.textContent = `(${remaining}s)`;
            if (resendCountdown) clearInterval(resendCountdown);
            resendCountdown = setInterval(() => {
                remaining--;
                countdown.textContent = `(${remaining}s)`;
                if (remaining <= 0) {
                    clearInterval(resendCountdown);
                    btn.disabled = false;
                    countdown.textContent = '';
                }
            }, 1000);
        }

        // OTP input logic
        const otpInputs = document.querySelectorAll('.otp-digit');
        otpInputs.forEach((input, idx) => {
            input.addEventListener('input', (e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                e.target.value = val ? val[val.length - 1] : '';
                if (val) {
                    e.target.classList.add('filled');
                    e.target.classList.remove('error');
                    if (idx < 5) otpInputs[idx + 1].focus();
                } else {
                    e.target.classList.remove('filled');
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && idx > 0) {
                    otpInputs[idx - 1].focus();
                    otpInputs[idx - 1].value = '';
                    otpInputs[idx - 1].classList.remove('filled');
                }
                if (e.key === 'Enter') {
                    document.getElementById('otpVerifyBtn').click();
                }
            });
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
                if (pasted.length === 6) {
                    pasted.split('').forEach((d, i) => {
                        otpInputs[i].value = d;
                        otpInputs[i].classList.add('filled');
                    });
                    otpInputs[5].focus();
                }
            });
        });

        // Verify OTP
        document.getElementById('otpVerifyBtn').addEventListener('click', async () => {
            const code = Array.from(otpInputs).map(i => i.value).join('');
            const otpError = document.getElementById('otpError');
            otpError.textContent = '';

            if (code.length !== 6) {
                otpError.textContent = 'Masukkan 6 digit kode verifikasi';
                otpInputs.forEach(i => i.classList.add('error'));
                return;
            }

            const btn = document.getElementById('otpVerifyBtn');
            btn.disabled = true;
            btn.querySelector('span').textContent = 'Memverifikasi...';

            try {
                const data = await api('auth.php?action=verify_email', {
                    method: 'POST',
                    body: JSON.stringify({ email: pendingEmail, code }),
                });
                showApp(data.user);
                showToast('Email berhasil diverifikasi! 🎉');
            } catch (err) {
                otpError.textContent = err.message;
                otpInputs.forEach(i => i.classList.add('error'));
                // Clear inputs for retry
                setTimeout(() => {
                    otpInputs.forEach(i => { i.value = ''; i.classList.remove('filled', 'error'); });
                    otpInputs[0].focus();
                }, 1500);
            } finally {
                btn.disabled = false;
                btn.querySelector('span').textContent = 'Verifikasi';
            }
        });

        // Resend code
        document.getElementById('otpResendBtn').addEventListener('click', async () => {
            const btn = document.getElementById('otpResendBtn');
            const otpError = document.getElementById('otpError');
            btn.disabled = true;
            try {
                const data = await api('auth.php?action=resend_code', {
                    method: 'POST',
                    body: JSON.stringify({ email: pendingEmail }),
                });
                otpError.textContent = '';
                showToast(data.message || 'Kode verifikasi baru telah dikirim! 📧');
                startResendCountdown(60);
                // Clear inputs
                otpInputs.forEach(i => { i.value = ''; i.classList.remove('filled', 'error'); });
                otpInputs[0].focus();
            } catch (err) {
                otpError.textContent = err.message;
                if (err.wait) startResendCountdown(err.wait);
                else btn.disabled = false;
            }
        });

        // Back from OTP
        document.getElementById('otpBackBtn').addEventListener('click', () => {
            otpScreen.classList.remove('active');
            registerForm.classList.add('active');
            if (resendCountdown) clearInterval(resendCountdown);
        });

        document.getElementById('showRegister').addEventListener('click', () => {
            loginForm.classList.remove('active');
            otpScreen.classList.remove('active');
            registerForm.classList.add('active');
            authError.textContent = '';
        });

        document.getElementById('showLogin').addEventListener('click', () => {
            registerForm.classList.remove('active');
            otpScreen.classList.remove('active');
            loginForm.classList.add('active');
            authError.textContent = '';
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            authError.textContent = '';
            const btn = document.getElementById('loginSubmitBtn');
            btn.disabled = true;
            try {
                const data = await api('auth.php?action=login', {
                    method: 'POST',
                    body: JSON.stringify({
                        email: document.getElementById('loginEmail').value,
                        password: document.getElementById('loginPassword').value,
                    }),
                });
                if (data.needs_verification) {
                    showOtpScreen(data.email);
                    showToast(data.message || 'Cek email untuk kode verifikasi 📧');
                } else {
                    showApp(data.user);
                }
            } catch (err) {
                // Check if server says needs verification (403)
                if (err.needs_verification && err.email) {
                    showOtpScreen(err.email);
                    showToast(err.message || 'Cek email untuk kode verifikasi 📧');
                } else {
                    authError.textContent = err.message;
                }
            } finally { btn.disabled = false; }
        });

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            authError.textContent = '';
            const btn = document.getElementById('registerSubmitBtn');
            btn.disabled = true;

            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerPasswordConfirm').value;

            if (password !== confirmPassword) {
                authError.textContent = 'Password dan konfirmasi password tidak cocok';
                btn.disabled = false;
                return;
            }

            try {
                const data = await api('auth.php?action=register', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: document.getElementById('registerName').value,
                        email: document.getElementById('registerEmail').value,
                        password: password,
                    }),
                });
                if (data.needs_verification) {
                    showOtpScreen(data.email);
                    showToast(data.message || 'Kode verifikasi telah dikirim! 📧');
                } else if (data.user) {
                    showApp(data.user);
                    showToast('Akun berhasil dibuat! 🎉');
                }
            } catch (err) {
                if (err.needs_verification && err.email) {
                    showOtpScreen(err.email);
                    showToast(err.message || 'Kode verifikasi telah dikirim! 📧');
                } else {
                    authError.textContent = err.message;
                }
            } finally { btn.disabled = false; }
        });

        // Toggle password visibility
        document.querySelectorAll('.password-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = btn.dataset.toggle;
                const input = document.getElementById(targetId);
                const icon = btn.querySelector('i');
                if (input && icon) {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
                    if (window.lucide) lucide.createIcons();
                }
            });
        });

        document.getElementById('logoutBtn').addEventListener('click', async () => {
            try { await api('auth.php?action=logout', { method: 'POST' }); } catch(e) {}
            showAuth();
            showToast('Berhasil keluar 👋');
        });
    }

    async function checkSession() {
        try {
            const data = await api('auth.php?action=check');
            if (data.authenticated) {
                showApp(data.user);
            } else {
                showAuth();
            }
        } catch {
            showAuth();
        }
    }

    // ===== THEME =====
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const label = document.getElementById('themeLabel');
        if (label) label.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
    }

    function initTheme() {
        const toggle = document.getElementById('themeToggle');
        const switchBtn = document.getElementById('themeSwitchBtn');

        async function toggleTheme() {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            if (currentUser) {
                currentUser.theme = next;
                try { await api('user.php', { method: 'PUT', body: JSON.stringify({ theme: next }) }); } catch(e) {}
            }
        }

        toggle.addEventListener('click', toggleTheme);
        if (switchBtn) switchBtn.addEventListener('click', toggleTheme);
    }

    // ===== NAVIGATION =====
    function initNavigation() {
        const navItems = document.querySelectorAll('#bottomNav .nav-item');
        const pages = document.querySelectorAll('.page');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const target = item.dataset.page;
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                pages.forEach(p => p.classList.remove('active'));
                const page = document.getElementById(`page-${target}`);
                if (page) { page.classList.add('active'); page.scrollTop = 0; }

                if (target === 'analytics') loadAnalytics();
                if (target === 'budget') loadBudgets();
                if (target === 'savings') loadSavings();
            });
        });

        // Quick nav from balance card
        document.getElementById('goSavingsBtn').addEventListener('click', () => {
            document.querySelector('[data-page="savings"]').click();
        });
    }

    // ===== DASHBOARD =====
    async function loadDashboard() {
        try {
            renderSkeletonTransactions(document.getElementById('transactionsList'));
            renderSkeletonChart(document.getElementById('spendingCategories'));
            
            const data = await api(`transactions.php?action=dashboard&month=${currentMonth}&limit=20`);

            renderBalance(data.summary);
            renderSpendingChart(data.chart);
            renderTransactions(document.getElementById('transactionsList'), data.transactions);
        } catch (err) {
            console.error('Dashboard error:', err);
        }
    }

    function renderBalance(data) {
        const el = document.getElementById('mainBalance');
        animateNumber(el, data.balance);

        const net = data.income - data.expense;
        const changeEl = document.getElementById('balanceChange');
        const changeText = document.getElementById('balanceChangeText');

        if (net > 0) {
            changeEl.className = 'balance-change positive';
            changeText.textContent = '+' + formatRp(net) + ' bulan ini';
        } else if (net < 0) {
            changeEl.className = 'balance-change negative';
            changeText.textContent = '-' + formatRp(Math.abs(net)) + ' bulan ini';
        } else {
            changeEl.className = 'balance-change neutral';
            changeText.textContent = 'Rp 0 bulan ini';
        }
    }

    function animateNumber(el, target) {
        const duration = 1000;
        const start = Date.now();
        const startVal = 0;
        function update() {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(startVal + (target - startVal) * eased);
            el.textContent = current.toLocaleString('id-ID');
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    // ===== SPENDING CHART =====
    function renderSpendingChart(chartItems) {
        const canvas = document.getElementById('spendingChart');
        if (!canvas) return;

        const total = chartItems ? chartItems.reduce((s, d) => s + parseFloat(d.total), 0) : 0;
        document.getElementById('chartTotalAmount').textContent = formatRp(total, true);

        // Render categories
        const catEl = document.getElementById('spendingCategories');
        if (catEl) {
            setTimeout(() => {
                if (window.lucide) lucide.createIcons();
            }, 50);
        }
        
        if (!chartItems || !chartItems.length || isNaN(total) || total <= 0) {
            if (catEl) catEl.innerHTML = '<div class="empty-state-small">Belum ada data</div>';
            // Clear canvas
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        if (catEl) {
            catEl.innerHTML = chartItems.slice(0, 5).map(item => `
                <div class="category-item">
                    <div class="category-dot" style="background:${item.color || '#94a3b8'}"></div>
                    <div class="category-info">
                        <span class="category-name" style="display:flex;align-items:center;gap:8px;">${renderEmojiOrIcon(item.emoji, '16px')} ${item.category_name}</span>
                        <span class="category-amount">${formatRp(item.total, true)} · ${((parseFloat(item.total) / total) * 100).toFixed(0)}%</span>
                    </div>
                </div>
            `).join('');
        }

        // Draw donut
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 150 * dpr;
        canvas.height = 150 * dpr;
        canvas.style.width = '120px';
        canvas.style.height = '120px';
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.scale(dpr, dpr);
        const cx = 75, cy = 75, r = 54, lw = 12, gap = 0.04;
        let angle = -Math.PI / 2;

        chartItems.forEach(item => {
            const val = parseFloat(item.total) || 0;
            const slice = Math.max(0, (val / total) * (2 * Math.PI) - gap);
            ctx.beginPath();
            ctx.arc(cx, cy, r, angle, angle + slice);
            ctx.strokeStyle = item.color || '#818cf8';
            ctx.lineWidth = lw;
            ctx.lineCap = 'round';
            ctx.stroke();
            angle += slice + gap;
        });
    }

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
            const catName = tx.parent_category_name ? tx.parent_category_name : tx.category_name;
            const iconName = tx.emoji || 'box';
            const iconColor = tx.color || '#94a3b8';
            const bg = tx.color ? tx.color + '18' : 'rgba(148,163,184,0.1)';

            html += `
                <div class="transaction-item fade-in-up" data-id="${tx.id}">
                    <div class="transaction-content">
                        <div class="transaction-icon" style="background:${bg}; display:flex; align-items:center; justify-content:center;">${renderEmojiOrIcon(iconName, '20px', iconColor)}</div>
                        <div class="transaction-details">
                            <span class="transaction-name">${tx.description || tx.category_name}</span>
                            <span class="transaction-category">${catName}</span>
                        </div>
                        <div class="transaction-amount-col">
                            <span class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                                ${isIncome ? '+' : '-'}${formatRp(tx.amount)}
                            </span>
                        </div>
                        <button class="transaction-delete" onclick="event.stopPropagation(); window.Selaraskas.deleteTransaction(${tx.id})">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>`;
        });

        container.innerHTML = html;
        setTimeout(() => lucide.createIcons(), 50);
    }

    // ===== ANALYTICS =====
    async function loadAnalytics() {
        document.getElementById('monthLabel').textContent = formatMonthLabel(currentMonth);

        try {
            renderSkeletonChart(document.getElementById('topSpendingList'));
            document.getElementById('comparisonCards').innerHTML = '<div class="skeleton sk-item"></div>';

            const [summary, chart, weekly, comparison] = await Promise.all([
                api(`transactions.php?action=summary&month=${currentMonth}`),
                api(`transactions.php?action=chart&month=${currentMonth}`),
                api(`transactions.php?action=weekly&month=${currentMonth}`),
                api(`transactions.php?action=comparison&month=${currentMonth}`)
            ]);

            document.getElementById('analyticsIncome').textContent = formatRp(summary.income);
            document.getElementById('analyticsExpense').textContent = formatRp(summary.expense);

            const incChange = document.getElementById('analyticsIncomeChange');
            const expChange = document.getElementById('analyticsExpenseChange');

            if (summary.income_change !== 0) {
                incChange.textContent = (summary.income_change > 0 ? '+' : '') + summary.income_change + '%';
                incChange.className = 'analytics-card-change ' + (summary.income_change >= 0 ? 'positive' : 'negative');
            } else { incChange.textContent = '—'; incChange.className = 'analytics-card-change'; }

            if (summary.expense_change !== 0) {
                expChange.textContent = (summary.expense_change > 0 ? '+' : '') + summary.expense_change + '%';
                expChange.className = 'analytics-card-change ' + (summary.expense_change <= 0 ? 'positive' : 'negative');
            } else { expChange.textContent = '—'; expChange.className = 'analytics-card-change'; }

            renderAnalyticsCashflowChart(weekly.weekly);
            renderTopSpending(chart.chart);
            renderComparisonCards(comparison);
        } catch (err) {
            console.error('Analytics error:', err);
        }
    }

    let cashflowChartInstance = null;
    function renderAnalyticsCashflowChart(data) {
        const ctx = document.getElementById('analyticsCashflowChart');
        if (!ctx) return;
        if (cashflowChartInstance) cashflowChartInstance.destroy();

        if (!data || !data.length) return;

        let totalIncome = 0;
        let totalExpense = 0;
        data.forEach(d => {
            totalIncome += parseFloat(d.income);
            totalExpense += parseFloat(d.expense);
        });

        cashflowChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pemasukan', 'Pengeluaran'],
                datasets: [{
                    data: [totalIncome, totalExpense],
                    backgroundColor: ['#34d399', '#ff6b6b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'right', labels: { color: 'var(--text-primary)' } },
                    tooltip: {
                        callbacks: { label: (ctx) => formatRp(ctx.raw) }
                    }
                }
            }
        });
    }

    function renderTopSpending(chart) {
        const el = document.getElementById('topSpendingList');
        if (!el) return;
        if (!chart || !chart.length) {
            el.innerHTML = '<div class="empty-state-small">Belum ada data</div>';
            return;
        }

        const max = parseFloat(chart[0].total) || 1;
        el.innerHTML = chart.slice(0, 5).map((item, i) => {
            const val = parseFloat(item.total) || 0;
            const pct = max > 0 ? (val / max) * 100 : 0;
            const rankClass = i < 3 ? `rank-${i + 1}` : '';
            return `
                <div class="top-spending-item">
                    <div class="top-spending-rank ${rankClass}" ${i >= 3 ? 'style="background:var(--bg-card);color:var(--text-muted);"' : ''}>
                        ${i + 1}
                    </div>
                    <div class="top-spending-icon" style="background:${item.color}18; display:flex; align-items:center; justify-content:center;">${renderEmojiOrIcon(item.emoji, '20px', item.color)}</div>
                    <div class="top-spending-info">
                        <span class="top-spending-name">${item.category_name}</span>
                        <div class="top-spending-bar">
                            <div class="top-spending-bar-fill" style="width:${pct}%;background:${item.color}"></div>
                        </div>
                    </div>
                    <span class="top-spending-amount">${formatRp(item.total, true)}</span>
                </div>`;
        }).join('');
    }

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
            return `
                <div class="savings-goal-card">
                    <div class="savings-goal-top">
                        <div class="savings-goal-emoji" style="background:${g.color}18; display:flex; align-items:center; justify-content:center;">
                            ${renderEmojiOrIcon(g.emoji, '24px', g.color)}
                        </div>
                        <div class="savings-goal-info">
                            <span class="savings-goal-title">${g.title}</span>
                            <span class="savings-goal-amounts">${formatRp(g.current_amount, true)} / ${formatRp(g.target_amount, true)}</span>
                        </div>
                        <div class="savings-goal-actions">
                            <button class="savings-action-add" onclick="event.stopPropagation(); window.Selaraskas.showAddToSaving(${g.id}, '${g.title}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </button>
                            <button class="savings-action-delete" onclick="event.stopPropagation(); window.Selaraskas.deleteSaving(${g.id})">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
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

    // ===== MODAL =====
    function openModal(title, bodyHTML) {
        const overlay = document.getElementById('modalOverlay');
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = bodyHTML;
        overlay.classList.add('active');
    }

    function closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
    }

    function initModal() {
        document.getElementById('modalClose').addEventListener('click', closeModal);
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeModal();
        });
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
                    <svg class="category-parent-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
                ${childrenHTML}`;
        }).join('');

        const formHTML = `
            <div class="form-group">
                <label>Jumlah (Rp)</label>
                <input type="text" id="txAmount" placeholder="Rp 0" required inputmode="numeric">
            </div>
            <div class="form-group">
                <label>Kategori</label>
                <input type="hidden" id="txCategoryId" value="">
                <div id="selectedCategory" style="padding:10px 12px;background:var(--bg-card);border-radius:10px;font-size:14px;color:var(--text-muted);border:1px solid var(--border-light);cursor:pointer;" onclick="document.getElementById('categoryPicker').style.display=document.getElementById('categoryPicker').style.display==='none'?'flex':'none'">
                    Pilih kategori...
                </div>
                <div class="category-picker" id="categoryPicker" style="display:none;margin-top:8px;max-height:200px;overflow-y:auto;">
                    ${catPickerHTML}
                </div>
            </div>
            <div class="form-group">
                <label>Keterangan (opsional)</label>
                <input type="text" id="txDescription" placeholder="Contoh: Beli sayur di pasar">
            </div>
            <div class="form-group">
                <label>Tanggal</label>
                <input type="date" id="txDate" value="${new Date().toISOString().slice(0, 10)}" onclick="this.showPicker()">
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
                document.getElementById('selectedCategory').innerHTML = `${renderEmojiOrIcon(emojiOrIcon, '16px')} ${name}`;
                document.getElementById('selectedCategory').style.color = 'var(--text-primary)';
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

    // ===== SAVINGS FORM =====
    function showSavingsForm() {
        let selectedIcon = 'target';
        let selectedColor = '#818cf8';

        const formHTML = `
            <div class="form-group">
                <label>Nama Target</label>
                <input type="text" id="savingTitle" placeholder="Contoh: Dana Liburan" required>
            </div>
            <div class="form-group">
                <label>Target (Rp)</label>
                <input type="text" id="savingTarget" placeholder="Rp 0" required inputmode="numeric">
            </div>
            <div class="form-group">
                <label>Sudah Terkumpul (Rp)</label>
                <input type="text" id="savingCurrent" placeholder="Rp 0" value="Rp 0" inputmode="numeric">
            </div>
            <div class="form-group">
                <label>Deadline (opsional)</label>
                <input type="date" id="savingDeadline" onclick="this.showPicker()">
            </div>
            <div class="form-group">
                <label>Ikon</label>
                <div class="emoji-grid">
                    ${SAVINGS_ICONS.map(i => `<div class="icon-option ${i === selectedIcon ? 'selected' : ''}" data-icon="${i}"><i data-lucide="${i}"></i></div>`).join('')}
                </div>
                </div>
            </div>
            <button class="modal-submit-btn success-btn" id="savingSubmitBtn"><i data-lucide="plus-circle" style="width:18px;height:18px;margin-right:6px;vertical-align:-4px"></i> Buat Target</button>`;

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
            <p style="font-size:14px;color:var(--text-secondary);margin-bottom:8px;">Menambah ke: <strong>${title}</strong></p>
            <div class="form-group">
                <label>Jumlah Tambah (Rp)</label>
                <input type="text" id="addSavingAmount" placeholder="Rp 0" required inputmode="numeric">
            </div>
            <button class="modal-submit-btn success-btn" id="addSavingSubmitBtn">💰 Tambah Tabungan</button>`;

        openModal('Tambah Tabungan', formHTML);
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

    // ===== DELETE =====
    async function deleteTransaction(id) {
        if (!confirm('Hapus transaksi ini?')) return;
        try {
            await api(`transactions.php?id=${id}`, { method: 'DELETE' });
            showToast('Transaksi dihapus');
            loadDashboard();
        setTimeout(() => lucide.createIcons(), 50);
        } catch (err) { showToast(err.message); }
    }

    async function deleteSaving(id) {
        if (!confirm('Hapus target nabung ini?')) return;
        try {
            await api(`savings.php?id=${id}`, { method: 'DELETE' });
            showToast('Target dihapus');
            loadSavings();
        } catch (err) { showToast(err.message); }
    }

    // ===== MONTH NAVIGATION =====
    function initMonthNav() {
        document.getElementById('prevMonth').addEventListener('click', () => {
            const d = new Date(currentMonth + '-01');
            d.setMonth(d.getMonth() - 1);
            currentMonth = d.toISOString().slice(0, 7);
            loadAnalytics();
        });
        document.getElementById('nextMonth').addEventListener('click', () => {
            const d = new Date(currentMonth + '-01');
            d.setMonth(d.getMonth() + 1);
            currentMonth = d.toISOString().slice(0, 7);
            loadAnalytics();
        });
    }

    // ===== TIME =====
    function updateTime() {
        const now = new Date();
        const el = document.getElementById('statusTime');
        if (el) el.textContent = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    }

    
    // ===== GOOGLE AUTH =====
    window.handleCredentialResponse = async function(response) {
        try {
            // decode jwt to get email and name locally (for simplicity, usually verify backend)
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            
            const data = await api('auth.php?action=google_login', {
                method: 'POST',
                body: JSON.stringify({
                    google_id: payload.sub,
                    email: payload.email,
                    name: payload.name,
                    avatar_url: payload.picture
                })
            });
            showApp(data.user);
            showToast('Berhasil login dengan Google! 🚀');
        } catch(e) {
            showToast(e.message);
        }
    };

    function showMockOAuthDialog(provider) {
        const title = provider === 'google' ? 'Simulator Login Google' : 'Simulator Login Facebook';
        const brandColor = provider === 'google' ? '#ea4335' : '#1877f2';
        
        const accounts = [
            { name: 'Budi Santoso', email: 'budi.santoso@gmail.com', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Budi%20Santoso' },
            { name: 'Rizki Pratama', email: 'rizz@email.com', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Rizki%20Pratama' },
            { name: 'Siti Aminah', email: 'siti.aminah@gmail.com', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Siti%20Aminah' }
        ];

        const html = `
            <div class="mock-oauth-container" style="padding: 10px 0;">
                <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px; text-align: center;">
                    Siklus login sosial menggunakan mode simulator di localhost. Silakan pilih akun simulasi untuk masuk:
                </p>
                <div class="mock-oauth-list" style="display: flex; flex-direction: column; gap: 12px;">
                    ${accounts.map(acc => `
                        <div class="mock-oauth-account-item" data-name="${acc.name}" data-email="${acc.email}" data-avatar="${acc.avatar}" style="display: flex; align-items: center; gap: 16px; padding: 12px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; cursor: pointer; transition: all 0.2s;">
                            <img src="${acc.avatar}" style="width: 40px; height: 40px; border-radius: 50%;" />
                            <div style="flex: 1; display: flex; flex-direction: column;">
                                <span style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${acc.name}</span>
                                <span style="font-size: 12px; color: var(--text-muted);">${acc.email}</span>
                            </div>
                            <div class="mock-oauth-badge" style="background:${brandColor}15; color:${brandColor}; font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 20px; text-transform: uppercase;">
                                ${provider}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        openModal(title, html);

        // Add interactive style dynamically
        const items = document.querySelectorAll('.mock-oauth-account-item');
        items.forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.borderColor = brandColor;
                item.style.transform = 'translateY(-2px)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.borderColor = 'var(--border-light)';
                item.style.transform = 'none';
            });

            item.addEventListener('click', async () => {
                const name = item.dataset.name;
                const email = item.dataset.email;
                const avatarUrl = item.dataset.avatar;
                const mockId = `mock_${provider}_` + btoa(email).replace(/=/g, '');

                closeModal();
                showToast(`Menghubungkan ke ${provider}...`);

                try {
                    let data;
                    if (provider === 'google') {
                        data = await api('auth.php?action=google_login', {
                            method: 'POST',
                            body: JSON.stringify({ google_id: mockId, name, email, avatar_url: avatarUrl })
                        });
                    } else {
                        data = await api('auth.php?action=facebook_login', {
                            method: 'POST',
                            body: JSON.stringify({ facebook_id: mockId, name, email, avatar_url: avatarUrl })
                        });
                    }
                    showApp(data.user);
                    showToast(`Berhasil login simulasi dengan ${provider}! 🚀`);
                } catch (err) {
                    showToast(err.message);
                }
            });
        });
    }

    function initGoogleAuth() {
        const isDummy = !authConfig.google_client_id || authConfig.google_client_id.includes('DUMMY');
        const btn1 = document.getElementById('googleAuthBtn');
        const btn2 = document.getElementById('googleAuthBtn2');

        if (isDummy) {
            const mockGoogleLogin = () => showMockOAuthDialog('google');
            if (btn1) btn1.addEventListener('click', mockGoogleLogin);
            if (btn2) btn2.addEventListener('click', mockGoogleLogin);
        } else {
            if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                try {
                    const tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: authConfig.google_client_id,
                        scope: 'openid profile email',
                        callback: async (tokenResponse) => {
                            if (tokenResponse && tokenResponse.access_token) {
                                try {
                                    showToast('Mengambil profil Google...');
                                    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                                    });
                                    if (!userInfoRes.ok) throw new Error('Gagal mengambil data profil Google');
                                    const userInfo = await userInfoRes.json();
                                    
                                    const data = await api('auth.php?action=google_login', {
                                        method: 'POST',
                                        body: JSON.stringify({
                                            google_id: userInfo.sub,
                                            name: userInfo.name,
                                            email: userInfo.email,
                                            avatar_url: userInfo.picture
                                        })
                                    });
                                    showApp(data.user);
                                    showToast('Berhasil login dengan Google! 🚀');
                                } catch (err) {
                                    showToast(err.message);
                                }
                            }
                        }
                    });

                    const triggerGoogleLogin = () => {
                        tokenClient.requestAccessToken({ prompt: 'consent' });
                    };

                    if (btn1) btn1.addEventListener('click', triggerGoogleLogin);
                    if (btn2) btn2.addEventListener('click', triggerGoogleLogin);
                } catch (e) {
                    console.error('Failed to initialize Google token client:', e);
                }
            } else {
                setTimeout(initGoogleAuth, 500); // Retry if SDK not loaded
            }
        }
    }

    // ===== FACEBOOK AUTH =====
    function initFacebookAuth() {
        const isDummy = !authConfig.facebook_app_id || authConfig.facebook_app_id.includes('DUMMY');
        const fbBtn1 = document.getElementById('facebookAuthBtn');
        const fbBtn2 = document.getElementById('facebookAuthBtn2');

        if (isDummy) {
            const mockFBLogin = () => showMockOAuthDialog('facebook');
            if (fbBtn1) fbBtn1.addEventListener('click', mockFBLogin);
            if (fbBtn2) fbBtn2.addEventListener('click', mockFBLogin);
        } else {
            window.fbAsyncInit = function() {
                FB.init({
                    appId      : authConfig.facebook_app_id,
                    cookie     : true,
                    xfbml      : true,
                    version    : 'v18.0'
                });
            };

            // Load SDK dynamically
            (function(d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;
                js = d.createElement(s); js.id = id;
                js.src = "https://connect.facebook.net/en_US/sdk.js";
                fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));

            const loginWithFB = () => {
                if (!window.FB) {
                    showToast('Facebook SDK sedang memuat, silakan coba lagi...');
                    return;
                }
                FB.login(function(response) {
                    if (response.authResponse) {
                        FB.api('/me', { fields: 'id,name,email,picture.type(large)' }, async function(userData) {
                            try {
                                const data = await api('auth.php?action=facebook_login', {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        facebook_id: userData.id,
                                        name: userData.name,
                                        email: userData.email || (userData.id + '@facebook.com'),
                                        avatar_url: userData.picture?.data?.url || null
                                    })
                                });
                                showApp(data.user);
                                showToast('Berhasil login dengan Facebook! 🚀');
                            } catch (err) {
                                showToast(err.message);
                            }
                        });
                    } else {
                        showToast('Login Facebook dibatalkan');
                    }
                }, { scope: 'public_profile' });
            };

            if (fbBtn1) fbBtn1.addEventListener('click', loginWithFB);
            if (fbBtn2) fbBtn2.addEventListener('click', loginWithFB);
        }
    }

    // ===== PROFILE FEATURES =====
    function initProfileFeatures() {
        // Avatar Upload
        const avatarContainer = document.getElementById('avatarContainer');
        const avatarUpload = document.getElementById('avatarUpload');
        if (avatarContainer && avatarUpload) {
            avatarContainer.addEventListener('click', () => avatarUpload.click());
            
            avatarUpload.addEventListener('change', async (e) => {
                if (!e.target.files.length) return;
                const file = e.target.files[0];
                const formData = new FormData();
                formData.append('avatar', file);
                
                showToast('Mengupload foto...');
                try {
                    // Bypass API function because we need multipart/form-data
                    const res = await fetch(`${API}/profile.php?action=upload_photo`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Upload gagal');
                    
                    currentUser.avatar_url = data.avatar_url;
                    showApp(currentUser); // Refresh UI
                    showToast('Foto berhasil diperbarui!');
                } catch(err) {
                    showToast(err.message);
                }
            });
        }

        // Edit Profile
        const btnEditProfile = document.getElementById('settingEditProfile');
        if (btnEditProfile) {
            btnEditProfile.addEventListener('click', () => {
                const html = `
                    <div class="form-group">
                        <label>Nama Lengkap</label>
                        <input type="text" id="editProfileName" value="${currentUser.name}">
                    </div>
                    <button class="modal-submit-btn success-btn" id="saveProfileBtn">Simpan</button>
                `;
                openModal('Ubah Profil', html);
                setTimeout(() => {
                    document.getElementById('saveProfileBtn').addEventListener('click', async () => {
                        const name = document.getElementById('editProfileName').value;
                        if (!name) return showToast('Nama tidak boleh kosong');
                        try {
                            const data = await api('profile.php?action=update_profile', {
                                method: 'POST',
                                body: JSON.stringify({ name })
                            });
                            currentUser.name = data.name;
                            currentUser.avatar_initial = data.avatar_initial;
                            showApp(currentUser);
                            closeModal();
                            showToast('Profil diperbarui');
                        } catch(e) { showToast(e.message); }
                    });
                }, 100);
            });
        }

        // Change Password
        const btnChangePass = document.getElementById('settingChangePassword');
        if (btnChangePass) {
            btnChangePass.addEventListener('click', () => {
                const html = `
                    <div class="form-group">
                        <label>Password Lama</label>
                        <input type="password" id="oldPass">
                    </div>
                    <div class="form-group">
                        <label>Password Baru</label>
                        <input type="password" id="newPass">
                    </div>
                    <button class="modal-submit-btn success-btn" id="savePassBtn">Ubah Password</button>
                `;
                openModal('Ubah Password', html);
                setTimeout(() => {
                    document.getElementById('savePassBtn').addEventListener('click', async () => {
                        const old_password = document.getElementById('oldPass').value;
                        const new_password = document.getElementById('newPass').value;
                        if (!old_password || !new_password) return showToast('Lengkapi data');
                        try {
                            await api('profile.php?action=change_password', {
                                method: 'POST',
                                body: JSON.stringify({ old_password, new_password })
                            });
                            closeModal();
                            showToast('Password berhasil diubah');
                        } catch(e) { showToast(e.message); }
                    });
                }, 100);
            });
        }
    }

    async function loadAuthConfig() {
        try {
            const data = await api('auth.php?action=config');
            authConfig.google_client_id = data.google_client_id;
            authConfig.facebook_app_id = data.facebook_app_id;
        } catch (e) {
            console.error('Failed to load OAuth config:', e);
        }
        initGoogleAuth();
        initFacebookAuth();
    }

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

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(e => console.error('SW init failed:', e));
        }

        // Button handlers
        document.getElementById('addIncomeBtn').addEventListener('click', () => showTransactionForm('income'));
        document.getElementById('addExpenseBtn').addEventListener('click', () => showTransactionForm('expense'));
        document.getElementById('addSavingBtn').addEventListener('click', showSavingsForm);
        
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
        showBudgetForm, deleteTransaction, deleteSaving, deleteBudget, showAddToSaving };

        // Check session
        checkSession();
    }

    // ===== SKELETONS =====
    function renderSkeletonTransactions(container) {
        if (!container) return;
        container.innerHTML = Array(4).fill(0).map((_,i) => `
            <div class="transaction-item fade-in-up stagger-${i+1}">
                <div class="skeleton sk-avatar"></div>
                <div style="flex:1;margin-left:12px;">
                    <div class="skeleton sk-text w-50"></div>
                    <div class="skeleton sk-text w-30"></div>
                </div>
                <div class="skeleton sk-text w-30"></div>
            </div>`).join('');
    }
    
    function renderSkeletonChart(container) {
        if (!container) return;
        container.innerHTML = '<div class="skeleton sk-circle" style="margin: 0 auto;"></div>';
    }

    // ===== PULL TO REFRESH =====
    function initPullToRefresh() {
        let startY = 0;
        let isPulling = false;
        const threshold = 60;
        
        ['home', 'analytics'].forEach(pageId => {
            const page = document.getElementById('page-' + pageId);
            const ptr = document.getElementById('ptr' + (pageId === 'home' ? 'Home' : 'Analytics'));
            if (!page || !ptr) return;
            const icon = ptr.querySelector('.ptr-icon');
            
            page.addEventListener('touchstart', e => {
                if (page.scrollTop === 0) {
                    startY = e.touches[0].clientY;
                    isPulling = true;
                }
            }, { passive: true });
            
            page.addEventListener('touchmove', e => {
                if (!isPulling) return;
                const y = e.touches[0].clientY;
                const pullDist = y - startY;
                if (pullDist > 0 && page.scrollTop === 0) {
                    ptr.style.transform = `translateY(${Math.min(pullDist - 60, 0)}px)`;
                    icon.style.transform = `rotate(${pullDist * 2}deg)`;
                    if (pullDist > threshold) icon.classList.add('spin');
                    else icon.classList.remove('spin');
                }
            }, { passive: true });
            
            page.addEventListener('touchend', e => {
                if (!isPulling) return;
                isPulling = false;
                const y = e.changedTouches[0].clientY;
                if (y - startY > threshold && page.scrollTop === 0) {
                    ptr.style.transform = 'translateY(0)';
                    icon.classList.add('spin');
                    
                    const p = pageId === 'home' ? loadDashboard() : loadAnalytics();
                    p.then(() => {
                        setTimeout(() => {
                            ptr.style.transform = 'translateY(-100%)';
                            icon.classList.remove('spin');
                        }, 500);
                    });
                } else {
                    ptr.style.transform = 'translateY(-100%)';
                }
            });
        });
    }

    // ===== SWIPE TO DELETE =====
    function initSwipeToDelete(container) {
        let startX = 0;
        let currentX = 0;
        let activeItem = null;
        
        container.addEventListener('touchstart', e => {
            const item = e.target.closest('.transaction-item');
            if (!item) return;
            activeItem = item.querySelector('.transaction-content');
            if (!activeItem) {
                // If it doesn't have .transaction-content, we'll wrap it automatically on render, 
                // but since we modified CSS to use .transaction-content, we'll use that.
                return;
            }
            startX = e.touches[0].clientX;
            activeItem.style.transition = 'none';
        }, { passive: true });
        
        container.addEventListener('touchmove', e => {
            if (!activeItem) return;
            currentX = e.touches[0].clientX;
            const diff = currentX - startX;
            if (diff < 0) {
                activeItem.style.transform = `translateX(${Math.max(diff, -80)}px)`;
            } else {
                activeItem.style.transform = `translateX(0)`;
            }
        }, { passive: true });
        
        container.addEventListener('touchend', e => {
            if (!activeItem) return;
            activeItem.style.transition = 'transform 0.2s ease-out';
            const diff = currentX - startX;
            if (diff < -40) {
                activeItem.style.transform = `translateX(-80px)`;
                const txId = activeItem.parentElement.dataset.id;
                // create delete confirm button underneath
                if (!activeItem.parentElement.querySelector('.transaction-delete-bg')) {
                    const bg = document.createElement('div');
                    bg.className = 'transaction-delete-bg';
                    bg.innerHTML = 'Hapus';
                    bg.onclick = () => window.Selaraskas.deleteTransaction(txId);
                    activeItem.parentElement.insertBefore(bg, activeItem);
                }
            } else {
                activeItem.style.transform = `translateX(0)`;
                setTimeout(() => {
                    const bg = activeItem.parentElement.querySelector('.transaction-delete-bg');
                    if (bg) bg.remove();
                }, 200);
            }
            activeItem = null;
        });
    }

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
        remainEl.textContent = 'Sisa: ' + formatRp(remain);
        
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
            
            return `
            <div class="budget-item fade-in-up" onclick="window.Selaraskas.showBudgetForm(${b.category_id}, ${b.amount})" style="cursor:pointer">
                <div class="budget-item-top">
                    <div class="budget-item-icon" style="background:${b.category_color}18; display:flex; align-items:center; justify-content:center;">${renderEmojiOrIcon(b.category_emoji, '20px', b.category_color)}</div>
                    <div class="budget-item-info">
                        <span class="budget-item-title">${b.category_name}</span>
                        <span class="budget-item-amounts">${formatRp(b.spent, true)} / ${formatRp(b.amount, true)}</span>
                    </div>
                    <button class="budget-item-delete" onclick="event.stopPropagation(); window.Selaraskas.deleteBudget(${b.id})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
                <div class="budget-progress-bar">
                    <div class="budget-progress-fill" style="width:${itemPct}%;background:${color}"></div>
                </div>
                <div class="budget-progress-row">
                    <span class="budget-progress-text" style="color:${color}">${itemPct.toFixed(0)}%</span>
                    <span class="budget-remain-text">Sisa ${formatRp(b.amount - b.spent, true)}</span>
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
                <input type="text" id="budgetAmount" placeholder="Rp 0" value="${existingAmount ? 'Rp ' + parseInt(existingAmount).toLocaleString('id-ID') : ''}" required inputmode="numeric">
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
                        document.getElementById('budgetSelectedCategory').innerHTML = `${renderEmojiOrIcon(parent.dataset.emoji, '16px')} ${parent.dataset.name}`;
                        document.getElementById('budgetCategoryPicker').style.display = 'none';
                        setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 10);
                    }
                });
            });

            document.querySelectorAll('#budgetCategoryPicker .category-child').forEach(child => {
                child.addEventListener('click', () => {
                    document.getElementById('budgetCategoryId').value = child.dataset.id;
                    document.getElementById('budgetSelectedCategory').innerHTML = `${renderEmojiOrIcon(child.dataset.emoji, '16px')} ${child.dataset.name}`;
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

    // ===== NEW DASHBOARD CHARTS =====
    function renderDashboardCashflowChart(data) {
        const canvas = document.getElementById('dashboardCashflowChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 350 * dpr; canvas.height = 120 * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0,0, 350, 120);
        
        if (!data || !data.length) return;
        
        const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
        const w = 350; const h = 100;
        const stepX = w / (Math.max(data.length - 1, 1));
        
        function drawLine(key, color) {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            data.forEach((d, i) => {
                const x = i * stepX;
                const y = h - (d[key] / maxVal) * h + 10;
                if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            });
            ctx.stroke();
        }
        
        drawLine('expense', '#ff6b6b'); // accent-coral
        drawLine('income', '#34d399'); // color-success
    }
    
    function renderTrendChart(data) {
        const canvas = document.getElementById('trendChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 350 * dpr; canvas.height = 80 * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0,0, 350, 80);
        
        if (!data || !data.length) return;
        
        const maxVal = Math.max(...data.map(d => d.expense), 1);
        const w = 350; const h = 60;
        const stepX = w / (Math.max(data.length - 1, 1));
        
        ctx.beginPath();
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        data.forEach((d, i) => {
            const x = i * stepX;
            const y = h - (d.expense / maxVal) * h + 10;
            if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        });
        ctx.stroke();
        
        // gradient fill
        const grad = ctx.createLinearGradient(0,0,0,h+10);
        grad.addColorStop(0, 'rgba(129, 140, 248, 0.4)');
        grad.addColorStop(1, 'rgba(129, 140, 248, 0)');
        ctx.lineTo(w, h+20);
        ctx.lineTo(0, h+20);
        ctx.fillStyle = grad;
        ctx.fill();
    }
    
    function renderComparisonCards(data) {
        const el = document.getElementById('comparisonCards');
        if (!el || !data) return;
        
        function makeCard(type, label, rawCurr, rawPrev, colorCls) {
            const curr = parseFloat(rawCurr) || 0;
            const prev = parseFloat(rawPrev) || 0;
            const pct = prev > 0 ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100.0 : 0.0);
            const max = Math.max(curr, prev, 1);
            const cH = Math.max(10, (curr/max)*100);
            const pH = Math.max(10, (prev/max)*100);
            
            return `
            <div class="comparison-card fade-in-up">
                <div class="comparison-icon ${colorCls}">
                    ${type === 'income' ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>' : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>'}
                </div>
                <div class="comparison-info">
                    <span class="comparison-label">${label}</span>
                    <span class="comparison-value">${formatRp(curr, true)}</span>
                    <span style="font-size:10px;color:${pct>0?(type==='income'?'var(--color-success)':'var(--color-danger)'):'var(--text-muted)'}">${pct>0?'+':''}${pct.toFixed(1)}% vs bln lalu</span>
                </div>
                <div class="comparison-bars">
                    <div class="comparison-bar-wrap"><div class="comparison-bar-fill curr" style="width:${cH}%"></div></div>
                    <div class="comparison-bar-wrap"><div class="comparison-bar-fill prev" style="width:${pH}%"></div></div>
                </div>
            </div>`;
        }
        
        el.innerHTML = makeCard('income', 'Pemasukan', data.current_income, data.prev_income, 'income') + 
                       makeCard('expense', 'Pengeluaran', data.current_expense, data.prev_expense, 'expense');
    }

    // ===== OFFLINE / PWA =====
    const OFFLINE_QUEUE_KEY = 'selaraskas_offline_queue';
    
    function initOfflineMode() {
        window.addEventListener('online', () => {
            document.getElementById('offlineBanner').classList.remove('show');
            syncOfflineQueue();
        });
        window.addEventListener('offline', () => {
            document.getElementById('offlineBanner').classList.add('show');
        });
        if (!navigator.onLine) {
            document.getElementById('offlineBanner').classList.add('show');
        }
    }
    
    async function syncOfflineQueue() {
        const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
        if (queue.length === 0) return;
        
        showToast('Menyinkronkan data offline...');
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
        
        for (let task of queue) {
            try {
                await fetch(`${API}/${task.endpoint}`, {
                    headers: { 'Content-Type': 'application/json' },
                    ...task.options,
                });
            } catch (err) {
                console.error('Failed to sync task', task, err);
            }
        }
        loadDashboard();
        setTimeout(() => lucide.createIcons(), 50);
        showToast('Sinkronisasi selesai');
    }


    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
