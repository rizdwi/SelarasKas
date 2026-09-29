    // ===== AUTH =====
    function showAuth() {
        document.getElementById('authScreen').classList.add('active');
        document.getElementById('mainApp').classList.remove('active');
        // Reset to login form, hide all other forms
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const otpScreen = document.getElementById('otpScreen');
        const forgotForm = document.getElementById('forgotPasswordForm');
        const resetForm = document.getElementById('resetPasswordForm');
        if (loginForm) loginForm.classList.add('active');
        if (registerForm) registerForm.classList.remove('active');
        if (otpScreen) otpScreen.classList.remove('active');
        if (forgotForm) forgotForm.classList.remove('active');
        if (resetForm) resetForm.classList.remove('active');
        currentUser = null;
        
        // Pre-fill saved email
        const savedEmail = localStorage.getItem('selaraskas_last_email');
        if (savedEmail) {
            const emailInput = document.getElementById('loginEmail');
            if (emailInput) emailInput.value = savedEmail;
        }
        
        // Check biometric availability
        checkBiometricAvailability();
    }

    async function showApp(user) {
        currentUser = user;
        document.getElementById('authScreen').classList.remove('active');
        document.getElementById('mainApp').classList.add('active');
        
        updateUserUI();
        
        applyTheme(user.theme || 'dark');

        await loadWallets();
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
                let imgUrl = currentUser.avatar_url;
                if (!imgUrl.startsWith('data:')) {
                    imgUrl = `${API}/../${imgUrl}`;
                }
                homeAvatarEl.style.backgroundImage = `url("${imgUrl}")`;
                homeAvatarEl.style.backgroundSize = 'cover';
                homeAvatarEl.style.backgroundPosition = 'center';
                if (homeAvatarInitial) homeAvatarInitial.style.display = 'none';
            } else {
                homeAvatarEl.style.backgroundImage = 'none';
                if (homeAvatarInitial) homeAvatarInitial.style.display = 'inline-block';
            }
        }

        const globalGreetingEl = document.getElementById('globalGreeting');
        if (globalGreetingEl) globalGreetingEl.textContent = getGreeting();
        
        const globalAvatarInitial = document.getElementById('globalAvatarInitial');
        if (globalAvatarInitial) globalAvatarInitial.textContent = currentUser.avatar_initial || 'U';
        
        const globalAvatar = document.getElementById('globalAvatar');
        if (globalAvatar) {
            if (currentUser.avatar_url) {
                let imgUrl = currentUser.avatar_url;
                if (!imgUrl.startsWith('data:')) {
                    imgUrl = `${API}/../${imgUrl}`;
                }
                globalAvatar.style.backgroundImage = `url("${imgUrl}")`;
                globalAvatar.style.backgroundSize = 'cover';
                globalAvatar.style.backgroundPosition = 'center';
                if (globalAvatarInitial) globalAvatarInitial.style.display = 'none';
            } else {
                globalAvatar.style.backgroundImage = 'none';
                if (globalAvatarInitial) globalAvatarInitial.style.display = 'inline-block';
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
                let imgUrl = currentUser.avatar_url;
                if (!imgUrl.startsWith('data:')) {
                    imgUrl = `${API}/../${imgUrl}`;
                }
                profileAvatarEl.style.backgroundImage = `url("${imgUrl}")`;
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
            document.querySelectorAll('#otpInputs .otp-digit').forEach(inp => {
                inp.value = '';
                inp.classList.remove('filled', 'error');
            });
            document.querySelector('#otpInputs .otp-digit[data-index="0"]').focus();
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
        const otpInputs = document.querySelectorAll('#otpInputs .otp-digit');
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

        // Helper to hide all auth forms
        function hideAllForms() {
            loginForm.classList.remove('active');
            registerForm.classList.remove('active');
            otpScreen.classList.remove('active');
            const fp = document.getElementById('forgotPasswordForm');
            const rp = document.getElementById('resetPasswordForm');
            if (fp) fp.classList.remove('active');
            if (rp) rp.classList.remove('active');
            authError.textContent = '';
        }

        document.getElementById('showRegister').addEventListener('click', () => {
            hideAllForms();
            registerForm.classList.add('active');
        });

        document.getElementById('showLogin').addEventListener('click', () => {
            hideAllForms();
            loginForm.classList.add('active');
        });

        // ===== FORGOT PASSWORD FLOW =====
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        const resetPasswordForm = document.getElementById('resetPasswordForm');
        let resetEmail = '';
        let resetCountdownTimer = null;

        // Show forgot password form
        document.getElementById('showForgotPassword')?.addEventListener('click', () => {
            hideAllForms();
            if (forgotPasswordForm) forgotPasswordForm.classList.add('active');
            // Pre-fill email from login form
            const loginEmailVal = document.getElementById('loginEmail')?.value;
            const forgotEmailInput = document.getElementById('forgotEmail');
            if (loginEmailVal && forgotEmailInput) forgotEmailInput.value = loginEmailVal;
        });

        // Back from forgot password
        document.getElementById('forgotBackBtn')?.addEventListener('click', () => {
            hideAllForms();
            loginForm.classList.add('active');
        });
        document.getElementById('forgotToLogin')?.addEventListener('click', () => {
            hideAllForms();
            loginForm.classList.add('active');
        });

        // Submit forgot password (send OTP)
        document.getElementById('forgotSubmitBtn')?.addEventListener('click', async () => {
            const forgotError = document.getElementById('forgotError');
            const btn = document.getElementById('forgotSubmitBtn');
            const email = document.getElementById('forgotEmail')?.value?.trim();
            if (forgotError) forgotError.textContent = '';
            if (!email) {
                if (forgotError) forgotError.textContent = 'Masukkan alamat email';
                return;
            }
            btn.disabled = true;
            try {
                const data = await api('auth.php?action=forgot_password', {
                    method: 'POST',
                    body: JSON.stringify({ email })
                });
                showToast(data.message || 'Kode reset telah dikirim 📧');
                resetEmail = email;
                // Show reset password form
                hideAllForms();
                if (resetPasswordForm) resetPasswordForm.classList.add('active');
                const resetEmailDisplay = document.getElementById('resetEmailDisplay');
                if (resetEmailDisplay) resetEmailDisplay.textContent = email;
                // Clear OTP inputs
                const resetOtpInputs = document.querySelectorAll('#resetOtpInputs .otp-digit');
                resetOtpInputs.forEach(i => { i.value = ''; });
                if (resetOtpInputs[0]) resetOtpInputs[0].focus();
                // Start resend countdown
                startResetResendCountdown(60);
            } catch (err) {
                if (forgotError) forgotError.textContent = err.message || 'Terjadi kesalahan';
            } finally {
                btn.disabled = false;
            }
        });

        // Reset OTP input handling
        const resetOtpContainer = document.getElementById('resetOtpInputs');
        if (resetOtpContainer) {
            const resetDigits = resetOtpContainer.querySelectorAll('.otp-digit');
            resetDigits.forEach((input, idx) => {
                input.addEventListener('input', (e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    e.target.value = val;
                    if (val && idx < resetDigits.length - 1) resetDigits[idx + 1].focus();
                });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Backspace' && !e.target.value && idx > 0) {
                        resetDigits[idx - 1].focus();
                    }
                });
                input.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '').slice(0, 6);
                    pasted.split('').forEach((ch, i) => {
                        if (resetDigits[i]) resetDigits[i].value = ch;
                    });
                    if (resetDigits[Math.min(pasted.length, resetDigits.length - 1)]) {
                        resetDigits[Math.min(pasted.length, resetDigits.length - 1)].focus();
                    }
                });
            });
        }

        // Back from reset password
        document.getElementById('resetBackBtn')?.addEventListener('click', () => {
            hideAllForms();
            if (forgotPasswordForm) forgotPasswordForm.classList.add('active');
            if (resetCountdownTimer) clearInterval(resetCountdownTimer);
        });

        // Reset resend countdown
        function startResetResendCountdown(seconds) {
            const btn = document.getElementById('resetResendBtn');
            const countdown = document.getElementById('resetCountdown');
            if (!btn || !countdown) return;
            btn.disabled = true;
            let sec = seconds;
            countdown.textContent = `(${sec}s)`;
            if (resetCountdownTimer) clearInterval(resetCountdownTimer);
            resetCountdownTimer = setInterval(() => {
                sec--;
                countdown.textContent = `(${sec}s)`;
                if (sec <= 0) {
                    clearInterval(resetCountdownTimer);
                    btn.disabled = false;
                    countdown.textContent = '';
                }
            }, 1000);
        }

        // Resend reset code
        document.getElementById('resetResendBtn')?.addEventListener('click', async () => {
            if (!resetEmail) return;
            try {
                await api('auth.php?action=forgot_password', {
                    method: 'POST',
                    body: JSON.stringify({ email: resetEmail })
                });
                showToast('Kode reset dikirim ulang 📧');
                startResetResendCountdown(60);
            } catch (err) {
                showToast(err.message || 'Gagal mengirim ulang kode');
                if (err.wait) startResetResendCountdown(err.wait);
            }
        });

        // Submit reset password
        document.getElementById('resetSubmitBtn')?.addEventListener('click', async () => {
            const resetError = document.getElementById('resetError');
            const btn = document.getElementById('resetSubmitBtn');
            if (resetError) resetError.textContent = '';

            // Collect OTP
            const resetDigits = document.querySelectorAll('#resetOtpInputs .otp-digit');
            const code = Array.from(resetDigits).map(i => i.value).join('');
            if (code.length !== 6) {
                if (resetError) resetError.textContent = 'Masukkan 6 digit kode verifikasi';
                return;
            }

            const newPassword = document.getElementById('resetNewPassword')?.value;
            const confirmPassword = document.getElementById('resetConfirmPassword')?.value;
            if (!newPassword || newPassword.length < 6) {
                if (resetError) resetError.textContent = 'Password minimal 6 karakter';
                return;
            }
            if (newPassword !== confirmPassword) {
                if (resetError) resetError.textContent = 'Password tidak cocok';
                return;
            }

            btn.disabled = true;
            try {
                const data = await api('auth.php?action=reset_password', {
                    method: 'POST',
                    body: JSON.stringify({
                        email: resetEmail,
                        code: code,
                        new_password: newPassword
                    })
                });
                showToast(data.message || 'Password berhasil direset! 🎉');
                if (data.user) {
                    localStorage.setItem('selaraskas_last_email', resetEmail);
                    showApp(data.user);
                } else {
                    hideAllForms();
                    loginForm.classList.add('active');
                }
            } catch (err) {
                if (resetError) resetError.textContent = err.message || 'Gagal mereset password';
            } finally {
                btn.disabled = false;
            }
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            authError.textContent = '';
            const btn = document.getElementById('loginSubmitBtn');
            btn.disabled = true;
            try {
                const loginEmail = document.getElementById('loginEmail').value;
                const rememberMe = document.getElementById('rememberMeCheck')?.checked || false;
                const data = await api('auth.php?action=login', {
                    method: 'POST',
                    body: JSON.stringify({
                        email: loginEmail,
                        password: document.getElementById('loginPassword').value,
                        remember_me: rememberMe,
                    }),
                });
                if (data.needs_verification) {
                    showOtpScreen(data.email);
                    showToast(data.message || 'Cek email untuk kode verifikasi 📧');
                } else {
                    // Save email for biometric login
                    localStorage.setItem('selaraskas_last_email', loginEmail);
                    showApp(data.user);
                    promptPushNotification();
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
                if (input) {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    btn.innerHTML = isPassword ? renderEmojiOrIcon('eye-off', '20px') : renderEmojiOrIcon('eye', '20px');
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
        const btn1 = document.getElementById('googleAuthBtn');
        const btn2 = document.getElementById('googleAuthBtn2');

        const triggerGoogleLogin = () => {
            if (!authConfig.google_client_id || authConfig.google_client_id.includes('261568703120')) {
                showToast('Fitur Login Google memerlukan GOOGLE_CLIENT_ID resmi di Vercel Env. Silakan gunakan daftar/login biasa.');
                return;
            }

            if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                try {
                    const tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: authConfig.google_client_id,
                        scope: 'openid profile email',
                        error_callback: (err) => {
                            showToast('Gagal memuat Google OAuth: ' + (err.message || 'Domain belum diizinkan di Google Cloud'));
                        },
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
                    tokenClient.requestAccessToken({ prompt: 'consent' });
                } catch (e) {
                    showToast('Google OAuth Error: ' + e.message);
                }
            } else {
                showToast('Google SDK belum siap, silakan coba beberapa saat lagi.');
            }
        };

        if (btn1) btn1.addEventListener('click', triggerGoogleLogin);
        if (btn2) btn2.addEventListener('click', triggerGoogleLogin);
    }

    // ===== FACEBOOK AUTH =====
    function initFacebookAuth() {
        const fbBtn1 = document.getElementById('facebookAuthBtn');
        const fbBtn2 = document.getElementById('facebookAuthBtn2');

        const loginWithFB = () => {
            if (!authConfig.facebook_app_id || authConfig.facebook_app_id.includes('1348574213882211')) {
                showToast('Fitur Login Facebook memerlukan FACEBOOK_APP_ID resmi di Vercel Env. Silakan gunakan daftar/login biasa.');
                return;
            }
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
