import re

with open('app.js', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. formatRp abbreviations
c = c.replace("return 'Rp ' + (abs / 1000000).toFixed(1) + 'M';", "return 'Rp ' + (abs / 1000000).toFixed(1) + ' Jt';")
c = c.replace("return 'Rp ' + (abs / 1000).toFixed(0) + 'K';", "return 'Rp ' + (abs / 1000).toFixed(0) + ' Rb';")

# 2. Re-implement renderTrendChart
trend_chart_new = """
    let trendChartInstance = null;
    function renderTrendChart(data) {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;
        if (trendChartInstance) trendChartInstance.destroy();
        
        if (!data || !data.length) return;
        
        const labels = data.map(d => {
            const [y, m] = d.month.split('-');
            return MONTHS_ID[parseInt(m)-1].substring(0,3);
        });
        const vals = data.map(d => d.total);
        
        trendChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pengeluaran',
                    data: vals,
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ff6b6b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: { label: (ctx) => formatRp(ctx.raw) }
                    }
                },
                scales: {
                    y: { 
                        display: true, 
                        ticks: { callback: (val) => formatRp(val, true) }
                    },
                    x: { display: true }
                }
            }
        });
    }
"""
c = re.sub(r'function renderTrendChart\(data\) \{.*?(?=function renderBarChart)', trend_chart_new.strip() + '\n\n    ', c, flags=re.DOTALL)

# 3. Re-implement renderBarChart -> renderCashflowChart
donut_chart_new = """
    let cashflowChartInstance = null;
    function renderCashflowChart(data) {
        const ctx = document.getElementById('cashflowChart');
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
                    legend: { position: 'right', labels: { color: 'var(--text-main)' } },
                    tooltip: {
                        callbacks: { label: (ctx) => formatRp(ctx.raw) }
                    }
                }
            }
        });
    }
"""
c = re.sub(r'function renderBarChart\(data\) \{.*?(?=function renderTopSpending)', donut_chart_new.strip() + '\n\n    ', c, flags=re.DOTALL)

# Update the call from renderBarChart to renderCashflowChart in analytics
c = c.replace('renderBarChart(data.cashflow);', 'renderCashflowChart(data.cashflow);')
c = c.replace('renderBarChart(', 'renderCashflowChart(')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(c)

print("app.js charts updated")
