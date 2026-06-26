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
                formData.append('csrf_token', csrfToken);
                
                showToast('Mengupload foto...');
                try {
                    // Bypass API function because we need multipart/form-data
                    const res = await fetch(`${API}/profile.php?action=upload_photo`, {
                        method: 'POST',
                        headers: {
                            'X-CSRF-Token': csrfToken
                        },
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

        // Cover Photo Options
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

        // Support Modal
        const btnSupport = document.getElementById('settingSupport');
        if (btnSupport) {
            btnSupport.addEventListener('click', () => {
                if (window.Selaraskas && window.Selaraskas.openSupportModal) {
                    window.Selaraskas.openSupportModal();
                }
            });
        }
        
        const supportInput = document.getElementById('supportChatInput');
        if (supportInput) {
            supportInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    if (window.Selaraskas && window.Selaraskas.sendSupportMessage) {
                        window.Selaraskas.sendSupportMessage();
                    }
                }
            });
        }

        // Biometric Settings Toggle & Buttons
        const bioItem = document.getElementById('settingBiometric');
        const bioToggle = document.getElementById('biometricToggleBtn');
        const bioRegister = document.getElementById('biometricRegisterBtn');
        
        async function toggleBiometric() {
            const toggleBtn = document.getElementById('biometricToggleBtn');
            if (!toggleBtn) return;
            const isActive = toggleBtn.classList.contains('active');
            
            if (isActive) {
                if (confirm('Apakah Anda yakin ingin menonaktifkan login Sidik Jari? Semua data sidik jari/Face ID yang terdaftar akan dihapus.')) {
                    try {
                        await api('auth.php?action=webauthn_credentials', {
                            method: 'DELETE',
                            body: JSON.stringify({ all: true })
                        });
                        showToast('Login biometrik dinonaktifkan');
                        loadBiometricSettings();
                    } catch (err) {
                        showToast(err.message || 'Gagal menonaktifkan biometrik');
                    }
                }
            } else {
                registerBiometric();
            }
        }
        
        if (bioItem) {
            bioItem.addEventListener('click', (e) => {
                if (e.target.closest('.biometric-toggle') || e.target.closest('.biometric-register-btn') || e.target.closest('.biometric-cred-delete')) {
                    return;
                }
                toggleBiometric();
            });
        }
        if (bioToggle) {
            bioToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleBiometric();
            });
        }
        if (bioRegister) {
            bioRegister.addEventListener('click', (e) => {
                e.stopPropagation();
                registerBiometric();
            });
        }
    }
