<?php
// ============================================
// SelarasKas — Gemini Vision OCR Proxy
// Sends receipt image to Gemini AI for parsing
// ============================================
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($method !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

requireAuth();

$input = getInput();
$imageBase64 = $input['image'] ?? '';
$mimeType = $input['mime_type'] ?? 'image/jpeg';

if (!$imageBase64) {
    jsonResponse(['error' => 'Gambar tidak ditemukan. Silakan upload ulang.'], 400);
}

$apiKey = GEMINI_API_KEY;
if (!$apiKey) {
    jsonResponse(['error' => 'Gemini API Key belum dikonfigurasi. Tambahkan GEMINI_API_KEY di environment variables.'], 500);
}

// Build the Gemini API prompt — optimized for Indonesian receipts
$prompt = <<<'PROMPT'
Kamu adalah asisten AI yang ahli membaca struk belanja Indonesia.

Analisis gambar struk belanja ini dan ekstrak SEMUA item pembelian beserta harganya.

ATURAN PENTING:
1. Ekstrak HANYA item barang/produk yang dibeli beserta harganya
2. ABAIKAN dan JANGAN masukkan:
   - Pajak (PPN, PPh, tax)
   - Tas belanja / kantong plastik / paper bag
   - Diskon / potongan harga (tapi harga setelah diskon boleh)
   - Service charge
   - Kembalian / change
   - Subtotal / total / grand total (masukkan di field "total" saja)
   - Info toko (nama toko, alamat, telepon, kasir, tanggal, no struk)
   - Pembulatan / rounding
3. Jika ada format "qty x harga" (misal "2 x 15.000"), hitung total = qty × harga
4. Semua harga dalam Rupiah (tanpa "Rp" prefix)
5. Deteksi total belanja jika ada

Balas dalam format JSON SAJA tanpa markdown, tanpa backtick, tanpa penjelasan:
{
  "items": [
    {"name": "Nama Item", "qty": 1, "price": 15000},
    {"name": "Nama Item Lain", "qty": 2, "price": 30000}
  ],
  "total": 45000,
  "store_name": "Nama Toko (jika terdeteksi)"
}

Jika struk tidak terbaca atau bukan struk belanja, balas:
{"items": [], "total": 0, "error": "Gambar tidak terbaca sebagai struk belanja"}
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

// Send request to Gemini API via cURL
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $jsonPayload,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($jsonPayload)
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
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
    $errorMsg = $errorData['error']['message'] ?? 'HTTP ' . $httpCode;
    jsonResponse(['error' => 'Gemini API error: ' . $errorMsg], 500);
}

$geminiResponse = json_decode($response, true);

// Extract the text content from Gemini response
$candidates = $geminiResponse['candidates'] ?? [];
if (empty($candidates)) {
    jsonResponse(['error' => 'Gemini tidak mengembalikan respons. Coba foto ulang dengan pencahayaan lebih baik.'], 500);
}

$textContent = $candidates[0]['content']['parts'][0]['text'] ?? '';

if (!$textContent) {
    jsonResponse(['error' => 'Gemini tidak dapat membaca struk. Pastikan foto jelas dan tidak blur.'], 500);
}

// Parse the JSON response from Gemini
// Strip any markdown code fences if present
$textContent = preg_replace('/^```(?:json)?\s*/', '', $textContent);
$textContent = preg_replace('/\s*```$/', '', $textContent);
$textContent = trim($textContent);

$parsed = json_decode($textContent, true);

if (!$parsed || !isset($parsed['items'])) {
    // Try to salvage — maybe Gemini returned wrapped text
    // Attempt to find JSON object in the response
    if (preg_match('/\{[\s\S]*"items"[\s\S]*\}/', $textContent, $matches)) {
        $parsed = json_decode($matches[0], true);
    }
    
    if (!$parsed || !isset($parsed['items'])) {
        jsonResponse(['error' => 'Gagal memproses respons AI. Coba foto ulang.', 'raw' => $textContent], 500);
    }
}

// Sanitize and validate items
$items = [];
foreach ($parsed['items'] as $item) {
    $name = trim($item['name'] ?? $item['description'] ?? '');
    $price = floatval($item['price'] ?? $item['amount'] ?? 0);
    $qty = intval($item['qty'] ?? $item['quantity'] ?? 1);
    
    if (!$name || $price <= 0) continue;
    if ($price < 100 || $price > 50000000) continue; // Price threshold
    
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
