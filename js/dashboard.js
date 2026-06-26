    // ===== DASHBOARD =====
    async function loadDashboard() {
        try {
            renderSkeletonTransactions(document.getElementById('transactionsList'));
            renderSkeletonChart(document.getElementById('spendingCategories'));
            
            const data = await api(`transactions.php?action=dashboard&month=${currentMonth}&limit=20`);

            renderBalance(data.summary);
            renderSpendingChart(data.chart);
            renderTransactions(document.getElementById('transactionsList'), data.transactions);
            
            await loadGamification();
        } catch (err) {
            console.error('Dashboard error:', err);
        }
    }

    function renderBalance(data) {
        const el = document.getElementById('mainBalance');
        animateNumber(el, data.balance);

        const net = data.income - data.expense;
        const changeEl = document.getElementById('balanceChange');
        const changeText = document.getElementById('balanceChangeText');

        if (net > 0) {
            changeEl.className = 'balance-change positive';
            changeText.textContent = '+' + formatRp(net) + ' bulan ini';
        } else if (net < 0) {
            changeEl.className = 'balance-change negative';
            changeText.textContent = '-' + formatRp(Math.abs(net)) + ' bulan ini';
        } else {
            changeEl.className = 'balance-change neutral';
            changeText.textContent = 'Rp 0 bulan ini';
        }
    }

    function animateNumber(el, target) {
        const duration = 1000;
        const start = Date.now();
        const startVal = 0;
        function update() {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(startVal + (target - startVal) * eased);
            el.textContent = current.toLocaleString('id-ID');
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    // ===== SPENDING CHART =====
    function renderSpendingChart(chartItems) {
        const canvas = document.getElementById('spendingChart');
        if (!canvas) return;

        const total = chartItems ? chartItems.reduce((s, d) => s + parseFloat(d.total), 0) : 0;
        document.getElementById('chartTotalAmount').textContent = formatRp(total, true);

        // Render categories
        const catEl = document.getElementById('spendingCategories');
        if (catEl) {
            setTimeout(() => {
                if (window.lucide) lucide.createIcons();
            }, 50);
        }
        
        if (!chartItems || !chartItems.length || isNaN(total) || total <= 0) {
            if (catEl) catEl.innerHTML = '<div class="empty-state-small">Belum ada data</div>';
            // Clear canvas
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        if (catEl) {
            catEl.innerHTML = chartItems.slice(0, 5).map(item => {
                const catLabel = item.category_name || item.name || 'Lainnya';
                return `
                <div class="category-item">
                    <div class="category-dot" style="background:${item.color || '#94a3b8'}"></div>
                    <div class="category-info">
                        <span class="category-name" style="display:flex;align-items:center;gap:8px;">${renderEmojiOrIcon(item.emoji, '16px')} ${catLabel}</span>
                        <span class="category-amount">${formatRp(item.total, true)} · ${((parseFloat(item.total) / total) * 100).toFixed(0)}%</span>
                    </div>
                </div>
            `;
            }).join('');
        }

        // Draw donut
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 150 * dpr;
        canvas.height = 150 * dpr;
        canvas.style.width = '120px';
        canvas.style.height = '120px';
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.scale(dpr, dpr);
        const cx = 75, cy = 75, r = 54, lw = 12, gap = 0.04;
        let angle = -Math.PI / 2;

        chartItems.forEach(item => {
            const val = parseFloat(item.total) || 0;
            const slice = Math.max(0, (val / total) * (2 * Math.PI) - gap);
            ctx.beginPath();
            ctx.arc(cx, cy, r, angle, angle + slice);
            ctx.strokeStyle = item.color || '#818cf8';
            ctx.lineWidth = lw;
            ctx.lineCap = 'round';
            ctx.stroke();
            angle += slice + gap;
        });
    }

    // ===== NEW DASHBOARD CHARTS =====
    function renderDashboardCashflowChart(data) {
        const canvas = document.getElementById('dashboardCashflowChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 350 * dpr; canvas.height = 120 * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0,0, 350, 120);
        
        if (!data || !data.length) return;
        
        const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
        const w = 350; const h = 100;
        const stepX = w / (Math.max(data.length - 1, 1));
        
        function drawLine(key, color) {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            data.forEach((d, i) => {
                const x = i * stepX;
                const y = h - (d[key] / maxVal) * h + 10;
                if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            });
            ctx.stroke();
        }
        
        drawLine('expense', '#ff6b6b'); // accent-coral
        drawLine('income', '#34d399'); // color-success
    }
    
    function renderTrendChart(data) {
        const canvas = document.getElementById('trendChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 350 * dpr; canvas.height = 80 * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0,0, 350, 80);
        
        if (!data || !data.length) return;
        
        const maxVal = Math.max(...data.map(d => d.expense), 1);
        const w = 350; const h = 60;
        const stepX = w / (Math.max(data.length - 1, 1));
        
        ctx.beginPath();
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        data.forEach((d, i) => {
            const x = i * stepX;
            const y = h - (d.expense / maxVal) * h + 10;
            if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        });
        ctx.stroke();
        
        // gradient fill
        const grad = ctx.createLinearGradient(0,0,0,h+10);
        grad.addColorStop(0, 'rgba(129, 140, 248, 0.4)');
        grad.addColorStop(1, 'rgba(129, 140, 248, 0)');
        ctx.lineTo(w, h+20);
        ctx.lineTo(0, h+20);
        ctx.fillStyle = grad;
        ctx.fill();
    }
    
    function renderComparisonCards(data) {
        const el = document.getElementById('comparisonCards');
        if (!el || !data) return;
        
        function makeCard(type, label, rawCurr, rawPrev, colorCls) {
            const curr = parseFloat(rawCurr) || 0;
            const prev = parseFloat(rawPrev) || 0;
            const pct = prev > 0 ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100.0 : 0.0);
            const max = Math.max(curr, prev, 1);
            const cH = Math.max(10, (curr/max)*100);
            const pH = Math.max(10, (prev/max)*100);
            
            return `
            <div class="comparison-card fade-in-up">
                <div class="comparison-icon ${colorCls}">
                    ${type === 'income' ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>' : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>'}
                </div>
                <div class="comparison-info">
                    <span class="comparison-label">${label}</span>
                    <span class="comparison-value">${formatRp(curr, true)}</span>
                    <span style="font-size:10px;color:${pct>0?(type==='income'?'var(--color-success)':'var(--color-danger)'):'var(--text-muted)'}">${pct>0?'+':''}${pct.toFixed(1)}% vs bln lalu</span>
                </div>
                <div class="comparison-bars">
                    <div class="comparison-bar-wrap"><div class="comparison-bar-fill curr" style="width:${cH}%"></div></div>
                    <div class="comparison-bar-wrap"><div class="comparison-bar-fill prev" style="width:${pH}%"></div></div>
                </div>
            </div>`;
        }
        
        el.innerHTML = makeCard('income', 'Pemasukan', data.current_income, data.prev_income, 'income') + 
                       makeCard('expense', 'Pengeluaran', data.current_expense, data.prev_expense, 'expense');
    }
