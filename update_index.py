import re

with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Google Button in Auth Page
google_btn = """
                  <div style="text-align:center; margin: 15px 0; color: var(--text-muted);">Atau</div>
                  <button type="button" class="google-auth-btn" id="googleAuthBtn">
                      <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      Masuk dengan Google
                  </button>
"""
if 'id="googleAuthBtn"' not in c:
    c = c.replace('</form>\n\n                  <p class="auth-switch">', '</form>\n' + google_btn + '\n                  <p class="auth-switch">')
    # Update for register form too
    c = c.replace('<button type="submit" class="auth-submit-btn" id="registerSubmitBtn">Daftar</button>\n                  </form>', '<button type="submit" class="auth-submit-btn" id="registerSubmitBtn">Daftar</button>\n                  </form>\n' + google_btn.replace('googleAuthBtn', 'googleAuthBtn2'))

# 2. Add Google GSI Script in head
if 'accounts.google.com/gsi/client' not in c:
    c = c.replace('</head>', '    <script src="https://accounts.google.com/gsi/client" async defer></script>\n</head>')

# 3. Update Profile Header Card for Avatar Upload
profile_avatar = """
                    <div class="profile-avatar" id="avatarContainer" style="cursor: pointer; position: relative;">
                        <span id="profileInitial">R</span>
                        <input type="file" id="avatarUpload" accept="image/*" hidden>
                        <div class="avatar-edit-icon" style="position:absolute; bottom:0; right:0; background:var(--bg-card); border-radius:50%; padding:4px; box-shadow:0 2px 4px rgba(0,0,0,0.2);">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </div>
                    </div>
"""
c = re.sub(r'<div class="profile-avatar">.*?</div>', profile_avatar, c, flags=re.DOTALL)

# 4. Add Edit Profile and Change Password Settings
profile_settings = """
                        <div class="settings-item" id="settingEditProfile">
                            <div class="settings-item-icon" style="background:rgba(56,189,248,0.15);color:#38bdf8;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            </div>
                            <div class="settings-item-text">
                                <span class="settings-item-title">Ubah Profil</span>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                        <div class="settings-item" id="settingChangePassword">
                            <div class="settings-item-icon" style="background:rgba(251,191,36,0.15);color:#fbbf24;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            </div>
                            <div class="settings-item-text">
                                <span class="settings-item-title">Ubah Password</span>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
"""
if 'id="settingEditProfile"' not in c:
    c = c.replace('<div class="settings-item" id="settingTheme">', profile_settings + '\n                          <div class="settings-item" id="settingTheme">')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print("index.html updated")
