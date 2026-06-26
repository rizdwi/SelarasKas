        <!-- ===== MAIN APP ===== -->
        
<div id="mainApp" class="main-app">
    <nav class="main-nav" id="mainNav">
        <button class="nav-item active" data-page="home" id="navHomeDesktop">
            <div class="nav-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
            <span style="font-size:11px;font-weight:600;">Beranda</span>
        </button>
        <button class="nav-item" data-page="analytics" id="navAnalyticsDesktop">
            <div class="nav-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
            <span style="font-size:11px;font-weight:600;">Analitik</span>
        </button>
        <button class="nav-item" data-page="budget" id="navBudgetDesktop">
            <div class="nav-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg></div>
            <span style="font-size:11px;font-weight:600;">Anggaran</span>
        </button>
        <button class="nav-item" data-page="savings" id="navSavingsDesktop">
            <div class="nav-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></div>
            <span style="font-size:11px;font-weight:600;">Tabungan</span>
        </button>
        <button class="nav-item" data-page="profile" id="navProfileDesktop">
            <div class="nav-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
            <span style="font-size:11px;font-weight:600;">Profil</span>
        </button>
    </nav>
    <div class="content-wrapper">
        <header class="global-header" id="globalHeader">
            <div class="header-left">
                <div class="avatar" id="globalAvatar" style="background:var(--accent-coral); color:white; font-weight:bold; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center;"><span id="globalAvatarInitial">R</span></div>
                <div class="header-greeting">
                    <span class="greeting-text" id="globalGreeting" style="font-size:16px; font-weight:700; color:var(--text-primary);">Selamat Siang</span>
                    <div class="wallet-selector-wrapper" style="display: flex; align-items: center; gap: 4px; background:var(--bg-card); padding:4px 8px; border-radius:12px; margin-top:2px;">
                        <span style="color:#fbbf24;font-size:12px;">👑</span>
                        <select id="walletSwitcherGlobal" class="wallet-switcher" style="background: transparent; border: none; color: var(--text-primary); font-size: 12px; font-weight: 600; outline: none; cursor: pointer;"></select>
                    </div>
                </div>
            </div>
            <div class="header-right">
                <div class="push-notif-wrap" style="display:flex; align-items:center; gap:8px; background:var(--bg-card); padding:4px 12px; border-radius:20px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    <span style="font-size:12px; font-weight:600; display:none;">Push notifications</span>
                    <label class="toggle-pill" id="pushNotifToggleBtn" style="transform: scale(0.8); margin-left:-4px;">
                        <input type="checkbox" id="pushNotifToggleCheckbox" checked>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        </header>
        <div class="content-area">


            <!-- Status Bar Removed -->

            <!-- ===== HOME PAGE ===== -->
            <div id="page-home" class="page active">
                <div class="ptr-container" id="ptrHome">
                    <svg class="ptr-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.87-11.85l-4.5 4.5"/></svg>
                    <span>Tarik untuk perbarui</span>
                </div>
                

                <!-- Balance Card -->
                <div class="balance-card" id="balanceCard">
                    <div class="balance-card-bg"></div>
                    <div class="balance-card-content">
                        <div class="balance-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                            <span>Saldo Keseluruhan</span>
                        </div>
                        <div class="balance-amount">
                            <span class="currency">Rp</span>
                            <span class="amount" id="mainBalance">0</span>
                        </div>
                        <div class="balance-change" id="balanceChange">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5H7z"/></svg>
                            <span id="balanceChangeText">Rp 0 bulan ini</span>
                        </div>
                        <div class="balance-actions">
                            <button class="balance-action-btn" id="addIncomeBtn">
                                <div class="action-icon add">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                </div>
                                <span>Pemasukan</span>
                            </button>
                            <button class="balance-action-btn" id="addExpenseBtn">
                                <div class="action-icon send">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                </div>
                                <span>Pengeluaran</span>
                            </button>
                            <button class="balance-action-btn" id="scanReceiptBtn">
                                <div class="action-icon scan">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                </div>
                                <span>Scan Struk</span>
                            </button>
                            <button class="balance-action-btn" id="goSavingsBtn">
                                <div class="action-icon request">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                                </div>
                                <span>Tabungan</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Gamification Widget -->
                <div class="section" id="gamificationSection">
                    <div class="gamification-card" style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 16px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                        <div class="health-score" style="flex: 1; margin-right: 16px;">
                            <span class="health-label" style="font-size: 13px; color: #9ca3af; display: block; margin-bottom: 8px;">Kesehatan Keuangan</span>
                            <div class="health-bar-bg" style="height: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden; position: relative;">
                                <div class="health-bar-fill" id="healthBarFill" style="height: 100%; width: 0%; background: linear-gradient(90deg, #f59e0b, #10b981); transition: width 1s ease;"></div>
                            </div>
                            <span class="health-value" id="healthScoreValue" style="font-size: 12px; margin-top: 4px; display: block; text-align: right; color: #10b981;">0/100</span>
                        </div>
                        <div class="points-info" style="text-align: right;">
                            <span class="points-label" style="font-size: 13px; color: #9ca3af; display: block; margin-bottom: 4px;">Poin Selaras</span>
                            <span class="points-value" style="font-size: 18px; font-weight: 700; color: #f59e0b;">⭐ <span id="pointsValue">0</span></span>
                        </div>
                    </div>
                </div>

                <!-- Spending Summary -->
                <div class="section" id="spendingSection">
                    <div class="section-header">
                        <h2>Pengeluaran Bulan Ini</h2>
                    </div>
                    <div class="spending-overview" id="spendingOverview">
                        <div class="spending-chart-container">
                            <canvas id="spendingChart" width="160" height="160"></canvas>
                            <div class="chart-center">
                                <span class="chart-total-label">Total</span>
                                <span class="chart-total-amount" id="chartTotalAmount">Rp 0</span>
                            </div>
                        </div>
                        <div class="spending-categories" id="spendingCategories">
                            <div class="empty-state-small">Belum ada data</div>
                        </div>
                    </div>
                </div>

                <!-- Recent Transactions -->
                <div class="section" id="transactionsSection">
                    <div class="section-header">
                        <h2>Transaksi Terbaru</h2>
                    </div>
                    <div class="transactions-list" id="transactionsList">
                        <div class="empty-state">
                            <span class="empty-icon">📝</span>
                            <span class="empty-text">Belum ada transaksi</span>
                            <span class="empty-sub">Tap + untuk menambahkan</span>
                        </div>
                    </div>
                </div>

                <div class="bottom-spacer"></div>
            </div>

            <!-- ===== ANALYTICS PAGE ===== -->
            <div id="page-analytics" class="page">
                <div class="ptr-container" id="ptrAnalytics">
                    <svg class="ptr-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.87-11.85l-4.5 4.5"/></svg>
                    <span>Tarik untuk perbarui</span>
                </div>
                <header class="page-header">
                    <div class="page-header-row" style="align-items:center;">
                        <h1>Analitik</h1>
                        <div style="display: flex; gap: 8px;">
                            <button class="export-report-btn" id="exportReportBtn" title="Export Laporan PNG">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                <span>PNG</span>
                            </button>
                            <button class="export-report-btn" id="exportReportPdfBtn" title="Export Laporan PDF" style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                <span>PDF</span>
                            </button>
                        </div>
                    </div>
                    <div class="month-nav">
                        <button class="month-nav-btn" id="prevMonth">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                        <span class="month-label" id="monthLabel">Juni 2026</span>
                        <button class="month-nav-btn" id="nextMonth">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                    </div>
                </header>

                <div class="analytics-summary">
                    <div class="analytics-card income">
                        <div class="analytics-card-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                        </div>
                        <span class="analytics-card-label">Pemasukan</span>
                        <span class="analytics-card-amount" id="analyticsIncome">Rp 0</span>
                        <span class="analytics-card-change" id="analyticsIncomeChange">—</span>
                    </div>
                    <div class="analytics-card expense">
                        <div class="analytics-card-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
                        </div>
                        <span class="analytics-card-label">Pengeluaran</span>
                        <span class="analytics-card-amount" id="analyticsExpense">Rp 0</span>
                        <span class="analytics-card-change" id="analyticsExpenseChange">—</span>
                    </div>
                </div>

                <!-- Cashflow Donut (Moved to Top) -->
                <div class="chart-section" style="background:var(--bg-card); border-radius:16px; padding:16px; margin: 12px 20px;">
                    <h3>Cashflow Bulan Ini</h3>
                    <div style="position:relative; height:180px; width:100%; display:flex; justify-content:center; margin-top:12px;">
                        <canvas id="analyticsCashflowChart"></canvas>
                    </div>
                </div>

                <div class="section">
                    <div class="section-header"><h2>Perbandingan Bulan Ini</h2></div>
                    <div class="comparison-cards" id="comparisonCards">
                        <div class="empty-state-small">Belum ada data</div>
                    </div>
                </div>

                <!-- Top Spending -->
                <div class="section">
                    <div class="section-header"><h2>Top Pengeluaran</h2></div>
                    <div class="top-spending-list" id="topSpendingList">
                        <div class="empty-state-small">Belum ada data</div>
                    </div>
                </div>

                <div class="bottom-spacer"></div>
            </div>

            <!-- ===== BUDGET PAGE ===== -->
            <div id="page-budget" class="page">
                <header class="page-header">
                    <div class="page-header-row">
                        <h1>Anggaran</h1>
                        <button class="add-fab-btn" id="addBudgetBtn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                    </div>
                    <div class="month-nav" style="margin-top:12px;">
                        <button class="month-nav-btn" id="prevBudgetMonth">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                        <span class="month-label" id="budgetMonthLabel">Juni 2026</span>
                        <button class="month-nav-btn" id="nextBudgetMonth">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                    </div>
                </header>

                <div class="budget-overview-card" id="budgetOverviewCard">
                    <div class="budget-total-info">
                        <span class="budget-total-label">Total Anggaran</span>
                        <span class="budget-total-amount" id="budgetTotalAmount">Rp 0</span>
                        <span class="budget-total-remain" id="budgetTotalRemain">Sisa: Rp 0</span>
                    </div>
                    <div class="budget-chart-circle">
                        <svg viewBox="0 0 100 100">
                            <circle class="budget-chart-bg" cx="50" cy="50" r="28"></circle>
                            <circle class="budget-chart-progress" id="budgetTotalProgress" cx="50" cy="50" r="28"></circle>
                        </svg>
                        <span class="budget-chart-text" id="budgetTotalPct">0%</span>
                    </div>
                </div>

                <div class="section">
                    <div class="section-header"><h2>Anggaran Kategori</h2></div>
                    <div class="budget-list" id="budgetList">
                        <div class="empty-state">
                            <span class="empty-icon">📊</span>
                            <span class="empty-text">Belum ada anggaran</span>
                            <span class="empty-sub">Tap + untuk buat anggaran</span>
                        </div>
                    </div>
                </div>
                
                <div class="bottom-spacer"></div>
            </div>

            <!-- ===== SAVINGS PAGE ===== -->
            <div id="page-savings" class="page">
                <header class="page-header">
                    <div class="page-header-row">
                        <h1>Target Nabung</h1>
                        <button class="add-fab-btn" id="addSavingBtn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                    </div>
                </header>

                <div class="savings-total-card" id="savingsTotalCard">
                    <span class="savings-total-label">Total Tabungan</span>
                    <span class="savings-total-amount" id="savingsTotalAmount">Rp 0</span>
                </div>

                <div class="savings-goals-list" id="savingsGoalsList">
                    <div class="empty-state">
                        <span class="empty-icon">🎯</span>
                        <span class="empty-text">Belum ada target nabung</span>
                        <span class="empty-sub">Tap + untuk membuat target</span>
                    </div>
                </div>

                <div class="bottom-spacer"></div>
            </div>

            <!-- ===== PROFILE PAGE ===== -->
            <div id="page-profile" class="page">
                <header class="page-header"><h1>Profil</h1></header>

                <div class="profile-header-card" id="profileHeaderCard">
                    <div class="cover-edit-hint" id="coverEditHint">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        <span>Background</span>
                    </div>
                    <div class="profile-avatar" id="avatarContainer" style="cursor: pointer; position: relative;">
                        <span id="profileInitial">R</span>
                        <input type="file" id="avatarUpload" accept="image/*" hidden>
                        <div class="avatar-edit-icon" style="position:absolute; bottom:2px; right:2px; background:var(--bg-card); border-radius:50%; padding:2px; box-shadow:0 1px 3px rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center;">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </div>
                    </div>
                    <h2 class="profile-name" id="profileName">User</h2>
                    <p class="profile-email" id="profileEmail">user@email.com</p>
                </div>

                <div class="settings-list">
                    <div class="settings-group">
                        <h3 class="settings-group-title">Akun</h3>
                        
                        <div class="settings-item" id="settingEditProfile">
                            <div class="settings-item-icon" style="background:rgba(56,189,248,0.15);color:#38bdf8;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            </div>
                            <div class="settings-item-text">
                                <span class="settings-item-title">Ubah Profil</span>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                        <div class="settings-item" id="settingChangePassword">
                            <div class="settings-item-icon" style="background:rgba(251,191,36,0.15);color:#fbbf24;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            </div>
                            <div class="settings-item-text">
                                <span class="settings-item-title">Ubah Password</span>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                        <div class="settings-item" id="settingPushNotif">
                            <div class="settings-item-icon" style="background:rgba(251,146,60,0.15);color:#fb923c;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                            </div>
                            <div class="settings-item-text">
                                <span class="settings-item-title">Push Notifikasi</span>
                                <span class="settings-item-subtitle" id="pushNotifLabel">Tidak Aktif</span>
                            </div>
                            <div class="push-notif-toggle biometric-toggle" id="pushNotifToggleBtn" aria-label="Toggle push notifications">
                                <div class="toggle-knob"></div>
                            </div>
                        </div>
                        <div class="settings-item" id="settingSupport">
                            <div class="settings-item-icon" style="background:rgba(34,197,94,0.15);color:#22c55e;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                            </div>
                            <div class="settings-item-text">
                                <span class="settings-item-title">Bantuan & Dukungan</span>
                                <span class="settings-item-subtitle">Chat AI & Kontak Admin</span>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>

                          <div class="settings-item" id="settingTheme">
                            <div class="settings-item-icon" style="background:rgba(168,85,247,0.15);color:#c084fc;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                            </div>
                            <div class="settings-item-text">
                                <span class="settings-item-title">Tampilan</span>
                                <span class="settings-item-subtitle" id="themeLabel">Dark Mode</span>
                            </div>
                            <div class="day-night-toggle" id="themeSwitchBtn" aria-label="Toggle theme">
                                <div class="toggle-stars">
                                    <div class="star star-1"></div>
                                    <div class="star star-2"></div>
                                    <div class="star star-3"></div>
                                    <div class="star star-4"></div>
                                    <div class="star star-5"></div>
                                    <div class="shooting-star"></div>
                                </div>
                                <div class="toggle-clouds">
                                    <div class="cloud cloud-1"></div>
                                    <div class="cloud cloud-2"></div>
                                    <div class="cloud cloud-3"></div>
                                </div>
                                <div class="sun-rays"></div>
                                <div class="toggle-knob">
                                    <div class="crater crater-1"></div>
                                    <div class="crater crater-2"></div>
                                    <div class="crater crater-3"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Biometric Settings -->
                <div class="settings-list" style="margin-top: 20px;">
                    <div class="settings-group" id="biometricGroup" style="display: none;">
                        <h3 class="settings-group-title">Keamanan</h3>
                        <div class="settings-item" id="settingBiometric">
                            <div class="settings-item-icon" style="background:rgba(16,185,129,0.15);color:#10b981;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            </div>
                            <div class="settings-item-text">
                                <span class="settings-item-title">Sidik Jari / Face ID</span>
                                <span class="settings-item-subtitle" id="biometricLabel">Tidak Aktif</span>
                            </div>
                            <div class="biometric-toggle" id="biometricToggleBtn" aria-label="Toggle biometric login">
                                <div class="toggle-knob">
                                    <svg class="toggle-knob-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M12 10a2 2 0 0 0-2 2c0 1.02.77 2 2 2s2-.98 2-2a2 2 0 0 0-2-2z"/>
                                        <path d="M18 8a6 6 0 0 0-12 0v4a6 6 0 0 0 12 0V8z" opacity="0" />
                                        <path d="M7 3.34C4.07 5.22 2 8.36 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-3.64-2.07-6.78-5-8.66"/>
                                        <path d="M12 6a6 6 0 0 0-6 6"/>
                                        <path d="M18 12a6 6 0 0 0-6-6"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div class="biometric-credentials-section" id="biometricCredentialsSection">
                            <div class="biometric-credentials-list" id="biometricCredentialsList"></div>
                            <button class="biometric-register-btn" id="biometricRegisterBtn">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                <span>Daftarkan Sidik Jari Tambahan</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Subscription Section -->
                <div class="settings-list" style="margin-top: 20px;">
                    <div class="settings-group">
                        <h3 class="settings-group-title">Berlangganan</h3>
                        <div class="subscription-status-card" id="subscriptionStatusCard">
                            <div class="sub-status-left">
                                <div class="sub-status-icon" id="subStatusIcon">🆓</div>
                                <div>
                                    <div class="sub-status-name" id="subStatusName">Paket Free</div>
                                    <div class="sub-status-desc" id="subStatusDesc">Upgrade untuk fitur lengkap</div>
                                </div>
                            </div>
                            <button class="upgrade-cta-btn" id="openUpgradeBtn">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="18 15 12 9 6 15"/></svg>
                                Upgrade
                            </button>
                        </div>
                    </div>
                </div>

                <button class="logout-btn" id="logoutBtn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    <span>Keluar</span>
                </button>

                <div class="bottom-spacer"></div>
            </div>

            <!-- Bottom Navigation -->
            <nav class="bottom-nav" id="bottomNav">
                <button class="nav-item active" data-page="home" id="navHome">
                    <div class="nav-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    </div>
                    <span>Beranda</span>
                </button>
                <button class="nav-item" data-page="analytics" id="navAnalytics">
                    <div class="nav-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    </div>
                    <span>Analitik</span>
                </button>
                <button class="nav-item" data-page="budget" id="navBudget">
                    <div class="nav-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                    </div>
                    <span>Anggaran</span>
                </button>
                <button class="nav-item" data-page="savings" id="navSavings">
                    <div class="nav-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <span>Tabungan</span>
                </button>
                <button class="nav-item" data-page="profile" id="navProfile">
                    <div class="nav-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <span>Profil</span>
                </button>
            </nav>

            <!-- AI Chat FAB -->
            <button class="ai-chat-fab" id="aiChatFab" aria-label="Tanya SelarasAI" style="position: fixed; bottom: 130px; right: 20px; width: 56px; height: 56px; border-radius: 28px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #fff; border: none; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4); display: flex; align-items: center; justify-content: center; z-index: 100; cursor: pointer;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>

            <!-- AI Chat Panel -->
            <div class="ai-chat-panel" id="aiChatPanel" style="position: fixed; bottom: 190px; right: 20px; width: 320px; height: 400px; max-width: calc(100vw - 40px); background: #1a1f2e; border: 1px solid #2a2f3e; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); display: none; flex-direction: column; z-index: 101; overflow: hidden;">
                <div class="ai-chat-header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 16px;">SelarasAI</h3>
                    <button class="ai-chat-close" id="aiChatClose" style="background: none; border: none; color: #fff; cursor: pointer; padding: 4px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                <div class="ai-chat-messages" id="aiChatMessages" style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                    <div class="ai-message" style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); padding: 10px 14px; border-radius: 12px; border-top-left-radius: 4px; color: #e2e8f0; font-size: 14px; align-self: flex-start; max-width: 85%;">Halo! Ada yang bisa SelarasAI bantu soal keuanganmu hari ini?</div>
                </div>
                <form class="ai-chat-input-area" id="aiChatForm" style="display: flex; padding: 12px; border-top: 1px solid #2a2f3e; background: #111627;">
                    <input type="text" id="aiChatInput" placeholder="Ketik pesan..." required style="flex: 1; background: #0a0e1a; border: 1px solid #2a2f3e; color: #fff; padding: 8px 12px; border-radius: 20px; outline: none; font-size: 14px;">
                    <button type="submit" class="ai-chat-send" style="background: none; border: none; color: #f59e0b; margin-left: 8px; cursor: pointer; padding: 8px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                    </button>
                </form>
            </div>
        </div>

        </div><!-- end content-area -->
    </div><!-- end content-wrapper -->
</div><!-- end mainApp -->

