<?php
// ============================================
// SelarasKas — Gemini Vision OCR Proxy
// Sends receipt image to Gemini AI for parsing
// ============================================
require_once __DIR__ . '/config.php';

// Allow larger POST bodies for base64 images
ini_set('post_max_size', '20M');
ini_set('upload_max_filesize', '20M');
ini_set('memory_limit', '256M');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($method !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

requireAuth();

// Read raw input
$rawInput = file_get_contents('php://input');
if (!$rawInput) {
    jsonResponse(['error' => 'Request body kosong'], 400);
}

$input = json_decode($rawInput, true);
if (!$input) {
    jsonResponse(['error' => 'Invalid JSON: ' . json_last_error_msg()], 400);
}

$imageBase64 = $input['image'] ?? '';
$mimeType = $input['mime_type'] ?? 'image/jpeg';

if (!$imageBase64) {
    jsonResponse(['error' => 'Gambar tidak ditemukan. Silakan upload ulang.'], 400);
}

// Load Gemini API key — simple file read (most reliable method)
$keyFile = __DIR__ . DIRECTORY_SEPARATOR . '.gemini_key';
$apiKey = '';
if (file_exists($keyFile)) {
    $apiKey = trim(file_get_contents($keyFile));
}
// Fallback to config.php constant
if (!$apiKey && defined('GEMINI_API_KEY') && GEMINI_API_KEY) {
    $apiKey = GEMINI_API_KEY;
}
if (!$apiKey) {
    jsonResponse([
        'error' => 'Gemini API Key belum dikonfigurasi. Buat file api/.gemini_key berisi API key.',
        'key_file' => $keyFile,
        'key_file_exists' => file_exists($keyFile),
    ], 500);
}

// Build the Gemini API prompt — optimized for Indonesian receipts
$prompt = <<<'PROMPT'
Analisis gambar struk/receipt belanja ini. Ekstrak setiap item yang DIBELI beserta harganya.

ATURAN:
1. HANYA ekstrak item produk/barang/makanan/minuman yang dibeli.
2. Untuk setiap item, berikan "name" (nama produk) dan "price" (harga total item dalam angka Rupiah, tanpa titik/koma).
3. Jika ada qty > 1 (misal "2 x 15.000"), maka "price" = qty × harga satuan = 30000, dan "qty" = 2.
4. WAJIB ABAIKAN baris-baris berikut (JANGAN masukkan ke items):
   - Pajak / PPN / PPh / Tax
   - Tas belanja / kantong plastik / paper bag / tas spunbond
   - Diskon / discount / voucher / potongan
   - Service charge
   - Subtotal / Total / Grand Total
   - Kembalian / Change / Pembulatan / Rounding
   - Info toko / alamat / kasir / tanggal / no nota / telepon
   - Metode pembayaran (Transfer, QRIS, GoPay, OVO, dll)
5. "total" = total pembayaran akhir yang tertera di struk (biasanya baris "Total" atau "Total Bayar").
6. "store_name" = nama toko/restoran jika terlihat.

FORMAT RESPONS — JSON saja, tanpa backtick, tanpa markdown:
{"items":[{"name":"Nama Produk","qty":1,"price":15000}],"total":42000,"store_name":"Nama Toko"}

Jika tidak ada item terdeteksi atau bukan struk:
{"items":[],"total":0,"store_name":"","error":"Tidak dapat membaca struk"}
PROMPT;

// Build Gemini API request
$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . urlencode($apiKey);

$requestBody = [
    'contents' => [
        [
            'parts' => [
                ['text' => $prompt],
                [
                    'inline_data' => [
                        'mime_type' => $mimeType,
                        'data' => $imageBase64
                    ]
                ]
            ]
        ]
    ],
    'generationConfig' => [
        'temperature' => 0.1,
        'maxOutputTokens' => 2048,
        'responseMimeType' => 'application/json'
    ]
];

$jsonPayload = json_encode($requestBody);
if (!$jsonPayload) {
    jsonResponse(['error' => 'Gagal memproses gambar (terlalu besar?). Error: ' . json_last_error_msg()], 500);
}

// Send request to Gemini API via cURL
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $jsonPayload,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 45,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    jsonResponse(['error' => 'Gagal menghubungi Gemini API: ' . $curlError], 500);
}

if ($httpCode !== 200) {
    $errorData = json_decode($response, true);
    $errorMsg = $errorData['error']['message'] ?? ('HTTP ' . $httpCode);
    jsonResponse(['error' => 'Gemini API error: ' . $errorMsg], 500);
}

$geminiResponse = json_decode($response, true);

// Extract the text content from Gemini response
$candidates = $geminiResponse['candidates'] ?? [];
if (empty($candidates)) {
    $blockReason = $geminiResponse['promptFeedback']['blockReason'] ?? 'unknown';
    jsonResponse(['error' => "Gemini tidak mengembalikan respons (reason: $blockReason). Coba foto ulang."], 500);
}

$finishReason = $candidates[0]['finishReason'] ?? '';
$textContent = $candidates[0]['content']['parts'][0]['text'] ?? '';

if (!$textContent) {
    jsonResponse(['error' => 'Gemini tidak dapat membaca struk. Pastikan foto jelas dan tidak blur.'], 500);
}

// Parse the JSON response from Gemini
// Strip any markdown code fences if present
$textContent = preg_replace('/^```(?:json)?\s*/s', '', $textContent);
$textContent = preg_replace('/\s*```\s*$/s', '', $textContent);
$textContent = trim($textContent);

$parsed = json_decode($textContent, true);

if (!$parsed || !isset($parsed['items'])) {
    // Try to find JSON object in the response
    if (preg_match('/\{[\s\S]*"items"\s*:\s*\[[\s\S]*\][\s\S]*\}/U', $textContent, $matches)) {
        $parsed = json_decode($matches[0], true);
    }
    
    if (!$parsed || !isset($parsed['items'])) {
        jsonResponse([
            'error' => 'Gagal memproses respons AI. Coba foto ulang dengan pencahayaan lebih baik.',
            'debug_raw' => substr($textContent, 0, 500)
        ], 500);
    }
}

// Sanitize and validate items
$items = [];
// List of keywords to exclude (in case AI doesn't follow instructions perfectly)
$excludeKeywords = ['pajak', 'tax', 'ppn', 'pph', 'tas ', 'kantong', 'plastik', 'paper bag',
    'spunbond', 'spun bond', 'diskon', 'discount', 'voucher', 'potongan', 'service charge',
    'subtotal', 'sub total', 'total', 'kembalian', 'change', 'pembulatan', 'rounding',
    'transfer', 'tunai', 'cash', 'debit', 'kredit', 'qris', 'gopay', 'ovo', 'dana',
    'shopeepay', 'linkaja', 'bsi pay', 'bca', 'bri', 'mandiri', 'bni'];

foreach ($parsed['items'] as $item) {
    $name = trim($item['name'] ?? $item['description'] ?? '');
    $price = floatval($item['price'] ?? $item['amount'] ?? 0);
    $qty = intval($item['qty'] ?? $item['quantity'] ?? 1);
    
    if (!$name || $price <= 0) continue;
    if ($price < 100 || $price > 50000000) continue;
    
    // Double-check: exclude tax/bag/discount items that AI might have included
    $nameLower = mb_strtolower($name);
    $excluded = false;
    foreach ($excludeKeywords as $kw) {
        if (strpos($nameLower, $kw) !== false) {
            $excluded = true;
            break;
        }
    }
    if ($excluded) continue;
    
    $items[] = [
        'name' => $name,
        'qty' => max(1, $qty),
        'price' => $price
    ];
}

$total = floatval($parsed['total'] ?? 0);
$storeName = trim($parsed['store_name'] ?? $parsed['storeName'] ?? '');

// If no total detected, sum from items
if ($total <= 0 && count($items) > 0) {
    $total = array_reduce($items, function($sum, $item) {
        return $sum + $item['price'];
    }, 0);
}

jsonResponse([
    'success' => true,
    'items' => $items,
    'total' => $total,
    'store_name' => $storeName,
    'item_count' => count($items)
]);
