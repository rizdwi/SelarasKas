    // ===== NAVIGATION =====
    function initNavigation() {
        const navItems = document.querySelectorAll('#mainNav .nav-item');
        const pages = document.querySelectorAll('.page');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const target = item.dataset.page;
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                pages.forEach(p => p.classList.remove('active'));
                const page = document.getElementById(`page-${target}`);
                if (page) { page.classList.add('active'); page.scrollTop = 0; }

                if (target === 'analytics') loadAnalytics();
                if (target === 'budget') loadBudgets();
                if (target === 'savings') loadSavings();
                if (target === 'profile') loadBiometricSettings();
            });
        });

        // Quick nav from balance card
        document.getElementById('goSavingsBtn').addEventListener('click', () => {
            document.querySelector('[data-page="savings"]').click();
        });
    }
