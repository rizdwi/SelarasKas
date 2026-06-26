        <!-- ===== LOGIN / REGISTER PAGE ===== -->
        <div id="authScreen" class="auth-screen active">
            <div class="auth-container">
                <div class="auth-logo">
                    <div class="auth-logo-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    </div>
                    <h1 class="auth-title">Selaraskas</h1>
                    <p class="auth-subtitle">Kelola Keuanganmu</p>
                </div>

                <!-- Login Form -->
                <form id="loginForm" class="auth-form active">
                    <div class="form-group">
                        <label for="loginEmail">Email</label>
                        <input type="email" id="loginEmail" placeholder="email@contoh.com" required autocomplete="email">
                    </div>
                    <div class="form-group">
                        <label for="loginPassword">Password</label>
                        <div class="password-input-container">
                            <input type="password" id="loginPassword" placeholder="Minimal 6 karakter" required autocomplete="current-password">
                            <button type="button" class="password-toggle-btn" data-toggle="loginPassword">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye" style="pointer-events:none;color:currentColor;"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="remember-me-row">
                        <label class="remember-me-label">
                            <input type="checkbox" id="rememberMeCheck" checked>
                            <span>Ingat Saya</span>
                        </label>
                        <button type="button" class="forgot-password-link" id="showForgotPassword">Lupa Password?</button>
                    </div>
                    <button type="submit" class="auth-submit-btn" id="loginSubmitBtn">
                        <span>Masuk</span>
                    </button>
                    <div class="auth-divider">
                        <span>atau masuk dengan</span>
                    </div>
                    <div class="social-login-grid">
                        <button type="button" class="social-btn biometric-btn" id="biometricAuthBtn" style="display:none;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;">
                                <path d="M12 10v4"/><path d="M7.5 8a5.5 5.5 0 0 1 9 0"/><path d="M5 6a9 9 0 0 1 14 0"/><path d="M2 4a13 13 0 0 1 20 0"/><path d="M12 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
                            </svg>
                            <span>Sidik Jari / Face ID</span>
                        </button>
                        <button type="button" class="social-btn google-btn" id="googleAuthBtn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right:8px;"><path d="M12.24 10.285V13.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.524 0-6.386-2.862-6.386-6.386 0-3.524 2.862-6.386 6.386-6.386 1.63 0 3.124.613 4.27 1.621l2.427-2.427C18.666 2.016 15.632 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.84 0 10.74-4.14 10.74-10.74 0-.69-.06-1.35-.16-1.955H12.24z"/></svg>
                            <span>Google</span>
                        </button>
                        <button type="button" class="social-btn facebook-btn" id="facebookAuthBtn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right:8px;"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            <span>Facebook</span>
                        </button>
                    </div>
                    <p class="auth-switch">Belum punya akun? <button type="button" id="showRegister">Daftar</button></p>
                </form>

                <!-- Register Form -->
                <form id="registerForm" class="auth-form">
                    <div class="form-group">
                        <label for="registerName">Nama Lengkap</label>
                        <input type="text" id="registerName" placeholder="Nama kamu" required autocomplete="name">
                    </div>
                    <div class="form-group">
                        <label for="registerEmail">Email</label>
                        <input type="email" id="registerEmail" placeholder="email@contoh.com" required autocomplete="email">
                    </div>
                    <div class="form-group">
                        <label for="registerPassword">Password</label>
                        <div class="password-input-container">
                            <input type="password" id="registerPassword" placeholder="Minimal 6 karakter" required autocomplete="new-password">
                            <button type="button" class="password-toggle-btn" data-toggle="registerPassword">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye" style="pointer-events:none;color:currentColor;"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="registerPasswordConfirm">Konfirmasi Password</label>
                        <div class="password-input-container">
                            <input type="password" id="registerPasswordConfirm" placeholder="Ketik ulang password" required autocomplete="new-password">
                            <button type="button" class="password-toggle-btn" data-toggle="registerPasswordConfirm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye" style="pointer-events:none;color:currentColor;"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                        </div>
                    </div>
                    <button type="submit" class="auth-submit-btn" id="registerSubmitBtn">
                        <span>Daftar</span>
                    </button>
                    <div class="auth-divider">
                        <span>atau daftar dengan</span>
                    </div>
                    <div class="social-login-grid">
                        <button type="button" class="social-btn google-btn" id="googleAuthBtn2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right:8px;"><path d="M12.24 10.285V13.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.524 0-6.386-2.862-6.386-6.386 0-3.524 2.862-6.386 6.386-6.386 1.63 0 3.124.613 4.27 1.621l2.427-2.427C18.666 2.016 15.632 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.84 0 10.74-4.14 10.74-10.74 0-.69-.06-1.35-.16-1.955H12.24z"/></svg>
                            <span>Google</span>
                        </button>
                        <button type="button" class="social-btn facebook-btn" id="facebookAuthBtn2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right:8px;"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            <span>Facebook</span>
                        </button>
                    </div>
                    <p class="auth-switch">Sudah punya akun? <button type="button" id="showLogin">Masuk</button></p>
                </form>

                <!-- OTP Verification Form -->
                <div id="otpScreen" class="auth-form otp-form">
                    <div class="otp-header">
                        <button type="button" class="otp-back-btn" id="otpBackBtn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        </button>
                        <div class="otp-icon-wrapper">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>
                        </div>
                    </div>
                    <h2 class="otp-title">Verifikasi Email</h2>
                    <p class="otp-subtitle">Masukkan kode 6 digit yang telah dikirim ke</p>
                    <p class="otp-email" id="otpEmailDisplay">email@contoh.com</p>
                    
                    <div class="otp-inputs" id="otpInputs">
                        <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="otp-digit" data-index="0" autocomplete="one-time-code">
                        <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="otp-digit" data-index="1">
                        <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="otp-digit" data-index="2">
                        <div class="otp-separator">–</div>
                        <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="otp-digit" data-index="3">
                        <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="otp-digit" data-index="4">
                        <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="otp-digit" data-index="5">
                    </div>

                    <div class="otp-error" id="otpError"></div>

                    <button type="button" class="auth-submit-btn otp-verify-btn" id="otpVerifyBtn">
                        <span>Verifikasi</span>
                    </button>

                    <div class="otp-resend">
                        <p id="otpResendText">Tidak menerima kode?</p>
                        <button type="button" class="otp-resend-btn" id="otpResendBtn" disabled>
                            Kirim Ulang Kode <span id="otpCountdown">(60s)</span>
                        </button>
                    </div>
                </div>

                <!-- Forgot Password Form -->
                <div id="forgotPasswordForm" class="auth-form">
                    <div class="otp-header">
                        <button type="button" class="otp-back-btn" id="forgotBackBtn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        </button>
                        <div class="otp-icon-wrapper" style="background:rgba(245,158,11,0.15);">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="16" r="1"/>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                            </svg>
                        </div>
                    </div>
                    <h2 class="otp-title">Lupa Password</h2>
                    <p class="otp-subtitle">Masukkan email yang terdaftar untuk menerima kode reset password</p>
                    
                    <div class="form-group" style="margin-top: 20px;">
                        <label for="forgotEmail">Email</label>
                        <input type="email" id="forgotEmail" placeholder="email@contoh.com" required autocomplete="email">
                    </div>
                    
                    <div class="auth-error" id="forgotError"></div>
                    
                    <button type="button" class="auth-submit-btn" id="forgotSubmitBtn">
                        <span>Kirim Kode Reset</span>
                    </button>
                    
                    <p class="auth-switch">Ingat password? <button type="button" id="forgotToLogin">Masuk</button></p>
                </div>

                <!-- Reset Password Form -->
                <div id="resetPasswordForm" class="auth-form">
                    <div class="otp-header">
                        <button type="button" class="otp-back-btn" id="resetBackBtn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        </button>
                        <div class="otp-icon-wrapper" style="background:rgba(16,185,129,0.15);">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                <path d="M9 12l2 2 4-4"/>
                            </svg>
                        </div>
                    </div>
                    <h2 class="otp-title">Reset Password</h2>
                    <p class="otp-subtitle">Masukkan kode yang dikirim ke</p>
                    <p class="otp-email" id="resetEmailDisplay">email@contoh.com</p>
                    
                    <div class="otp-inputs" id="resetOtpInputs">
                        <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="otp-digit" data-index="0">
                        <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="otp-digit" data-index="1">
                        <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="otp-digit" data-index="2">
                        <div class="otp-separator">–</div>
                        <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="otp-digit" data-index="3">
                        <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="otp-digit" data-index="4">
                        <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="otp-digit" data-index="5">
                    </div>
                    
                    <div class="form-group" style="margin-top: 16px;">
                        <label for="resetNewPassword">Password Baru</label>
                        <div class="password-input-container">
                            <input type="password" id="resetNewPassword" placeholder="Minimal 6 karakter" required autocomplete="new-password">
                            <button type="button" class="password-toggle-btn" data-toggle="resetNewPassword">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye" style="pointer-events:none;color:currentColor;"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="resetConfirmPassword">Konfirmasi Password</label>
                        <div class="password-input-container">
                            <input type="password" id="resetConfirmPassword" placeholder="Ketik ulang password" required autocomplete="new-password">
                            <button type="button" class="password-toggle-btn" data-toggle="resetConfirmPassword">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye" style="pointer-events:none;color:currentColor;"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                        </div>
                    </div>
                    
                    <div class="auth-error" id="resetError"></div>
                    
                    <button type="button" class="auth-submit-btn" id="resetSubmitBtn">
                        <span>Reset Password</span>
                    </button>
                    
                    <div class="otp-resend">
                        <p id="resetResendText">Tidak menerima kode?</p>
                        <button type="button" class="otp-resend-btn" id="resetResendBtn" disabled>
                            Kirim Ulang Kode <span id="resetCountdown">(60s)</span>
                        </button>
                    </div>
                </div>

                <div class="auth-error" id="authError"></div>
            </div>
        </div>

