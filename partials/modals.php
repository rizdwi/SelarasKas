        <!-- ===== UPGRADE PREMIUM MODAL ===== -->
        <div class="upgrade-overlay" id="upgradeOverlay">
            <div class="upgrade-modal" id="upgradeModal">
                <!-- Close button -->
                <button class="upgrade-close-btn" id="upgradeCloseBtn" aria-label="Tutup">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>

                <!-- Header -->
                <div class="upgrade-header">
                    <div class="upgrade-crown">👑</div>
                    <h2 class="upgrade-title">Upgrade ke Premium</h2>
                    <p class="upgrade-subtitle">Buka semua fitur eksklusif SelarasKas dan kelola keuangan seperti pro</p>
                </div>

                <!-- Current badge -->
                <div class="current-plan-badge" id="currentPlanBadge">
                    <span class="plan-dot free-dot"></span>
                    <span>Paket Saat Ini: <strong id="currentPlanLabel">Free</strong></span>
                </div>

                <!-- Billing toggle -->
                <div class="billing-toggle-wrap">
                    <span class="billing-label" id="lblMonthly">Bulanan</span>
                    <div class="billing-toggle" id="billingToggle">
                        <div class="billing-knob" id="billingKnob"></div>
                    </div>
                    <span class="billing-label" id="lblYearly">Tahunan <span class="save-badge">Hemat 40%</span></span>
                </div>

                <!-- Pricing cards -->
                <div class="pricing-cards" id="pricingCards">
                    <!-- Free -->
                    <div class="pricing-card free-card" data-plan="free">
                        <div class="pricing-card-header">
                            <span class="plan-emoji">🆓</span>
                            <div>
                                <h3 class="plan-name">Free</h3>
                                <p class="plan-tagline">Mulai perjalananmu</p>
                            </div>
                        </div>
                        <div class="plan-price">
                            <span class="price-amount">Rp 0</span>
                            <span class="price-period">/ selamanya</span>
                        </div>
                        <ul class="plan-features">
                            <li class="feature-item"><span class="feat-check">✓</span> 1 Dompet Pribadi</li>
                            <li class="feature-item"><span class="feat-check">✓</span> Catat Transaksi Tak Terbatas</li>
                            <li class="feature-item"><span class="feat-check">✓</span> Analitik Dasar</li>
                            <li class="feature-item feat-no"><span class="feat-x">✗</span> SelarasAI Chatbot</li>
                            <li class="feature-item feat-no"><span class="feat-x">✗</span> Scan Struk AI (OCR)</li>
                            <li class="feature-item feat-no"><span class="feat-x">✗</span> Export Laporan (PNG & PDF)</li>
                            <li class="feature-item feat-no"><span class="feat-x">✗</span> Kolaborasi Dompet Bersama</li>
                        </ul>
                        <button class="plan-btn free-btn current-plan-btn" disabled id="freePlanBtn">Paket Aktif ✓</button>
                    </div>

                    <!-- Pro -->
                    <div class="pricing-card pro-card" data-plan="pro">
                        <div class="pricing-card-header">
                            <span class="plan-emoji">🚀</span>
                            <div>
                                <h3 class="plan-name">Pro</h3>
                                <p class="plan-tagline">50% Fitur Terbuka</p>
                            </div>
                        </div>
                        <div class="plan-price">
                            <span class="price-amount" id="proPrice">Rp 15.000</span>
                            <span class="price-period" id="proPeriod">/ bulan</span>
                        </div>
                        <ul class="plan-features">
                            <li class="feature-item"><span class="feat-check">✓</span> Semua fitur Free</li>
                            <li class="feature-item"><span class="feat-check">✓</span> <strong>SelarasAI (Limit 15x/bln)</strong></li>
                            <li class="feature-item"><span class="feat-check">✓</span> <strong>Scan Struk AI (Limit 10x/bln)</strong></li>
                            <li class="feature-item"><span class="feat-check">✓</span> <strong>Export Laporan PNG</strong></li>
                            <li class="feature-item"><span class="feat-check">✓</span> Maksimal 2 Dompet Bersama</li>
                            <li class="feature-item"><span class="feat-check">✓</span> Maksimal 5 Anggota / Dompet</li>
                            <li class="feature-item feat-no"><span class="feat-x">✗</span> Export Laporan PDF</li>
                        </ul>
                        <button class="plan-btn pro-btn" id="proPlanBtn">🚀 Pilih Pro</button>
                    </div>

                    <!-- Premium (RECOMMENDED) -->
                    <div class="pricing-card premium-card recommended" data-plan="premium">
                        <div class="recommended-badge">⭐ Terpopuler</div>
                        <div class="pricing-card-header">
                            <span class="plan-emoji">💎</span>
                            <div>
                                <h3 class="plan-name">Premium</h3>
                                <p class="plan-tagline">100% Fitur Lengkap</p>
                            </div>
                        </div>
                        <div class="plan-price">
                            <span class="price-amount" id="premiumPrice">Rp 29.000</span>
                            <span class="price-period" id="premiumPeriod">/ bulan</span>
                        </div>
                        <ul class="plan-features">
                            <li class="feature-item"><span class="feat-check">✓</span> Semua fitur Pro</li>
                            <li class="feature-item"><span class="feat-check">✓</span> <strong>SelarasAI Tanpa Batas</strong></li>
                            <li class="feature-item"><span class="feat-check">✓</span> <strong>Scan Struk AI Tanpa Batas</strong></li>
                            <li class="feature-item"><span class="feat-check">✓</span> <strong>Laporan PDF & PNG</strong></li>
                            <li class="feature-item"><span class="feat-check">✓</span> Dompet Bersama Tanpa Batas</li>
                            <li class="feature-item"><span class="feat-check">✓</span> Anggota Tanpa Batas</li>
                            <li class="feature-item"><span class="feat-check">✓</span> Dukungan Prioritas & Badges</li>
                        </ul>
                        <button class="plan-btn premium-btn" id="premiumPlanBtn">✨ Pilih Premium</button>
                    </div>
                </div>

                <!-- Payment method notice -->
                <div class="payment-notice">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span>Pembayaran Manual via DANA & QRIS Pribadi</span>
                </div>

                <!-- Confirm payment modal (step 2) -->
                <div class="payment-step" id="paymentStep" style="display:none;">
                    <button class="back-btn" id="backToPricingBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="15 18 9 12 15 6"/></svg>
                        Kembali
                    </button>
                    <div class="payment-summary" id="paymentSummary"></div>
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin: 18px 0; text-align: left;">
                        <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; text-align: center;">Silakan transfer ke salah satu rekening berikut:</div>
                        
                        <div style="background: var(--bg-card); padding: 12px; border-radius: 8px; margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; background: #00AED6; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: white; font-size: 10px;">GOPAY</div>
                            <div>
                                <div style="font-size: 12px; color: var(--text-muted);">Gopay Merchant</div>
                                <div style="font-size: 16px; font-weight: 800; font-family: monospace;">0813-8508-4327</div>
                                <div style="font-size: 12px; color: var(--text-primary);">A.N. SelarasKas</div>
                            </div>
                        </div>

                        <div style="text-align: center; margin-bottom: 8px;">
                            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Atau scan QRIS di bawah ini:</div>
                            <div style="background: white; padding: 8px; border-radius: 8px; display: inline-block;">
                                <img src="qris.jpeg" alt="QRIS" style="width: 150px; height: 150px; object-fit: cover; border-radius: 4px;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiB2aWV3Qm94PSIwIDAgMTUwIDE1MCI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2NDc0OGIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5HQU1CQVIgUVJJUzwvdGV4dD48L3N2Zz4='">
                            </div>
                        </div>
                    </div>
                    <button class="plan-btn premium-btn" id="confirmPayBtn" style="width:100%;margin-top:16px;background: #25D366;color: white;box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-right: 6px; vertical-align: text-bottom;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                        Konfirmasi ke WhatsApp Admin
                    </button>
                    <p style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:10px;">
                        ⚡ Admin akan mengaktifkan fitur premium Anda setelah bukti transfer dikirim via WhatsApp.
                    </p>
                </div>
            </div>
        </div>

        <!-- ===== BOTTOM SHEET MODAL ===== -->
        <div class="modal-overlay" id="modalOverlay">
            <div class="modal-sheet" id="modalSheet">
                <div class="modal-handle"></div>
                <div class="modal-header">
                    <h2 id="modalTitle">Tambah Transaksi</h2>
                    <button class="modal-close" id="modalClose">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="modal-body" id="modalBody">
                    <!-- Dynamic content -->
                </div>
            </div>
        </div>

        <!-- Toast -->
        <div class="toast" id="toast">
            <div class="toast-content">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span id="toastMessage">Berhasil!</span>
            </div>
        </div>

    <!-- Modal Support -->
    <div id="modalSupport" class="modal-overlay">
        <div class="modal-sheet" style="max-height:85vh; display:flex; flex-direction:column; padding: 0 20px 24px;">
            <div class="modal-handle"></div>
            <div class="modal-header">
                <h2>Bantuan & Dukungan</h2>
                <button class="modal-close" aria-label="Close" onclick="window.Selaraskas.closeSupportModal()">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            
            <div class="support-chat-area" id="supportChatArea" style="flex:1; overflow-y:auto; padding:15px; display:flex; flex-direction:column; gap:12px; background:var(--bg-color); border-radius:12px; margin-bottom:15px;">
                <div class="chat-message ai-message" style="display:flex; gap:10px; align-items:flex-start;">
                    <div class="chat-avatar" style="width:30px; height:30px; border-radius:50%; background:var(--color-primary); display:flex; align-items:center; justify-content:center; color:white; font-size:14px; flex-shrink:0;">🤖</div>
                    <div class="chat-bubble" style="background:var(--bg-card); padding:10px 14px; border-radius:0 12px 12px 12px; font-size:14px; line-height:1.4; box-shadow:0 2px 5px rgba(0,0,0,0.05); color:var(--text-color);">
                        Halo! Saya Support AI SelarasKas. Ada yang bisa saya bantu terkait cara penggunaan aplikasi ini?
                    </div>
                </div>
            </div>

            <div class="support-input-area" style="display:flex; gap:8px; margin-bottom:20px;">
                <input type="text" id="supportChatInput" placeholder="Ketik pertanyaan Anda..." style="flex:1; padding:12px; border-radius:24px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-color); outline:none;">
                <button onclick="window.Selaraskas.sendSupportMessage()" id="sendSupportBtn" style="width:44px; height:44px; border-radius:50%; background:var(--color-primary); color:white; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
            </div>
            
            <div style="text-align:center; margin-bottom:10px;">
                <span style="font-size:12px; color:var(--text-secondary);">Masalah belum terpecahkan? Hubungi admin langsung:</span>
            </div>
            
            <button onclick="window.Selaraskas.contactAdmin('email')" style="width:100%; padding:12px; border-radius:8px; background:rgba(255,255,255,0.1); border:1px solid var(--border-color); color:var(--text-color); cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:500;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Kirim Email ke Admin
            </button>
        </div>
