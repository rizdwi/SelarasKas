    // ===== PUSH NOTIFICATIONS =====

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    function updatePushToggleUI(isActive) {
        const toggleBtn = document.getElementById('pushNotifToggleCheckbox');
        if (toggleBtn) {
            toggleBtn.checked = isActive;
        }
    }

    async function initPushNotification() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            const item = document.getElementById('settingPushNotif');
            if (item) item.style.display = 'none';
            return;
        }

        try {
            const vapidData = await api('push.php?action=vapid_public_key');
            vapidPublicKey = vapidData.publicKey || vapidData.public_key;
        } catch (err) {
            console.error('Failed to fetch VAPID key:', err);
            return;
        }

        try {
            const statusData = await api('push.php?action=status');
            updatePushToggleUI(statusData.subscribed === true);
        } catch (err) {
            console.error('Failed to check push status:', err);
        }

        // Toggle event handler
        const pushItem = document.getElementById('settingPushNotif');
        const pushToggle = document.getElementById('pushNotifToggleCheckbox');

        async function handlePushToggle() {
            const isActive = pushToggle && pushToggle.checked;
            if (isActive) {
                await unsubscribePush();
            } else {
                await subscribePush();
            }
        }

        if (pushItem) {
            pushItem.addEventListener('click', (e) => {
                if (e.target.closest('.push-notif-toggle')) return;
                handlePushToggle();
            });
        }
        if (pushToggle) {
            pushToggle.addEventListener('change', (e) => {
                e.stopPropagation();
                handlePushToggle();
            });
        }
    }

    async function subscribePush() {
        if (!('Notification' in window)) {
            showToast('Browser tidak mendukung notifikasi');
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                showToast('Izin notifikasi ditolak');
                return;
            }

            const reg = await navigator.serviceWorker.ready;
            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            const subJSON = subscription.toJSON();
            await api('push.php?action=subscribe', {
                method: 'POST',
                body: JSON.stringify({
                    endpoint: subJSON.endpoint,
                    keys: {
                        p256dh: subJSON.keys.p256dh,
                        auth: subJSON.keys.auth
                    }
                })
            });

            updatePushToggleUI(true);
            showToast('Notifikasi berhasil diaktifkan! \uD83D\uDD14');
        } catch (err) {
            console.error('Push subscribe error:', err);
            showToast(err.message || 'Gagal mengaktifkan notifikasi');
        }
    }

    async function unsubscribePush() {
        try {
            const reg = await navigator.serviceWorker.ready;
            const subscription = await reg.pushManager.getSubscription();
            if (subscription) {
                const endpoint = subscription.endpoint;
                await subscription.unsubscribe();
                await api('push.php?action=unsubscribe', {
                    method: 'POST',
                    body: JSON.stringify({ endpoint: endpoint })
                });
            }

            updatePushToggleUI(false);
            showToast('Notifikasi dinonaktifkan');
        } catch (err) {
            console.error('Push unsubscribe error:', err);
            showToast(err.message || 'Gagal menonaktifkan notifikasi');
        }
    }

    function promptPushNotification() {
        if (localStorage.getItem('pushPromptShown')) return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        if (Notification.permission === 'granted') {
            localStorage.setItem('pushPromptShown', '1');
            return;
        }
        if (Notification.permission === 'denied') {
            localStorage.setItem('pushPromptShown', '1');
            return;
        }

        setTimeout(() => {
            localStorage.setItem('pushPromptShown', '1');
            showToast('\uD83D\uDD14 Aktifkan Push Notifikasi di Profil untuk menerima update transaksi!');
        }, 3000);
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
                await api(task.endpoint, task.options);
            } catch (err) {
                console.error('Failed to sync task', task, err);
            }
        }
        loadDashboard();
        setTimeout(() => lucide.createIcons(), 50);
        showToast('Sinkronisasi selesai');
    }

    // =============================================
    // WebAuthn (Biometric) Functions
    // =============================================
    
    async function checkBiometricAvailability() {
        const btn = document.getElementById('biometricAuthBtn');
        if (!btn) return;
        
        // Check if WebAuthn is supported
        if (!window.PublicKeyCredential) {
            btn.style.display = 'none';
            return;
        }
        
        // Check if platform authenticator is available (fingerprint/Face ID)
        try {
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            if (!available) {
                btn.style.display = 'none';
                return;
            }
        } catch {
            btn.style.display = 'none';
            return;
        }
        
        // Check if we have a saved email with registered credentials
        const savedEmail = localStorage.getItem('selaraskas_last_email');
        if (!savedEmail) {
            btn.style.display = 'none';
            return;
        }
        
        // Check if credentials exist for this email
        try {
            const result = await api('auth.php?action=webauthn_login_options', {
                method: 'POST',
                body: JSON.stringify({ email: savedEmail })
            });
            if (result.allowCredentials && result.allowCredentials.length > 0) {
                btn.style.display = 'flex';
            } else {
                btn.style.display = 'none';
            }
        } catch {
            btn.style.display = 'none';
        }
    }
    
    async function performBiometricLogin() {
        const savedEmail = localStorage.getItem('selaraskas_last_email');
        if (!savedEmail) {
            showToast('Login biasa dulu untuk mengaktifkan sidik jari');
            return;
        }
        
        try {
            // Get login options from server
            const options = await api('auth.php?action=webauthn_login_options', {
                method: 'POST',
                body: JSON.stringify({ email: savedEmail })
            });
            
            // Convert challenge and credential IDs for WebAuthn API
            const allowCredentials = options.allowCredentials.map(c => ({
                type: c.type,
                id: Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
            }));
            
            const challengeBytes = Uint8Array.from(
                options.challenge.match(/.{1,2}/g).map(b => parseInt(b, 16))
            );
            
            // Trigger biometric prompt
            const credential = await navigator.credentials.get({
                publicKey: {
                    challenge: challengeBytes,
                    rpId: options.rpId,
                    timeout: options.timeout,
                    userVerification: options.userVerification,
                    allowCredentials: allowCredentials,
                }
            });
            
            // Send credential to server for verification
            const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
            
            const data = await api('auth.php?action=webauthn_login', {
                method: 'POST',
                body: JSON.stringify({
                    credential_id: credentialId,
                })
            });
            
            if (data.success) {
                showToast('Login berhasil! 🎉');
                showApp(data.user);
            }
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                showToast('Autentikasi dibatalkan');
            } else {
                console.error('Biometric login error:', err);
                showToast(err.message || 'Gagal login dengan biometrik');
            }
        }
    }
    
    async function registerBiometric() {
        if (!window.PublicKeyCredential) {
            showToast('Browser tidak mendukung biometrik');
            return;
        }
        
        try {
            // Get registration options from server
            const options = await api('auth.php?action=webauthn_register_options', {
                method: 'POST',
                body: JSON.stringify({})
            });
            
            // Convert for WebAuthn API
            const challengeBytes = Uint8Array.from(
                options.challenge.match(/.{1,2}/g).map(b => parseInt(b, 16))
            );
            
            const userId = Uint8Array.from(atob(options.user.id), c => c.charCodeAt(0));
            
            const excludeCredentials = (options.excludeCredentials || []).map(c => ({
                type: c.type,
                id: Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
            }));
            
            // Trigger biometric registration prompt
            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge: challengeBytes,
                    rp: options.rp,
                    user: {
                        id: userId,
                        name: options.user.name,
                        displayName: options.user.displayName,
                    },
                    pubKeyCredParams: options.pubKeyCredParams,
                    timeout: options.timeout,
                    authenticatorSelection: options.authenticatorSelection,
                    excludeCredentials: excludeCredentials,
                    attestation: options.attestation,
                }
            });
            
            // Encode credential data
            const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
            const publicKey = btoa(String.fromCharCode(...new Uint8Array(credential.response.getPublicKey ? credential.response.getPublicKey() : credential.response.attestationObject)));
            
            // Detect device name
            const ua = navigator.userAgent;
            let deviceName = 'Perangkat';
            if (/iPhone/.test(ua)) deviceName = 'iPhone';
            else if (/iPad/.test(ua)) deviceName = 'iPad';
            else if (/Android/.test(ua)) deviceName = 'Android';
            else if (/Windows/.test(ua)) deviceName = 'Windows PC';
            else if (/Mac/.test(ua)) deviceName = 'Mac';
            
            // Send to server
            const result = await api('auth.php?action=webauthn_register', {
                method: 'POST',
                body: JSON.stringify({
                    credential_id: credentialId,
                    public_key: publicKey,
                    device_name: deviceName,
                })
            });
            
            showToast(result.message || 'Sidik jari berhasil didaftarkan! 🎉');
            
            // Save email for future biometric login
            if (currentUser?.email) {
                localStorage.setItem('selaraskas_last_email', currentUser.email);
            }
            
            // Reload biometric settings
            loadBiometricSettings();
            
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                showToast('Pendaftaran dibatalkan');
            } else if (err.name === 'InvalidStateError') {
                showToast('Sidik jari sudah terdaftar');
            } else {
                console.error('Biometric register error:', err);
                showToast(err.message || 'Gagal mendaftarkan sidik jari');
            }
        }
    }
    
    async function loadBiometricSettings() {
        const group = document.getElementById('biometricGroup');
        if (!group) return;
        
        // Check if WebAuthn is supported
        if (!window.PublicKeyCredential) {
            group.style.display = 'none';
            return;
        }
        
        // Check platform authenticator availability
        try {
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            if (!available) {
                group.style.display = 'none';
                return;
            }
        } catch {
            group.style.display = 'none';
            return;
        }
        
        group.style.display = 'block';
        
        try {
            const data = await api('auth.php?action=webauthn_credentials');
            const creds = data.credentials || [];
            
            const label = document.getElementById('biometricLabel');
            const toggle = document.getElementById('biometricToggleBtn');
            const section = document.getElementById('biometricCredentialsSection');
            const list = document.getElementById('biometricCredentialsList');
            
            const registerBtn = document.getElementById('biometricRegisterBtn');
            
            if (creds.length > 0) {
                if (label) label.textContent = `Aktif (${creds.length} Perangkat)`;
                if (toggle) toggle.classList.add('active');
                if (section) section.classList.add('has-credentials');
                // Hide register button when credentials exist
                if (registerBtn) registerBtn.style.display = 'none';
                if (list) {
                    list.innerHTML = creds.map(c => `
                        <div class="biometric-cred-item">
                            <div class="biometric-cred-info">
                                <div class="biometric-cred-name">🔑 ${escapeHTML(c.device_name)}</div>
                                <div class="biometric-cred-date">${new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                            </div>
                            <button class="biometric-cred-delete" onclick="window.Selaraskas.deleteBiometricCred(${c.id})">Hapus</button>
                        </div>
                    `).join('');
                }
                if (section) {
                    section.style.maxHeight = section.scrollHeight + 'px';
                    section.style.opacity = '1';
                }
            } else {
                if (label) label.textContent = 'Tidak Aktif';
                if (toggle) toggle.classList.remove('active');
                if (section) section.classList.remove('has-credentials');
                // Show register button when no credentials
                if (registerBtn) registerBtn.style.display = '';
                if (list) list.innerHTML = '';
                if (section) {
                    section.style.maxHeight = '0px';
                    section.style.opacity = '0';
                }
            }
        } catch (err) {
            console.error('Error loading biometric settings:', err);
        }
    }
    
    // Expose biometric functions globally
    // Biometric functions exposed via window.Selaraskas in init()

    // Biometric login button handler
    document.getElementById('biometricAuthBtn')?.addEventListener('click', performBiometricLogin);
