import os
import re

# ==========================================
# 1. Update index.css
# ==========================================
with open('index.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Update Theme Colors
css = re.sub(r':root,\s*\[data-theme="dark"\]\s*\{[\s\S]*?\}', """/* ===== LIGHT THEME (DEFAULT NOW) ===== */
:root, [data-theme="light"] {
    --bg-primary: #FAFAF7; /* Warm White */
    --bg-secondary: #f0f2f5;
    --bg-card: #E5EBF2; /* Light Pastel Blue */
    --bg-card-hover: #D8E0EB;
    --bg-elevated: #ffffff;
    --bg-input: #ffffff;
    --accent-coral: #FCA5A5; /* Soft Coral/Salmon */
    --accent-coral-light: #fcd5d5;
    --accent-gradient: linear-gradient(135deg, #FCA5A5, #f88b8b);
    --color-success: #A7F3D0; /* Soft Teal/Mint */
    --color-success-bg: rgba(167, 243, 208, 0.2);
    --color-danger: #f87171;
    --color-danger-bg: rgba(248,113,113,0.1);
    --color-warning: #fbbf24;
    --color-info: #818cf8;
    --text-primary: #1a1d26;
    --text-secondary: #5a6275;
    --text-muted: #9ca3b4;
    --border-subtle: rgba(0, 0, 0, 0.04);
    --border-light: rgba(0, 0, 0, 0.08);
    --shadow-sm: 0 4px 10px rgba(0,0,0,0.02);
    --shadow-md: 0 10px 25px rgba(0,0,0,0.04);
    --shadow-lg: 0 20px 40px rgba(0,0,0,0.06);
}

/* ===== DARK THEME (PASTEL) ===== */
[data-theme="dark"] {
    --bg-primary: #121418;
    --bg-secondary: #1a1d24;
    --bg-card: #20242d;
    --bg-card-hover: #2a2f3a;
    --bg-elevated: #20242d;
    --bg-input: #1a1d24;
    --accent-coral: #FCA5A5;
    --accent-coral-light: #fcd5d5;
    --accent-gradient: linear-gradient(135deg, #FCA5A5, #f88b8b);
    --color-success: #A7F3D0;
    --color-success-bg: rgba(167, 243, 208, 0.1);
    --color-danger: #f87171;
    --color-danger-bg: rgba(248,113,113,0.1);
    --color-warning: #fbbf24;
    --color-info: #818cf8;
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --border-subtle: rgba(255, 255, 255, 0.03);
    --border-light: rgba(255, 255, 255, 0.06);
    --shadow-sm: 0 4px 10px rgba(0,0,0,0.2);
    --shadow-md: 0 10px 25px rgba(0,0,0,0.3);
    --shadow-lg: 0 20px 40px rgba(0,0,0,0.4);
}""", css, count=1)

# Remove the old light theme block
css = re.sub(r'/\* ===== LIGHT THEME ===== \*/\s*\[data-theme="light"\]\s*\{[\s\S]*?\}', "", css)

# Update app-container to be responsive PWA
css = re.sub(r'\.app-container\s*\{[\s\S]*?\}[\s\S]*?@media\s*\(min-width:\s*431px\)\s*\{[\s\S]*?\}', """
/* ===== APP CONTAINER (RESPONSIVE PWA) ===== */
.app-container {
    width: 100%; height: 100vh;
    position: relative; overflow: hidden; background: var(--bg-primary);
    transition: background 0.3s ease;
    display: flex; flex-direction: column;
}
@media (min-width: 768px) {
    .app-container {
        flex-direction: row; /* Sidebar on left */
        max-width: 1400px;
        margin: 0 auto;
        border-radius: 30px; border: 1px solid var(--border-subtle);
        box-shadow: var(--shadow-lg), 0 0 80px rgba(0,0,0,0.1);
        height: min(100vh - 40px, 932px);
    }
}
""", css)

# Add Global Header Styles and Sidebar Styles
additional_css = """
/* ===== GLOBAL HEADER ===== */
.global-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 20px 24px; background: transparent; z-index: 10;
}
.global-header .header-left { display: flex; align-items: center; gap: 12px; }
.global-header .header-right { display: flex; align-items: center; gap: 16px; }

/* ===== MAIN APP LAYOUT ===== */
.main-app {
    flex: 1; display: flex; flex-direction: column; overflow: hidden;
}
@media (min-width: 768px) {
    .main-app { flex-direction: row; }
}
.content-wrapper {
    flex: 1; display: flex; flex-direction: column; overflow: hidden;
}
.content-area {
    flex: 1; overflow-y: auto; padding: 0 24px 100px; position: relative;
}
@media (min-width: 768px) {
    .content-area { padding-bottom: 24px; }
}

/* ===== NEW TOGGLE PILL ===== */
.toggle-pill {
    position: relative; display: inline-block; width: 52px; height: 28px;
}
.toggle-pill input { opacity: 0; width: 0; height: 0; }
.toggle-pill .slider {
    position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
    background-color: var(--bg-input); border: 2px solid var(--border-light);
    transition: .3s; border-radius: 34px;
}
.toggle-pill .slider:before {
    position: absolute; content: ""; height: 20px; width: 20px; left: 2px; bottom: 2px;
    background-color: var(--text-muted); transition: .3s; border-radius: 50%;
}
.toggle-pill input:checked + .slider {
    background-color: var(--accent-coral); border-color: var(--accent-coral);
}
.toggle-pill input:checked + .slider:before {
    transform: translateX(24px); background-color: white;
}

/* ===== BOTTOM / SIDEBAR NAV ===== */
.main-nav {
    display: flex; justify-content: space-around; padding: 12px 16px;
    background: var(--bg-primary); border-top: 1px solid var(--border-subtle);
    z-index: 100;
}
@media (max-width: 767px) {
    .main-nav { position: fixed; bottom: 0; left: 0; right: 0; padding-bottom: calc(12px + env(safe-area-inset-bottom)); box-shadow: 0 -4px 20px rgba(0,0,0,0.03); border-radius: 30px 30px 0 0;}
}
@media (min-width: 768px) {
    .main-nav {
        flex-direction: column; justify-content: flex-start; gap: 16px;
        width: 100px; border-top: none; border-right: 1px solid var(--border-subtle);
        padding: 32px 16px; align-items: center;
    }
}
.main-nav .nav-item {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    color: var(--text-muted); transition: all 0.3s; padding: 8px; border-radius: 16px;
}
.main-nav .nav-item.active {
    color: var(--accent-coral); background: rgba(252, 165, 165, 0.15);
}
.main-nav .nav-item .nav-icon { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }

/* Overriding old bottom-nav */
.bottom-nav { display: none !important; }

/* Rounded cards */
.balance-card, .analytics-card, .budget-card, .saving-card, .profile-card, .gamification-card {
    border-radius: 24px !important;
    box-shadow: var(--shadow-sm) !important;
    border: 1px solid var(--border-subtle) !important;
}
"""

css += additional_css

with open('index.css', 'w', encoding='utf-8') as f:
    f.write(css)

# ==========================================
# 2. Update index.html
# ==========================================
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace <div id="mainApp" class="main-app">
# and inject the new structure
global_header = """
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
                    <span class="greeting-text" style="font-size:16px; font-weight:700; color:var(--text-primary);">Selamat Siang</span>
                    <div class="wallet-selector-wrapper" style="display: flex; align-items: center; gap: 4px; background:var(--bg-card); padding:4px 8px; border-radius:12px; margin-top:2px;">
                        <span style="color:#fbbf24;font-size:12px;">👑</span>
                        <select id="walletSwitcherGlobal" class="wallet-switcher" style="background: transparent; border: none; color: var(--text-primary); font-size: 12px; font-weight: 600; outline: none; cursor: pointer;"></select>
                    </div>
                </div>
            </div>
            <div class="header-right">
                <label class="toggle-pill" id="themeTogglePill" title="Theme Toggle">
                    <input type="checkbox" id="themeToggleCheckbox">
                    <span class="slider"></span>
                </label>
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
"""

html = html.replace('<div id="mainApp" class="main-app">', global_header)
html = html.replace('<!-- ===== MAIN APP ===== -->', '<!-- ===== MAIN APP ===== -->')

# Now wrap the end of mainApp properly
# Find the end of mainApp, right before upgrade overlay
html = html.replace('<!-- ===== UPGRADE PREMIUM MODAL ===== -->', '</div><!-- end content-area -->\n    </div><!-- end content-wrapper -->\n</div><!-- end mainApp -->\n\n        <!-- ===== UPGRADE PREMIUM MODAL ===== -->')

# Remove the old home page header
html = re.sub(r'<header class="header">[\s\S]*?</header>', '', html)

# Remove the old theme toggle and push toggle from profile page
# They are inside list items.
html = re.sub(r'<li class="profile-list-item" id="themeToggleItem">[\s\S]*?</li>', '', html)
html = re.sub(r'<li class="profile-list-item" id="settingPushNotif">[\s\S]*?</li>', '', html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("HTML and CSS successfully updated.")
