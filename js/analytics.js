    // ===== ANALYTICS =====
    async function loadAnalytics() {
        document.getElementById('monthLabel').textContent = formatMonthLabel(currentMonth);

        try {
            renderSkeletonChart(document.getElementById('topSpendingList'));
            document.getElementById('comparisonCards').innerHTML = '<div class="skeleton sk-item"></div>';

            const [summary, chart, weekly, comparison] = await Promise.all([
                api(`transactions.php?action=summary&month=${currentMonth}`),
                api(`transactions.php?action=chart&month=${currentMonth}`),
                api(`transactions.php?action=weekly&month=${currentMonth}`),
                api(`transactions.php?action=comparison&month=${currentMonth}`)
            ]);

            document.getElementById('analyticsIncome').textContent = formatRp(summary.income);
            document.getElementById('analyticsExpense').textContent = formatRp(summary.expense);

            const incChange = document.getElementById('analyticsIncomeChange');
            const expChange = document.getElementById('analyticsExpenseChange');

            if (summary.income_change !== 0) {
                incChange.textContent = (summary.income_change > 0 ? '+' : '') + summary.income_change + '%';
                incChange.className = 'analytics-card-change ' + (summary.income_change >= 0 ? 'positive' : 'negative');
            } else { incChange.textContent = '—'; incChange.className = 'analytics-card-change'; }

            if (summary.expense_change !== 0) {
                expChange.textContent = (summary.expense_change > 0 ? '+' : '') + summary.expense_change + '%';
                expChange.className = 'analytics-card-change ' + (summary.expense_change <= 0 ? 'positive' : 'negative');
            } else { expChange.textContent = '—'; expChange.className = 'analytics-card-change'; }

            renderAnalyticsCashflowChart(weekly.weekly);
            renderTopSpending(chart.chart);
            renderComparisonCards(comparison);
        } catch (err) {
            console.error('Analytics error:', err);
        }
    }

    let cashflowChartInstance = null;
    function renderAnalyticsCashflowChart(data) {
        const ctx = document.getElementById('analyticsCashflowChart');
        if (!ctx) return;
        if (cashflowChartInstance) cashflowChartInstance.destroy();

        if (!data || !data.length) return;

        let totalIncome = 0;
        let totalExpense = 0;
        data.forEach(d => {
            totalIncome += parseFloat(d.income);
            totalExpense += parseFloat(d.expense);
        });

        cashflowChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pemasukan', 'Pengeluaran'],
                datasets: [{
                    data: [totalIncome, totalExpense],
                    backgroundColor: ['#34d399', '#ff6b6b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'right', labels: { color: 'var(--text-primary)' } },
                    tooltip: {
                        callbacks: { label: (ctx) => formatRp(ctx.raw) }
                    }
                }
            }
        });
    }

    function renderTopSpending(chart) {
        const el = document.getElementById('topSpendingList');
        if (!el) return;
        if (!chart || !chart.length) {
            el.innerHTML = '<div class="empty-state-small">Belum ada data</div>';
            return;
        }

        const max = parseFloat(chart[0].total) || 1;
        el.innerHTML = chart.slice(0, 5).map((item, i) => {
            const val = parseFloat(item.total) || 0;
            const pct = max > 0 ? (val / max) * 100 : 0;
            const rankClass = i < 3 ? `rank-${i + 1}` : '';
            const catLabel = item.category_name || item.name || 'Lainnya';
            return `
                <div class="top-spending-item">
                    <div class="top-spending-rank ${rankClass}" ${i >= 3 ? 'style="background:var(--bg-card);color:var(--text-muted);"' : ''}>
                        ${i + 1}
                    </div>
                    <div class="top-spending-icon" style="background:${item.color}18; display:flex; align-items:center; justify-content:center;">${renderEmojiOrIcon(item.emoji, '20px', item.color)}</div>
                    <div class="top-spending-info">
                        <span class="top-spending-name">${catLabel}</span>
                        <div class="top-spending-bar">
                            <div class="top-spending-bar-fill" style="width:${pct}%;background:${item.color}"></div>
                        </div>
                    </div>
                    <span class="top-spending-amount">${formatRp(item.total, true)}</span>
                </div>`;
        }).join('');
    }

    // ===== EXPORT ANALYTICS AS PNG =====
    async function exportAnalyticsAsPng() {
        const btn = document.getElementById('exportReportBtn');
        if (!btn) return;

        if (currentUser && currentUser.subscription_tier === 'free') {
            if (typeof window.showUpgradeModal === 'function') {
                window.showUpgradeModal();
            } else {
                showToast('Export Laporan eksklusif untuk Premium/Pro. Upgrade sekarang!');
            }
            return;
        }

        // ponytail: load html2canvas on demand instead of at page load
        if (typeof html2canvas === 'undefined') {
            await new Promise((resolve, reject) => {
                var s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
                s.onload = resolve; s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        btn.classList.add('loading');
        btn.querySelector('span').textContent = 'Membuat PNG...';

        try {
            const page = document.getElementById('page-analytics');

            // Temporarily hide the header (export button) and bottom spacer for cleaner output
            const header = page.querySelector('.page-header');
            const spacer = page.querySelector('.bottom-spacer');
            const ptrCont = page.querySelector('.ptr-container');

            // Hide UI-only elements from snapshot
            if (btn) btn.style.visibility = 'hidden';
            if (ptrCont) ptrCont.style.display = 'none';

            // Force fixed-pixel page dimensions for canvas capture
            const origOverflow = page.style.overflow;
            const origMaxH = page.style.maxHeight;
            page.style.overflow = 'visible';
            page.style.maxHeight = 'none';

            const monthLabel = document.getElementById('monthLabel')?.textContent || currentMonth;
            const userName = currentUser?.name || 'SelarasKas';

            // Capture the analytics page
            const canvas = await html2canvas(page, {
                backgroundColor: getComputedStyle(document.documentElement)
                    .getPropertyValue('--bg-primary').trim() || '#0a0e1a',
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                scrollX: 0,
                scrollY: 0,
                width: page.scrollWidth,
                height: page.scrollHeight,
            });

            // Restore hidden elements
            page.style.overflow = origOverflow;
            page.style.maxHeight = origMaxH;
            if (btn) btn.style.visibility = '';
            if (ptrCont) ptrCont.style.display = '';

            // Build final canvas with branded header
            const PADDING = 40;
            const HEADER_H = 90;
            const finalW = canvas.width + PADDING * 2;
            const finalH = canvas.height + HEADER_H + PADDING * 2;

            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = finalW;
            finalCanvas.height = finalH;
            const ctx = finalCanvas.getContext('2d');

            // Background gradient
            const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
            const bgColor = isDark ? '#0a0e1a' : '#f8fafc';
            const accentColor = '#818cf8';

            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, finalW, finalH);

            // Branded header bar
            const headerGrad = ctx.createLinearGradient(0, 0, finalW, 0);
            headerGrad.addColorStop(0, 'rgba(129,140,248,0.15)');
            headerGrad.addColorStop(1, 'rgba(99,102,241,0.05)');
            ctx.fillStyle = headerGrad;
            ctx.fillRect(0, 0, finalW, HEADER_H);

            // Accent border bottom of header
            ctx.fillStyle = accentColor;
            ctx.fillRect(0, HEADER_H - 2, finalW, 2);

            // App name
            ctx.fillStyle = '#e0e7ff';
            ctx.font = `bold ${32}px Inter, sans-serif`;
            ctx.fillText('SelarasKas', PADDING, 44);

            // Subtitle: Laporan Keuangan
            ctx.fillStyle = accentColor;
            ctx.font = `500 ${14}px Inter, sans-serif`;
            ctx.fillText('Laporan Keuangan Bulanan', PADDING, 68);

            // Month label (right-aligned)
            ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
            ctx.font = `600 ${15}px Inter, sans-serif`;
            const mlW = ctx.measureText(monthLabel).width;
            ctx.fillText(monthLabel, finalW - PADDING - mlW, 44);

            // Date generated
            const now = new Date();
            const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
            ctx.font = `400 ${12}px Inter, sans-serif`;
            const dsW = ctx.measureText(dateStr).width;
            ctx.fillText(dateStr, finalW - PADDING - dsW, 68);

            // Paste the captured analytics content
            ctx.drawImage(canvas, PADDING, HEADER_H + PADDING / 2);

            // Download
            const link = document.createElement('a');
            const safeMonth = monthLabel.replace(/\s+/g, '_');
            link.download = `SelarasKas_Laporan_${safeMonth}.png`;
            link.href = finalCanvas.toDataURL('image/png');
            link.click();

            showToast(`✅ Laporan ${monthLabel} berhasil diexport!`);
        } catch (err) {
            console.error('Export error:', err);
            showToast('Gagal export laporan. Coba lagi.');
            // Restore visibility if error
            const btnEl = document.getElementById('exportReportBtn');
            if (btnEl) btnEl.style.visibility = '';
            const ptrEl = document.getElementById('page-analytics')?.querySelector('.ptr-container');
            if (ptrEl) ptrEl.style.display = '';
        } finally {
            btn.classList.remove('loading');
            btn.querySelector('span').textContent = 'Export PNG';
        }
    }

    // ===== EXPORT ANALYTICS AS PDF =====
    async function exportAnalyticsAsPdf() {
        const btn = document.getElementById('exportReportPdfBtn');
        if (!btn) return;

        if (currentUser && currentUser.subscription_tier !== 'premium') {
            if (typeof window.showUpgradeModal === 'function') {
                window.showUpgradeModal();
            } else {
                showToast('Export Laporan PDF eksklusif untuk Premium. Upgrade sekarang!');
            }
            return;
        }

        // ponytail: load html2canvas + jsPDF on demand
        if (typeof html2canvas === 'undefined') {
            await new Promise((resolve, reject) => {
                var s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
                s.onload = resolve; s.onerror = reject;
                document.head.appendChild(s);
            });
        }
        if (typeof window.jspdf === 'undefined') {
            await new Promise((resolve, reject) => {
                var s = document.createElement('script');
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                s.onload = resolve; s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        btn.classList.add('loading');
        const span = btn.querySelector('span');
        if (span) span.textContent = 'PDF...';

        try {
            const page = document.getElementById('page-analytics');

            // Temporarily hide the header and bottom spacer for cleaner output
            const pngBtn = document.getElementById('exportReportBtn');
            const ptrCont = page.querySelector('.ptr-container');

            if (btn) btn.style.visibility = 'hidden';
            if (pngBtn) pngBtn.style.visibility = 'hidden';
            if (ptrCont) ptrCont.style.display = 'none';

            const origOverflow = page.style.overflow;
            const origMaxH = page.style.maxHeight;
            page.style.overflow = 'visible';
            page.style.maxHeight = 'none';

            const monthLabel = document.getElementById('monthLabel')?.textContent || currentMonth;
            
            // Capture page
            const canvas = await html2canvas(page, {
                backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#0a0e1a',
                scale: 2,
                useCORS: true,
                allowTaint: true
            });

            // Restore visibility
            if (btn) btn.style.visibility = '';
            if (pngBtn) pngBtn.style.visibility = '';
            if (ptrCont) ptrCont.style.display = '';
            page.style.overflow = origOverflow;
            page.style.maxHeight = origMaxH;

            // Generate PDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;
            
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const safeMonth = monthLabel.replace(/\s+/g, '_');
            pdf.save(`SelarasKas_Laporan_${safeMonth}.pdf`);
            showToast(`✅ Laporan ${monthLabel} berhasil diexport ke PDF!`);
        } catch (err) {
            console.error('Export PDF error:', err);
            showToast('Gagal export PDF. Coba lagi.');
            
            const pngBtn = document.getElementById('exportReportBtn');
            if (btn) btn.style.visibility = '';
            if (pngBtn) pngBtn.style.visibility = '';
            const ptrEl = document.getElementById('page-analytics')?.querySelector('.ptr-container');
            if (ptrEl) ptrEl.style.display = '';
        } finally {
            btn.classList.remove('loading');
            if (span) span.textContent = 'PDF';
        }
    }

    function updateTime() {
        const now = new Date();
        const el = document.getElementById('statusTime');
        if (el) el.textContent = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    }

    