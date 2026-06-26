    // ===== THEME =====
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const label = document.getElementById('themeLabel');
        if (label) label.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
        const toggle = document.getElementById('themeToggleCheckbox');
        if (toggle) {
            toggle.checked = (theme === 'dark');
        }
    }

    function initTheme() {
        const toggle = document.getElementById('themeToggleCheckbox');
        const switchBtn = document.getElementById('themeSwitchBtn');

        async function toggleTheme() {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            if (currentUser) {
                currentUser.theme = next;
                try { await api('user.php', { method: 'PUT', body: JSON.stringify({ theme: next }) }); } catch(e) {}
            }
        }

        if (toggle) toggle.addEventListener('click', toggleTheme);
        if (switchBtn) switchBtn.addEventListener('click', toggleTheme);
    }
