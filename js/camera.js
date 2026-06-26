    // ===== CAMERA OCR SCANNER FUNCTIONS =====
    async function showScanReceiptForm() {
        if (currentUser && currentUser.subscription_tier === 'free') {
            if (typeof window.showUpgradeModal === 'function') {
                window.showUpgradeModal();
            } else {
                showToast('Fitur Scan Struk AI eksklusif untuk Pro/Premium. Silakan upgrade!');
            }
            return;
        }

        const categories = await loadCategories('expense');
        
        const html = `
            <div class="ocr-upload-step" id="ocrUploadStep">
                <div class="scanner-container" id="ocrDropzone">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    <p style="font-weight: 700; font-size: 15px; margin: 4px 0 0;">Ambil Foto / Pilih Berkas Struk</p>
                    <span class="scan-instructions">Mendukung kamera langsung atau unggahan PNG/JPG</span>
                    <input type="file" id="ocrFileInput" accept="image/*" capture="environment" style="display:none;">
                </div>
                
                <div class="scan-preview-wrapper" id="scanPreviewWrapper" style="margin-top: 14px;">
                    <button type="button" class="remove-preview-btn" id="removePreviewBtn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    <img src="" class="scan-preview" id="scanPreviewImg">
                </div>
                
                <div class="ocr-loading" id="ocrLoading" style="margin-top: 14px;">
                    <div class="ocr-loading-spinner" style="margin: 0 auto;"></div>
                    <span class="ocr-loading-text" style="display:block;margin-top:8px;">AI sedang membaca struk...</span>
                    <span class="ocr-loading-subtext">Menggunakan Gemini AI Vision untuk akurasi maksimal</span>
                </div>
                
                <button class="modal-submit-btn success-btn" id="startOcrBtn" style="display:none; margin-top: 14px;">
                    📷 Mulai Scan
                </button>
            </div>
            
            <div class="ocr-results-container" id="ocrResultsContainer">
                <!-- Diisi otomatis setelah parsing -->
            </div>
        `;
        
        openModal('Scan Struk Belanja', html);
        setTimeout(() => lucide.createIcons(), 50);
        
        const dropzone = document.getElementById('ocrDropzone');
        const fileInput = document.getElementById('ocrFileInput');
        const previewWrapper = document.getElementById('scanPreviewWrapper');
        const previewImg = document.getElementById('scanPreviewImg');
        const removePreviewBtn = document.getElementById('removePreviewBtn');
        const startOcrBtn = document.getElementById('startOcrBtn');
        const ocrLoading = document.getElementById('ocrLoading');
        
        let selectedFile = null;
        
        // Hide loading initially
        ocrLoading.style.display = 'none';
        
        dropzone.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
            }
        });
        
        removePreviewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetUploader();
        });
        
        startOcrBtn.addEventListener('click', () => {
            if (selectedFile) {
                runReceiptOcr(selectedFile, categories);
            }
        });
        
        function handleFileSelect(file) {
            selectedFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewWrapper.style.display = 'block';
                startOcrBtn.style.display = 'block';
                dropzone.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
        
        function resetUploader() {
            selectedFile = null;
            fileInput.value = '';
            previewImg.src = '';
            previewWrapper.style.display = 'none';
            startOcrBtn.style.display = 'none';
            dropzone.style.display = 'flex';
        }
    }
    
    // Compress image using Canvas API before sending to Gemini
    function compressImage(file, maxWidth = 1600, quality = 0.85) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                
                // Scale down if larger than maxWidth
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                // White background (helps with transparency)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to JPEG base64
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                const base64 = dataUrl.split(',')[1];
                
                console.log(`[OCR] Image compressed: ${file.size} bytes → ~${Math.round(base64.length * 0.75)} bytes (${width}x${height})`);
                resolve({ base64, mimeType: 'image/jpeg' });
            };
            img.onerror = () => reject(new Error('Gagal memuat gambar untuk kompresi'));
            img.src = URL.createObjectURL(file);
        });
    }

    async function runReceiptOcr(file, categories) {
        const ocrLoading = document.getElementById('ocrLoading');
        const startOcrBtn = document.getElementById('startOcrBtn');
        const resultsContainer = document.getElementById('ocrResultsContainer');
        const uploadStep = document.getElementById('ocrUploadStep');
        
        ocrLoading.style.display = 'flex';
        startOcrBtn.style.display = 'none';
        
        // Update loading text for AI processing
        const loadingText = ocrLoading.querySelector('.ocr-loading-text');
        const loadingSubtext = ocrLoading.querySelector('.ocr-loading-subtext');
        if (loadingText) loadingText.textContent = 'AI sedang membaca struk...';
        if (loadingSubtext) loadingSubtext.textContent = 'Mengompres gambar & mengirim ke Gemini AI';
        
        try {
            // Compress image before sending (phone cameras produce 3-12MB photos)
            if (loadingSubtext) loadingSubtext.textContent = 'Mengompres gambar...';
            const { base64, mimeType } = await compressImage(file, 1600, 0.85);
            
            console.log(`[OCR] Sending to Gemini API... (base64 length: ${base64.length})`);
            if (loadingSubtext) loadingSubtext.textContent = 'Gemini AI sedang menganalisis struk...';
            
            // Send to server-side Gemini Vision proxy
            const response = await api('ocr.php', {
                method: 'POST',
                body: JSON.stringify({ image: base64, mime_type: mimeType })
            });
            
            console.log('[OCR] Gemini response:', response);
            
            if (!response.success || !response.items) {
                throw new Error(response.error || 'AI tidak mengembalikan data item');
            }
            
            if (response.items.length === 0) {
                throw new Error('AI tidak menemukan item pada struk. Pastikan foto jelas dan tidak terpotong.');
            }
            
            // Convert Gemini response to parsedData format expected by renderScanResults
            const parsedData = {
                items: response.items.map(item => ({
                    description: item.name,
                    amount: item.price
                })),
                total: response.total || 0,
                storeName: response.store_name || ''
            };
            
            console.log(`[OCR] Parsed ${parsedData.items.length} items, total: Rp ${parsedData.total}`);
            
            ocrLoading.style.display = 'none';
            uploadStep.style.display = 'none';
            resultsContainer.style.display = 'flex';
            
            renderScanResults(parsedData, categories);
            
            // Show store name if detected
            if (parsedData.storeName) {
                showToast(`Struk dari: ${parsedData.storeName}`);
            }
            
        } catch (err) {
            console.error('Gemini OCR Error:', err);
            showToast(err.message || 'Gagal membaca struk. Pastikan foto jelas.');
            ocrLoading.style.display = 'none';
            startOcrBtn.style.display = 'block';
            
            // Reset loading text
            if (loadingText) loadingText.textContent = 'AI sedang membaca struk...';
            if (loadingSubtext) loadingSubtext.textContent = 'Menggunakan Gemini AI Vision';
        }
    }
    
    function parseReceiptText(text) {
        const lines = text.split('\n');
        const items = [];
        let detectedTotal = 0;
        
        // Price regex: matches prices at end of line - requires either "Rp" prefix or 4+ digit number
        // Avoids matching phone numbers, dates, receipt numbers
        const priceWithRpRegex = /rp\.?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*$/i;
        const priceNumberRegex = /(\d{1,3}(?:[.,]\d{3})+)\s*$/;
        const pricePlainRegex = /(\d{4,})\s*$/;
        
        // Quantity × Price pattern: "2 x 15.000", "3x15000", "2 @ 5.000"
        const qtyPriceRegex = /(\d+)\s*[x×@]\s*(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*|\d+)/i;
        
        // Total/summary keywords - lines containing these are treated as total, not items
        const totalKeywords = [
            'total', 'jumlah', 'grand total', 'subtotal', 'sub total', 'sub-total',
            'net', 'bayar', 'due', 'cash', 'tunai', 'kembali', 'kembalian', 'change',
            'amount', 'pembayaran', 'debit', 'kredit', 'debet', 'transfer', 'qris',
            'gopay', 'ovo', 'dana', 'shopeepay', 'linkaja'
        ];
        
        // Exclude lines that match any of these — tax, bags, service charges, store metadata
        const excludeRegex = /\b(pajak|tax|ppn|pph|service\s*charge|service\s*chg|svc\s*ch(?:g|arge)|tas\s*belanja|shopping\s*bag|paper\s*bag|kantong|plastik|paperbag|tote\s*bag|carrier\s*bag|tas\s*kresek|tas\s*plastik|diskon|discount|disc|potongan|voucher|promo|member|point|poin|rounding|pembulatan)\b/i;
        
        // Skip lines that look like receipt header/footer/metadata
        const metadataRegex = /\b(kasir|cashier|struk|nota|receipt|print|trx|tanggal|tgl|date|waktu|jam|time|no\.?\s*(?:antrian|meja|order|faktur|ref|trx)|outlet|store|toko|alamat|address|telp|telepon|phone|fax|npwp|kode|code|terima\s*kasih|thank|thanks|selamat\s*datang|welcome|www\.|http|\.com|\.id|ig\s*:|fb\s*:)\b/i;
        
        // Price thresholds — filter out unrealistic values
        const MIN_PRICE = 100;       // Minimum Rp 100
        const MAX_PRICE = 50000000;  // Maximum Rp 50,000,000
        
        // Track seen items for duplicate detection
        const seenItems = new Set();
        
        lines.forEach(line => {
            line = line.trim();
            if (!line) return;
            
            // Skip separator lines (----, ====, ****, etc.)
            if (/^[-=_*+~#]{3,}$/.test(line)) return;
            
            // Skip very short lines (likely OCR noise)
            if (line.length < 4) return;
            
            // Skip lines that are mostly numbers/special chars (OCR garbage)
            const alphaCount = (line.match(/[a-zA-Z]/g) || []).length;
            const totalChars = line.replace(/\s/g, '').length;
            if (totalChars > 5 && alphaCount < totalChars * 0.15) return;
            
            // Skip metadata lines (kasir, tanggal, alamat, etc.)
            if (metadataRegex.test(line)) return;
            
            // Try to extract price from line
            let priceVal = 0;
            let priceMatch = null;
            let usedQtyPattern = false;
            
            // First check for quantity × price pattern
            const qtyMatch = line.match(qtyPriceRegex);
            if (qtyMatch) {
                const qty = parseInt(qtyMatch[1]) || 1;
                const unitPrice = parseRupiah(qtyMatch[2]);
                if (qty > 0 && qty <= 999 && unitPrice > 0) {
                    priceVal = qty * unitPrice;
                    usedQtyPattern = true;
                    priceMatch = qtyMatch;
                }
            }
            
            // If no qty pattern, try price-at-end-of-line patterns
            if (!usedQtyPattern) {
                priceMatch = line.match(priceWithRpRegex) || line.match(priceNumberRegex) || line.match(pricePlainRegex);
                if (priceMatch) {
                    priceVal = parseRupiah(priceMatch[1]);
                }
            }
            
            if (!priceMatch || priceVal <= 0) return;
            
            // Apply price threshold
            if (priceVal < MIN_PRICE || priceVal > MAX_PRICE) return;
            
            // Extract description: remove the price part from the line
            let desc;
            if (usedQtyPattern) {
                // For qty patterns, take everything before the qty×price
                desc = line.substring(0, line.indexOf(priceMatch[0])).trim();
                if (!desc) {
                    desc = line.replace(priceMatch[0], '').trim();
                }
            } else {
                desc = line.replace(priceMatch[0], '').trim();
            }
            
            // Clean up leading item numbers, dots, dashes
            desc = desc.replace(/^[\d\s.\-\)#:]+/, '').trim();
            
            // Remove trailing 'x', '@' or quantity indicators
            desc = desc.replace(/\s+\d+\s*[x×@]\s*$/, '').trim();
            
            if (desc.length < 2) return;
            
            const lowerDesc = desc.toLowerCase();
            
            // Exclude tax, bags, discounts, service charges
            if (excludeRegex.test(lowerDesc)) return;
            
            // Check if this is a total/summary line
            const isTotalLine = totalKeywords.some(keyword => lowerDesc.includes(keyword));
            
            if (isTotalLine) {
                if (priceVal > detectedTotal && !lowerDesc.includes('kembali') && !lowerDesc.includes('kembalian') && !lowerDesc.includes('change')) {
                    detectedTotal = priceVal;
                }
            } else {
                // Duplicate detection: skip if we've seen this exact item+price
                const itemKey = `${desc.toLowerCase()}|${priceVal}`;
                if (seenItems.has(itemKey)) return;
                seenItems.add(itemKey);
                
                items.push({
                    description: desc,
                    amount: priceVal
                });
            }
        });
        
        // If no explicit total was found, compute from items
        if (detectedTotal === 0 && items.length > 0) {
            detectedTotal = items.reduce((sum, item) => sum + item.amount, 0);
        }
        
        return { items, total: detectedTotal };
    }
    
    function renderScanResults(parsedData, categories) {
        const container = document.getElementById('ocrResultsContainer');
        
        const flatCategories = [];
        categories.forEach(cat => {
            if (cat.children && cat.children.length > 0) {
                cat.children.forEach(ch => {
                    flatCategories.push({ id: ch.id, name: ch.name, parentName: cat.name });
                });
            } else {
                flatCategories.push({ id: cat.id, name: cat.name, parentName: '' });
            }
        });
        
        function guessCategoryId(desc) {
            const d = desc.toLowerCase();
            
            // Define keyword → target category name mappings (checked in order of specificity)
            const rules = [
                // Kopi/Cafe
                { keywords: ['kopi', 'coffee', 'latte', 'cappuccino', 'americano', 'espresso', 'mocha', 'macchiato', 'cafe', 'starbucks', 'kafe'], target: 'kopi/cafe' },
                // Boba/Minuman
                { keywords: ['boba', 'chatime', 'haus', 'gulu', 'xing fu tang', 'tiger sugar', 'kokumi', 'esteh', 'teh', 'jus', 'juice', 'milkshake', 'smoothie', 'shake'], target: 'boba/minuman' },
                // Street Food
                { keywords: ['nasi goreng', 'mie goreng', 'bakso', 'soto', 'sate', 'siomay', 'batagor', 'gorengan', 'martabak', 'pempek', 'ketoprak', 'gado', 'pecel', 'rawon', 'rendang', 'nasi padang', 'nasi uduk', 'nasi kuning', 'bubur', 'rujak', 'cilok', 'cireng', 'sempol', 'tahu', 'tempe', 'lontong'], target: 'street food' },
                // Restaurant
                { keywords: ['restaurant', 'resto', 'restoran', 'warung', 'makan siang', 'makan malam', 'dining', 'dine'], target: 'restaurant' },
                // Jajan (general snack/food)
                { keywords: ['snack', 'jajan', 'roti', 'biskuit', 'donat', 'cokelat', 'chocolate', 'permen', 'keripik', 'chips', 'mie instan', 'indomie', 'wafer', 'kue', 'ice cream', 'es krim', 'gelato', 'pizza', 'burger', 'ayam', 'chicken', 'mie', 'makan', 'minum', 'soda', 'fanta', 'coca cola', 'sprite', 'pepsi', 'pocari'], target: 'jajan' },
                // Belanja Sayur/Buah
                { keywords: ['sayur', 'sayuran', 'buah', 'apel', 'jeruk', 'pisang', 'mangga', 'tomat', 'wortel', 'kentang', 'bayam', 'kangkung', 'brokoli', 'selada', 'timun', 'terong', 'cabai', 'cabe', 'jagung', 'pepaya', 'semangka', 'melon', 'anggur', 'alpukat', 'bawang'], target: 'belanja sayur/buah' },
                // Daging/Ikan
                { keywords: ['daging', 'ikan', 'ayam', 'sapi', 'kambing', 'udang', 'cumi', 'tuna', 'salmon', 'lele', 'nila', 'patin', 'gurame', 'bandeng', 'tongkol', 'seafood'], target: 'daging/ikan' },
                // Bumbu/Rempah
                { keywords: ['bumbu', 'rempah', 'lada', 'merica', 'kunyit', 'jahe', 'lengkuas', 'sereh', 'daun salam', 'ketumbar', 'pala', 'cengkeh', 'kayu manis', 'kecap', 'saus', 'sambal', 'terasi'], target: 'bumbu/rempah' },
                // Beras/Minyak
                { keywords: ['beras', 'minyak goreng', 'minyak', 'gula', 'garam', 'tepung', 'mentega', 'margarin', 'santan'], target: 'beras/minyak' },
                // Snack/Minuman (Dapur)
                { keywords: ['air mineral', 'aqua', 'galon', 'le minerale'], target: 'snack/minuman' },
                // Dapur (general groceries)
                { keywords: ['telur', 'susu', 'keju', 'yoghurt', 'roti tawar', 'selai', 'sereal', 'oat', 'pasta', 'spaghetti', 'macaroni'], target: 'dapur' },
                // Gas/LPG
                { keywords: ['gas', 'lpg', 'elpiji', 'tabung gas'], target: 'gas/lpg' },
                // Bensin/BBM
                { keywords: ['bensin', 'bbm', 'pertamax', 'pertalite', 'solar', 'dexlite', 'fuel', 'shell', 'pertamina'], target: 'bensin/bbm' },
                // Parkir/Tol
                { keywords: ['parkir', 'tol', 'e-toll', 'etoll'], target: 'parkir/tol' },
                // Ojol/Taksi
                { keywords: ['gojek', 'grab', 'ojek', 'ojol', 'taksi', 'taxi', 'uber', 'maxim', 'gocar', 'grabcar', 'goride', 'grabbike'], target: 'ojol/taksi' },
                // Transport (general)
                { keywords: ['angkot', 'bus', 'kereta', 'krl', 'mrt', 'lrt', 'transjakarta', 'busway', 'commuter', 'tiket'], target: 'angkutan umum' },
                // Obat-obatan
                { keywords: ['obat', 'paracetamol', 'ibuprofen', 'amoxicillin', 'antangin', 'bodrex', 'paramex', 'apotek', 'pharmacy', 'farmasi'], target: 'obat-obatan' },
                // Dokter/RS
                { keywords: ['dokter', 'rumah sakit', 'rs ', 'klinik', 'lab', 'laboratorium', 'cek darah', 'rontgen', 'usg'], target: 'dokter/rs' },
                // Vitamin/Suplemen
                { keywords: ['vitamin', 'suplemen', 'supplement', 'multivitamin', 'omega', 'kalsium', 'zinc'], target: 'vitamin/suplemen' },
                // Laundry
                { keywords: ['laundry', 'cuci', 'dry clean', 'setrika'], target: 'laundry' },
                // Listrik
                { keywords: ['listrik', 'pln', 'token listrik', 'pulsa listrik', 'kwh'], target: 'listrik' },
                // Internet/WiFi
                { keywords: ['internet', 'wifi', 'indihome', 'firstmedia', 'biznet', 'myrepublic', 'cbn'], target: 'internet' },
                // Air PDAM
                { keywords: ['pdam', 'air pam'], target: 'air (pdam)' },
                // Pulsa/Paket Data
                { keywords: ['pulsa', 'paket data', 'kuota', 'telkomsel', 'indosat', 'xl', 'axis', 'tri', 'smartfren'], target: 'internet' },
                // Household cleaning
                { keywords: ['sabun', 'shampoo', 'sampo', 'odol', 'pasta gigi', 'sikat gigi', 'deterjen', 'pewangi', 'pembersih', 'tissue', 'tisu', 'kapas', 'pembalut', 'popok', 'diapers', 'pampers'], target: 'kebersihan' },
                // Pakaian
                { keywords: ['baju', 'celana', 'jaket', 'kaos', 'kemeja', 'dress', 'rok', 'jeans', 'sweater', 'hoodie'], target: 'baju' },
                // Sepatu
                { keywords: ['sepatu', 'sandal', 'sendal', 'sneakers', 'boots'], target: 'sepatu' },
                // Sekolah
                { keywords: ['spp', 'sekolah', 'uang sekolah', 'bimbel', 'les', 'kursus', 'tuition'], target: 'sekolah/spp' },
                // Film/Bioskop
                { keywords: ['bioskop', 'cinema', 'cgv', 'xxi', 'cinepolis', 'film', 'movie', 'nonton'], target: 'film/bioskop' },
                // Game
                { keywords: ['game', 'gaming', 'steam', 'playstation', 'ps4', 'ps5', 'xbox', 'nintendo', 'top up', 'topup'], target: 'game' },
                // Streaming
                { keywords: ['netflix', 'spotify', 'disney', 'youtube premium', 'hbo', 'viu', 'vidio', 'iqiyi', 'wetv'], target: 'streaming' },
            ];
            
            for (const rule of rules) {
                if (rule.keywords.some(k => d.includes(k))) {
                    const found = flatCategories.find(c => c.name.toLowerCase() === rule.target);
                    if (found) return found.id;
                    // Partial match fallback
                    const partial = flatCategories.find(c => c.name.toLowerCase().includes(rule.target) || rule.target.includes(c.name.toLowerCase()));
                    if (partial) return partial.id;
                }
            }
            
            const lainnya = flatCategories.find(c => c.name.toLowerCase().includes('lainnya'));
            return lainnya ? lainnya.id : '';
        }
        
        // Build grouped category options (optgroup for parents with children)
        function buildCategoryOptions(guessedCatId) {
            let html = '<option value="">Kategori...</option>';
            categories.filter(c => c.type === 'expense' || !c.type).forEach(cat => {
                if (cat.children && cat.children.length > 0) {
                    html += `<optgroup label="${cat.name}">`;
                    cat.children.forEach(ch => {
                        html += `<option value="${ch.id}" ${ch.id == guessedCatId ? 'selected' : ''}>${ch.name}</option>`;
                    });
                    html += '</optgroup>';
                } else {
                    html += `<option value="${parseInt(cat.id)}" ${cat.id == guessedCatId ? 'selected' : ''}>${escapeHTML(cat.name)}</option>`;
                }
            });
            return html;
        }
        
        let itemsHTML = '';
        if (parsedData.items.length === 0) {
            itemsHTML = `<div class="empty-state-small">Tidak ada item terdeteksi, silakan ketik manual atau ulangi scan.</div>`;
        } else {
            itemsHTML = parsedData.items.map((item, idx) => {
                const guessedCatId = guessCategoryId(item.description);
                return `
                    <div class="ocr-item-row" data-index="${idx}">
                        <input type="checkbox" class="ocr-item-check" checked id="check_${idx}">
                        <input type="text" class="ocr-item-desc" value="${escapeHTML(item.description)}" placeholder="Nama barang" id="desc_${idx}">
                        <input type="text" class="ocr-item-amount" value="Rp ${item.amount.toLocaleString('id-ID')}" placeholder="Rp 0" id="amount_${idx}">
                        <select class="ocr-item-cat" id="cat_${idx}">
                            ${buildCategoryOptions(guessedCatId)}
                        </select>
                    </div>
                `;
            }).join('');
        }
        
        container.innerHTML = `
            <div class="ocr-total-header" style="width: 100%;">
                <span class="ocr-total-label">Total Terdeteksi</span>
                <span class="ocr-total-value" id="ocrTotalText">Rp ${parsedData.total.toLocaleString('id-ID')}</span>
            </div>
            
            <div class="ocr-items-list-header" style="width: 100%;">Daftar Item Struk</div>
            <div class="ocr-items-list" style="width: 100%;">
                ${itemsHTML}
            </div>
            
            <div class="ocr-actions" style="width: 100%;">
                <button class="modal-submit-btn" id="saveSplitBtn" style="margin-top: 6px;">
                    🛍️ Simpan sebagai Transaksi Terpisah
                </button>
                <button class="modal-submit-btn success-btn" id="saveCombinedBtn">
                    💸 Simpan sebagai Satu Transaksi Gabungan
                </button>
                <button class="modal-submit-btn" style="background:var(--bg-card);color:var(--text-muted);border:1px solid var(--border-light);box-shadow:none;" id="backToUploadBtn">
                    Kembali
                </button>
            </div>
        `;
        
        parsedData.items.forEach((_, idx) => {
            initRupiahFormatter(`amount_${idx}`);
        });
        
        document.getElementById('backToUploadBtn').addEventListener('click', () => {
            document.getElementById('ocrResultsContainer').style.display = 'none';
            const uploadStep = document.getElementById('ocrUploadStep');
            uploadStep.style.display = 'block';
            document.getElementById('ocrDropzone').style.display = 'flex';
            document.getElementById('scanPreviewWrapper').style.display = 'none';
            document.getElementById('startOcrBtn').style.display = 'none';
        });
        
        document.getElementById('saveSplitBtn').addEventListener('click', () => saveTransactions(true, parsedData.items));
        document.getElementById('saveCombinedBtn').addEventListener('click', () => saveTransactions(false, parsedData.items, parsedData.total));
    }
    
    async function saveTransactions(split, parsedItems, detectedTotal = 0) {
        const rows = document.querySelectorAll('.ocr-item-row');
        const transactionsToSave = [];
        
        let combinedAmount = 0;
        const combinedDescriptions = [];
        let combinedCategory = '';
        
        try {
            rows.forEach(row => {
                const idx = row.dataset.index;
                const isChecked = document.getElementById(`check_${idx}`).checked;
                if (!isChecked) return;
                
                const desc = document.getElementById(`desc_${idx}`).value.trim();
                const amount = parseRupiah(document.getElementById(`amount_${idx}`).value);
                const categoryId = document.getElementById(`cat_${idx}`).value;
                
                if (!desc) return;
                if (!amount || amount <= 0) return;
                
                if (split) {
                    if (!categoryId) {
                        showToast(`Pilih kategori untuk item: "${desc}"`);
                        throw new Error('Missing Category');
                    }
                    transactionsToSave.push({
                        category_id: categoryId,
                        amount: amount,
                        type: 'expense',
                        description: desc,
                        transaction_date: new Date().toISOString().slice(0, 10)
                    });
                } else {
                    combinedAmount += amount;
                    combinedDescriptions.push(desc);
                    if (!combinedCategory && categoryId) {
                        combinedCategory = categoryId;
                    }
                }
            });
            
            if (!split) {
                if (combinedAmount === 0) {
                    showToast('Pilih minimal satu item untuk disimpan');
                    return;
                }
                if (!combinedCategory) {
                    showToast('Pilih minimal satu kategori pada item terpilih');
                    return;
                }
                transactionsToSave.push({
                    category_id: combinedCategory,
                    amount: combinedAmount,
                    type: 'expense',
                    description: 'Gabungan Struk: ' + combinedDescriptions.join(', ').slice(0, 200),
                    transaction_date: new Date().toISOString().slice(0, 10)
                });
            }
            
            if (transactionsToSave.length === 0) {
                showToast('Pilih minimal satu item untuk disimpan');
                return;
            }
            
            showToast('Menyimpan transaksi...');
            for (let tx of transactionsToSave) {
                await api('transactions.php', {
                    method: 'POST',
                    body: JSON.stringify(tx)
                });
            }
            closeModal();
            showToast('Semua transaksi berhasil disimpan! 📝');
            loadDashboard();
        } catch (err) {
            if (err.message !== 'Missing Category') {
                showToast(err.message || 'Gagal menyimpan transaksi');
            }
        }
    }
