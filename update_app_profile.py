import re

with open('app.js', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Update showApp(user)
showapp_new = """
    function showApp(user) {
        currentUser = user;
        document.getElementById('authContainer').classList.remove('active');
        document.getElementById('appContainer').classList.add('active');
        
        document.getElementById('profileName').textContent = user.name;
        document.getElementById('profileEmail').textContent = user.email;
        
        const avatarEl = document.querySelector('.profile-avatar');
        const initEl = document.getElementById('profileInitial');
        if (user.avatar_url) {
            avatarEl.style.backgroundImage = `url(${API}/../${user.avatar_url})`;
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
            if (initEl) initEl.style.display = 'none';
        } else {
            avatarEl.style.backgroundImage = 'none';
            if (initEl) {
                initEl.style.display = 'inline-block';
                initEl.textContent = user.avatar_initial;
            }
        }
        
        if (user.theme === 'light') {
            document.body.classList.add('light-mode');
            document.getElementById('themeLabel').textContent = 'Light Mode';
        }

        loadDashboard();
    }
"""
c = re.sub(r'function showApp\(user\) \{.*?loadDashboard\(\);\s*\}', showapp_new.strip(), c, flags=re.DOTALL)

# 2. Add Google Auth logic and Profile JS
profile_js = """
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

    function initGoogleAuth() {
        if (window.google) {
            google.accounts.id.initialize({
                client_id: "DUMMY_CLIENT_ID_REPLACE_ME", // The user will need their own
                callback: handleCredentialResponse
            });
            const btn1 = document.getElementById('googleAuthBtn');
            const btn2 = document.getElementById('googleAuthBtn2');
            if (btn1) {
                btn1.addEventListener('click', () => google.accounts.id.prompt());
            }
            if (btn2) {
                btn2.addEventListener('click', () => google.accounts.id.prompt());
            }
        } else {
            setTimeout(initGoogleAuth, 500); // Retry if SDK not loaded
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
"""

c = c.replace('// ===== INIT =====', profile_js + '\n    // ===== INIT =====')

# 3. Add to init()
c = c.replace('initOfflineMode();', 'initOfflineMode();\n        initGoogleAuth();\n        initProfileFeatures();')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(c)

print("app.js updated")
