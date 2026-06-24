import re

# Update index.css
with open('index.css', 'r', encoding='utf-8') as f:
    css = f.read()

profile_css_pattern = r'/\*\s*=====\s*PROFILE\s*=====\s*\*/[\s\S]*?\.profile-email[^{]*\{[^}]*\}'
new_profile_css = """/* ===== PROFILE ===== */
.profile-header-card {
    display:flex; flex-direction:column; align-items:center;
    background:var(--bg-card); border-radius:16px;
    margin-bottom:24px; border:1px solid var(--border-subtle);
    position:relative; overflow:hidden; transition: background 0.3s ease;
    padding: 32px 20px 20px;
    background-size: cover; background-position: center;
}
.profile-header-card::before {
    content:''; position:absolute; inset:0;
    background: linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.7));
    z-index: 0; pointer-events: none;
}
.cover-edit-hint {
    position: absolute; top: 12px; right: 12px; z-index: 2;
    display: flex; align-items: center; gap: 4px;
    background: rgba(0,0,0,0.5); color: #fff;
    padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 500;
    cursor: pointer; transition: all 0.2s ease;
    border: 1px solid rgba(255,255,255,0.1);
}
.cover-edit-hint:hover { background: rgba(0,0,0,0.7); }
.profile-avatar {
    width:64px; height:64px; border-radius:50%; background:var(--accent-gradient);
    display:flex; align-items:center; justify-content:center;
    font-size:24px; font-weight:800; color:white; margin-bottom:12px;
    box-shadow: 0 2px 8px rgba(52,211,153,0.2); position:relative; z-index:1;
    border: 3px solid var(--bg-card);
}
.profile-name { font-size:20px; font-weight:800; letter-spacing:-0.3px; margin-bottom:2px; position:relative; z-index:1; color: #fff; }
.profile-email { font-size:13px; color:rgba(255,255,255,0.7); font-weight:500; position:relative; z-index:1; padding-bottom: 0px; }"""

css = re.sub(profile_css_pattern, new_profile_css, css)

# Fix some modal styles while here to make sure preset buttons look good
if '.preset-cover:hover' not in css:
    css += '\n.preset-cover:hover { border-color: var(--accent-coral) !important; opacity: 0.9; }\n'

with open('index.css', 'w', encoding='utf-8') as f:
    f.write(css)


# Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace old profile-header-card HTML with new one
old_html_pattern = r'<div class="profile-header-card">[\s\S]*?<h2 class="profile-name"'
new_html = """<div class="profile-header-card" id="profileHeaderCard">
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
                    <h2 class="profile-name\""""

html = re.sub(old_html_pattern, new_html, html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)


# Update app.js
with open('app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

old_cover_js_pattern = r'// Cover Photo Upload[\s\S]*?\}\s*// Edit Profile'
new_cover_js = """// Cover Photo Options
        const cardEl = document.getElementById('profileHeaderCard');
        const coverHint = document.getElementById('coverEditHint');
        if (cardEl && coverHint) {
            const savedCover = localStorage.getItem('profileCover');
            if (savedCover) {
                cardEl.style.backgroundImage = `url(${savedCover})`;
            }
            
            coverHint.addEventListener('click', () => {
                const html = `
                    <p style="margin-bottom:15px;font-size:14px;color:var(--text-muted)">Pilih variasi desain background profil Anda:</p>
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
                        <div class="preset-cover" data-bg="assets/covers/flower.png" style="height:80px; border-radius:8px; background:url('assets/covers/flower.png') center/cover; cursor:pointer; border:2px solid transparent; transition:all 0.2s;"></div>
                        <div class="preset-cover" data-bg="assets/covers/doodle.png" style="height:80px; border-radius:8px; background:url('assets/covers/doodle.png') center/cover; cursor:pointer; border:2px solid transparent; transition:all 0.2s;"></div>
                        <div class="preset-cover" data-bg="assets/covers/mountain.png" style="height:80px; border-radius:8px; background:url('assets/covers/mountain.png') center/cover; cursor:pointer; border:2px solid transparent; transition:all 0.2s;"></div>
                    </div>
                `;
                openModal('Pilih Background', html);
                
                setTimeout(() => {
                    document.querySelectorAll('.preset-cover').forEach(el => {
                        el.addEventListener('click', (e) => {
                            const bg = e.target.dataset.bg;
                            cardEl.style.backgroundImage = `url(${bg})`;
                            localStorage.setItem('profileCover', bg);
                            showToast('Background berhasil diubah! 🎨');
                            closeModal();
                        });
                    });
                }, 100);
            });
        }

        // Edit Profile"""

app_js = re.sub(old_cover_js_pattern, new_cover_js, app_js)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)
