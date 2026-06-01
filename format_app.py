import re

with open('app.js', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add format helpers
helpers = """
    function parseRupiah(str) {
        if (!str) return 0;
        return parseInt(str.toString().replace(/[^0-9]/g, '')) || 0;
    }

    function initRupiahFormatter(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.addEventListener('input', function(e) {
            let val = this.value.replace(/[^0-9]/g, '');
            if (val === '') { this.value = ''; return; }
            this.value = 'Rp ' + parseInt(val).toLocaleString('id-ID');
        });
    }
"""
c = c.replace('function formatRp(amount, short = false) {', helpers + '\n    function formatRp(amount, short = false) {')

# 2. Change inputs and parse logic in showTransactionForm
c = c.replace('<input type="number" id="txAmount" placeholder="0" min="1" required inputmode="numeric">', '<input type="text" id="txAmount" placeholder="Rp 0" required inputmode="numeric">')
c = c.replace("const amount = parseFloat(document.getElementById('txAmount').value);", "const amount = parseRupiah(document.getElementById('txAmount').value);")
c = c.replace("openModal(type === 'income' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran', html);", "openModal(type === 'income' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran', html);\n        setTimeout(() => initRupiahFormatter('txAmount'), 100);")

# 3. Change inputs and parse logic in showSavingsForm & addSavingAmount
c = c.replace('<input type="number" id="savingTarget" placeholder="0" min="1" required inputmode="numeric">', '<input type="text" id="savingTarget" placeholder="Rp 0" required inputmode="numeric">')
c = c.replace('<input type="number" id="savingCurrent" placeholder="0" min="0" value="0" \ninputmode="numeric">', '<input type="text" id="savingCurrent" placeholder="Rp 0" value="Rp 0" \ninputmode="numeric">')
c = c.replace('<input type="number" id="savingCurrent" placeholder="0" min="0" value="0" inputmode="numeric">', '<input type="text" id="savingCurrent" placeholder="Rp 0" value="Rp 0" inputmode="numeric">')

c = c.replace("const target = parseFloat(document.getElementById('savingTarget').value);", "const target = parseRupiah(document.getElementById('savingTarget').value);")
c = c.replace("const current = parseFloat(document.getElementById('savingCurrent').value) || 0;", "const current = parseRupiah(document.getElementById('savingCurrent').value) || 0;")
c = c.replace("openModal('Target Baru', html);", "openModal('Target Baru', html);\n        setTimeout(() => { initRupiahFormatter('savingTarget'); initRupiahFormatter('savingCurrent'); }, 100);")

c = c.replace('<input type="number" id="addSavingAmount" placeholder="0" min="1" required inputmode="numeric">', '<input type="text" id="addSavingAmount" placeholder="Rp 0" required inputmode="numeric">')
c = c.replace('<input type="number" id="addSavingAmount" placeholder="0" min="1" required \ninputmode="numeric">', '<input type="text" id="addSavingAmount" placeholder="Rp 0" required \ninputmode="numeric">')

c = c.replace("const amount = parseFloat(document.getElementById('addSavingAmount').value);", "const amount = parseRupiah(document.getElementById('addSavingAmount').value);")
c = c.replace("openModal('Nabung', html);", "openModal('Nabung', html);\n        setTimeout(() => initRupiahFormatter('addSavingAmount'), 100);")

# 4. Change inputs and parse logic in showBudgetForm
c = c.replace('<input type="number" id="budgetAmount" placeholder="0" min="1" required inputmode="numeric">', '<input type="text" id="budgetAmount" placeholder="Rp 0" required inputmode="numeric">')
c = c.replace('<input type="number" id="budgetAmount" placeholder="0" min="1" required \ninputmode="numeric">', '<input type="text" id="budgetAmount" placeholder="Rp 0" required \ninputmode="numeric">')

c = c.replace("const amount = parseFloat(document.getElementById('budgetAmount').value);", "const amount = parseRupiah(document.getElementById('budgetAmount').value);")
c = c.replace("openModal('Atur Anggaran', html);", "openModal('Atur Anggaran', html);\n        setTimeout(() => initRupiahFormatter('budgetAmount'), 100);")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(c)

print("Done")
