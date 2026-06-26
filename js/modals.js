    // ===== MODAL =====
    function openModal(title, bodyHTML) {
        const overlay = document.getElementById('modalOverlay');
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = bodyHTML;
        overlay.classList.add('active');
    }

    function closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
    }

    function initModal() {
        document.getElementById('modalClose').addEventListener('click', closeModal);
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeModal();
        });
    }

    // ===== UPGRADE PREMIUM MODAL =====

    let isYearlyBilling = false;
    let selectedUpgradePlan = null;

    const PRICING = {
        pro:     { monthly: 15000, yearly: 119000 },
        premium: { monthly: 29000, yearly: 249000 },
    };

    function formatRupiah(n) {
        return 'Rp ' + n.toLocaleString('id-ID');
    }

    // Open upgrade modal
    window.showUpgradeModal = function(highlightPlan = null) {
        const overlay = document.getElementById('upgradeOverlay');
        if (!overlay) return;

        // Reset to pricing view
        document.getElementById('pricingCards').style.display = '';
        document.getElementById('paymentStep').style.display = 'none';
        document.getElementById('payment-notice') && (document.getElementById('payment-notice').style.display = '');
        const billingWrap = document.querySelector('.billing-toggle-wrap');
        if (billingWrap) billingWrap.style.display = 'flex';
        
        // Update current plan badge
        updateUpgradeModalBadge();
        updatePricingCards();
        updateBillingUI();

        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    function closeUpgradeModal() {
        const overlay = document.getElementById('upgradeOverlay');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
        selectedUpgradePlan = null;
    }

    function updateUpgradeModalBadge() {
        const tier = currentUser?.subscription_tier || 'free';
        const dot  = document.querySelector('.current-plan-badge .plan-dot');
        const label = document.getElementById('currentPlanLabel');
        if (dot) {
            dot.className = 'plan-dot ' + (tier === 'free' ? 'free-dot' : tier === 'premium' ? 'premium-dot' : 'pro-dot');
        }
        if (label) label.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
    }

    function updatePricingCards() {
        const tier = currentUser?.subscription_tier || 'free';
        
        // Reset all buttons
        const freePlanBtn    = document.getElementById('freePlanBtn');
        const premiumPlanBtn = document.getElementById('premiumPlanBtn');
        const proPlanBtn     = document.getElementById('proPlanBtn');

        // Reset button styles
        if (freePlanBtn)    { freePlanBtn.disabled = tier === 'free';    freePlanBtn.textContent = tier === 'free' ? 'Paket Aktif ✓' : 'Downgrade'; freePlanBtn.className = 'plan-btn free-btn' + (tier === 'free' ? ' current-plan-btn' : ''); }
        if (premiumPlanBtn) { premiumPlanBtn.disabled = tier === 'premium'; premiumPlanBtn.textContent = tier === 'premium' ? '✓ Paket Aktif' : '✨ Pilih Premium'; premiumPlanBtn.className = 'plan-btn premium-btn' + (tier === 'premium' ? ' current-plan-btn' : ''); }
        if (proPlanBtn)     { proPlanBtn.disabled = tier === 'pro';      proPlanBtn.textContent = tier === 'pro' ? '✓ Paket Aktif' : '🚀 Pilih Pro'; proPlanBtn.className = 'plan-btn pro-btn' + (tier === 'pro' ? ' current-plan-btn' : ''); }
    }

    function updateBillingUI() {
        const toggle   = document.getElementById('billingToggle');
        const lblMonth = document.getElementById('lblMonthly');
        const lblYear  = document.getElementById('lblYearly');
        if (toggle) toggle.classList.toggle('yearly', isYearlyBilling);
        if (lblMonth) lblMonth.classList.toggle('active', !isYearlyBilling);
        if (lblYear)  lblYear.classList.toggle('active', isYearlyBilling);

        // Update prices
        const premiumP  = document.getElementById('premiumPrice');
        const premiumPd = document.getElementById('premiumPeriod');
        const proP      = document.getElementById('proPrice');
        const proPd     = document.getElementById('proPeriod');

        if (premiumP)  premiumP.textContent  = formatRupiah(isYearlyBilling ? PRICING.premium.yearly : PRICING.premium.monthly);
        if (premiumPd) premiumPd.textContent  = isYearlyBilling ? '/ tahun' : '/ bulan';
        if (proP)      proP.textContent       = formatRupiah(isYearlyBilling ? PRICING.pro.yearly : PRICING.pro.monthly);
        if (proPd)     proPd.textContent      = isYearlyBilling ? '/ tahun' : '/ bulan';
    }

    function showPaymentStep(plan) {
        selectedUpgradePlan = plan;
        const billing = isYearlyBilling ? 'yearly' : 'monthly';
        const price   = PRICING[plan][billing];
        const planLabel = plan === 'premium' ? 'Premium 💎' : 'Pro 🚀';
        const billingLabel = billing === 'yearly' ? 'Tahunan' : 'Bulanan';

        document.getElementById('paymentSummary').innerHTML = `
            <div class="summary-row"><span>Paket</span><strong>${planLabel}</strong></div>
            <div class="summary-row"><span>Durasi</span><strong>${billingLabel}</strong></div>
            <div class="summary-row"><span>Total Bayar</span><strong>${formatRupiah(price)}</strong></div>
        `;

        document.getElementById('pricingCards').style.display = 'none';
        const payNotice = document.querySelector('.payment-notice');
        if (payNotice) payNotice.style.display = 'none';
        const billingWrap = document.querySelector('.billing-toggle-wrap');
        if (billingWrap) billingWrap.style.display = 'none';
        document.getElementById('paymentStep').style.display = 'flex';
    }

    function confirmPayment() {
        if (!selectedUpgradePlan) return;
        
        const billing = isYearlyBilling ? 'yearly' : 'monthly';
        const planLabel = selectedUpgradePlan === 'premium' ? 'Premium 💎' : 'Pro 🚀';
        const billingLabel = billing === 'yearly' ? 'Tahunan' : 'Bulanan';
        
        const btn = document.getElementById('confirmPayBtn');
        btn.textContent = 'Membuka WhatsApp...';
        btn.classList.add('loading');

        // Nomor WhatsApp Anda (Ganti dengan nomor Anda, format 628...)
        const adminWA = '6281385084327'; 
        
        const msg = `Halo Admin, saya ingin konfirmasi pembayaran upgrade SelarasKas.\n\n` +
                    `Nama: ${currentUser?.name || 'User'}\n` +
                    `Email: ${currentUser?.email || '-'}\n` +
                    `Paket: ${planLabel} (${billingLabel})\n\n` +
                    `Berikut saya lampirkan bukti transfernya. Terima kasih!`;

        const waUrl = `https://wa.me/${adminWA}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
        
        setTimeout(() => {
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-right: 6px; vertical-align: text-bottom;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> Konfirmasi ke WhatsApp Admin';
            btn.classList.remove('loading');
            closeUpgradeModal();
        }, 2000);
    }

    function updateSubscriptionStatusCard() {
        const tier = currentUser?.subscription_tier || 'free';
        const card = document.getElementById('subscriptionStatusCard');
        const icon = document.getElementById('subStatusIcon');
        const name = document.getElementById('subStatusName');
        const desc = document.getElementById('subStatusDesc');
        const btn  = document.getElementById('openUpgradeBtn');

        if (!card) return;

        card.className = 'subscription-status-card';
        if (tier === 'premium') {
            card.classList.add('is-premium');
            if (icon) icon.textContent = '💎';
            if (name) name.textContent = 'Paket Premium';
            if (desc) desc.textContent = 'Semua fitur Premium aktif ✓';
            if (btn)  { btn.textContent = 'Lihat Paket'; btn.classList.remove('is-active'); btn.disabled = false; }
        } else if (tier === 'pro') {
            card.classList.add('is-pro');
            if (icon) icon.textContent = '🚀';
            if (name) name.textContent = 'Paket Pro';
            if (desc) desc.textContent = 'Upgrade Premium untuk fitur penuh';
            if (btn)  { btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="18 15 12 9 6 15"/></svg> Upgrade Premium ✨'; btn.classList.remove('is-active'); btn.disabled = false; }
        } else {
            if (icon) icon.textContent = '🆓';
            if (name) name.textContent = 'Paket Free';
            if (desc) desc.textContent = 'Upgrade untuk fitur lengkap';
            if (btn)  { btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="18 15 12 9 6 15"/></svg> Upgrade'; btn.classList.remove('is-active'); btn.disabled = false; }
        }
    }

    // ---- Wire up upgrade modal events ----

    // Open from profile page Upgrade button
    document.getElementById('openUpgradeBtn')?.addEventListener('click', () => window.showUpgradeModal());

    // Close button
    document.getElementById('upgradeCloseBtn')?.addEventListener('click', closeUpgradeModal);

    // Close on overlay click
    document.getElementById('upgradeOverlay')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('upgradeOverlay')) closeUpgradeModal();
    });

    // Billing toggle — handle clicks on toggle, knob, and both labels
    function switchBilling(forceYearly) {
        if (typeof forceYearly === 'boolean') {
            isYearlyBilling = forceYearly;
        } else {
            isYearlyBilling = !isYearlyBilling;
        }
        updateBillingUI();
    }
    document.getElementById('billingToggle')?.addEventListener('click', () => switchBilling());
    document.getElementById('billingKnob')?.addEventListener('click', (e) => { e.stopPropagation(); switchBilling(); });
    document.getElementById('lblMonthly')?.addEventListener('click', () => switchBilling(false));
    document.getElementById('lblYearly')?.addEventListener('click', () => switchBilling(true));
    document.querySelector('.billing-toggle-wrap')?.addEventListener('click', (e) => {
        if (e.target.closest('#billingToggle') || e.target.id === 'lblMonthly' || e.target.id === 'lblYearly') return;
        switchBilling();
    });

    // Plan buttons
    document.getElementById('premiumPlanBtn')?.addEventListener('click', () => {
        const tier = currentUser?.subscription_tier || 'free';
        if (tier === 'premium') return;
        showPaymentStep('premium');
    });

    document.getElementById('proPlanBtn')?.addEventListener('click', () => {
        const tier = currentUser?.subscription_tier || 'free';
        if (tier === 'pro') return;
        showPaymentStep('pro');
    });

    // Back to pricing
    document.getElementById('backToPricingBtn')?.addEventListener('click', () => {
        document.getElementById('pricingCards').style.display = '';
        const payNotice = document.querySelector('.payment-notice');
        if (payNotice) payNotice.style.display = '';
        const billingWrap = document.querySelector('.billing-toggle-wrap');
        if (billingWrap) billingWrap.style.display = 'flex';
        document.getElementById('paymentStep').style.display = 'none';
        selectedUpgradePlan = null;
    });

    // Confirm payment
    document.getElementById('confirmPayBtn')?.addEventListener('click', confirmPayment);

    // Also hook the showToast-based "upgrade" prompts to open modal instead
    // Intercept the AI chat and export "upgrade now" messages to show modal
    const _origShowToast = window.__showToastFn;
    
    // Make modal triggerable from tier-lock messages
    window.openUpgradeModalFromLock = () => window.showUpgradeModal('premium');

    // Update subscription status card on profile page load
    const profileNavItem = document.querySelector('[data-page="profile"]');
    if (profileNavItem) {
        profileNavItem.addEventListener('click', () => {
            setTimeout(updateSubscriptionStatusCard, 100);
        });
    }

    // Initial update on app load (after showApp is called)
    const _origShowApp = showApp;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
