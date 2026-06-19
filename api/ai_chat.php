<?php
// ============================================
// SelarasKas — AI Financial Chatbot API
// ============================================
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$userId = requireAuth();
$walletId = requireActiveWallet($userId);

if ($method !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$input = getInput();
$action = $_GET['action'] ?? 'chat'; // 'chat' or 'insight'

if ($action === 'insight') {
    generateInsight($userId, $walletId);
} else {
    handleChat($userId, $walletId, $input);
}

function handleChat($userId, $walletId, $input) {
    $message = trim($input['message'] ?? '');
    if (!$message) {
        jsonResponse(['error' => 'Pesan tidak boleh kosong'], 400);
    }
    
    $db = getDB();
    $stmt = $db->prepare("SELECT subscription_tier FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    $tier = $user['subscription_tier'] ?? 'free';

    if ($tier === 'free') {
        jsonResponse(['error' => 'Fitur SelarasAI eksklusif untuk Pro/Premium. Silakan upgrade!'], 403);
    } elseif ($tier === 'pro') {
        // Count user queries in the current month from chat_history
        $currentMonth = date('Y-m');
        $stmtC = $db->prepare("
            SELECT COUNT(*) FROM chat_history 
            WHERE user_id = ? AND sender = 'user' AND DATE_FORMAT(created_at, '%Y-%m') = ?
        ");
        $stmtC->execute([$userId, $currentMonth]);
        $queryCount = $stmtC->fetchColumn();
        if ($queryCount >= 15) {
            jsonResponse(['error' => 'Kuota chat SelarasAI Akun Pro Anda (15x per bulan) telah habis. Upgrade ke Premium untuk chat tanpa batas.'], 403);
        }
    }

    $context = getFinancialContext($userId, $walletId);
    
    $prompt = "Kamu adalah Asisten Keuangan Pribadi yang cerdas, ramah, dan proaktif bernama 'SelarasAI'.\n"
            . "Berikan jawaban yang singkat, padat, dan langsung menjawab dalam bahasa Indonesia yang gaul tapi sopan.\n"
            . "Jika ada pencapaian (seperti menabung/surplus), berikan pujian.\n"
            . "Jika ada pengeluaran berlebih, berikan peringatan yang bersahabat.\n\n"
            . "Konteks Keuangan Pengguna Bulan Ini:\n$context\n\n"
            . "Pesan Pengguna: \"$message\"\n"
            . "Balasan SelarasAI:";

    $reply = callGeminiAPI($prompt);
    
    // Save to chat history
    $stmt = $db->prepare("INSERT INTO chat_history (user_id, wallet_id, message, sender) VALUES (?, ?, ?, 'user'), (?, ?, ?, 'ai')");
    $stmt->execute([$userId, $walletId, $message, $userId, $walletId, $reply]);
    
    jsonResponse(['success' => true, 'reply' => $reply]);
}

function generateInsight($userId, $walletId) {
    $db = getDB();
    $stmt = $db->prepare("SELECT subscription_tier FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $tier = $stmt->fetchColumn() ?: 'free';

    if ($tier === 'free') {
        jsonResponse(['success' => true, 'insight' => 'Buka analisis lengkap & asisten finansial dengan upgrade ke Pro atau Premium! 💎']);
    }

    $context = getFinancialContext($userId, $walletId);
    
    $prompt = "Kamu adalah Asisten Keuangan Pribadi bernama 'SelarasAI'.\n"
            . "Analisis data keuangan pengguna berikut dan berikan 1 paragraf singkat (maksimal 3 kalimat) berupa insight proaktif.\n"
            . "Jika pengeluaran lebih besar dari pemasukan, beri peringatan yang ramah.\n"
            . "Jika pengguna berhasil menabung atau pengeluaran terjaga, berikan pujian.\n"
            . "Konteks Keuangan:\n$context\n\n"
            . "Insight:";

    $reply = callGeminiAPI($prompt);
    
    jsonResponse(['success' => true, 'insight' => $reply]);
}

function getFinancialContext($userId, $walletId) {
    $db = getDB();
    $month = date('Y-m');
    
    // Summary
    $stmt = $db->prepare("
        SELECT type, COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE wallet_id = ? AND (CASE WHEN DAY(transaction_date) >= 25 THEN DATE_FORMAT(DATE_ADD(transaction_date, INTERVAL 1 MONTH), '%Y-%m') ELSE DATE_FORMAT(transaction_date, '%Y-%m') END) = ?
        GROUP BY type
    ");
    $stmt->execute([$walletId, $month]);
    $rows = $stmt->fetchAll();
    
    $income = 0; $expense = 0;
    foreach ($rows as $row) {
        if ($row['type'] === 'income') $income = $row['total'];
        if ($row['type'] === 'expense') $expense = $row['total'];
    }
    
    // Top 3 Expense Categories
    $stmt = $db->prepare("
        SELECT c.name, SUM(t.amount) as total
        FROM transactions t JOIN categories c ON t.category_id = c.id
        WHERE t.wallet_id = ? AND t.type = 'expense' AND (CASE WHEN DAY(t.transaction_date) >= 25 THEN DATE_FORMAT(DATE_ADD(t.transaction_date, INTERVAL 1 MONTH), '%Y-%m') ELSE DATE_FORMAT(t.transaction_date, '%Y-%m') END) = ?
        GROUP BY c.id ORDER BY total DESC LIMIT 3
    ");
    $stmt->execute([$walletId, $month]);
    $topCats = $stmt->fetchAll();
    
    $context = "- Pemasukan Bulan Ini: Rp " . number_format($income, 0, ',', '.') . "\n";
    $context .= "- Pengeluaran Bulan Ini: Rp " . number_format($expense, 0, ',', '.') . "\n";
    if (count($topCats) > 0) {
        $context .= "- Pengeluaran Terbesar: ";
        foreach ($topCats as $cat) {
            $context .= $cat['name'] . " (Rp " . number_format($cat['total'], 0, ',', '.') . "), ";
        }
        $context .= "\n";
    }
    
    return $context;
}

function callGeminiAPI($prompt) {
    if (empty(GEMINI_API_KEY)) {
        return "Maaf, fitur AI belum dikonfigurasi (API Key tidak ditemukan).";
    }

    $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' . GEMINI_API_KEY;
    
    $data = [
        "contents" => [
            ["parts" => [["text" => $prompt]]]
        ],
        "generationConfig" => [
            "temperature" => 0.7,
            "maxOutputTokens" => 256
        ]
    ];

    $options = [
        'http' => [
            'header'  => "Content-type: application/json\r\n",
            'method'  => 'POST',
            'content' => json_encode($data),
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
        ]
    ];
    $context  = stream_context_create($options);
    $response = @file_get_contents($url, false, $context);
    
    if ($response === false) {
        return "Maaf, AI sedang offline. Coba lagi nanti.";
    }

    $resData = json_decode($response, true);
    if (isset($resData['candidates'][0]['content']['parts'][0]['text'])) {
        return $resData['candidates'][0]['content']['parts'][0]['text'];
    }
    
    return "Maaf, saya tidak mengerti.";
}
