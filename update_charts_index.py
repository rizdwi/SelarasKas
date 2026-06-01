import re

with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# Add Chart.js to head
if 'chart.js' not in c:
    c = c.replace('</head>', '    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n</head>')

# Replace bar chart with Cashflow Donut canvas
bar_chart_html = """
                  <!-- Bar Chart -->
                  <div class="chart-section">
                      <h3>Harian</h3>
                      <div class="bar-chart" id="barChart"></div>
                  </div>
"""
donut_chart_html = """
                  <!-- Cashflow Donut -->
                  <div class="chart-section" style="background:var(--bg-card); border-radius:16px; padding:16px; margin: 0 20px;">
                      <h3>Cashflow Bulan Ini</h3>
                      <div style="position:relative; height:180px; width:100%; display:flex; justify-content:center;">
                          <canvas id="cashflowChart"></canvas>
                      </div>
                  </div>
"""
if 'barChart' in c:
    c = re.sub(r'<!-- Bar Chart -->.*?</div>\s*</div>', donut_chart_html.strip(), c, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print("index.html updated")
