<?php
// ============================================
// SelarasKas — Subscription Upgrade API (Midtrans Snap)
// ============================================
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$userId = requireAuth();

switch ($action) {
    case 'status':
        handleGetStatus($userId);
        break;
    case 'upgrade':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleUpgrade($userId);
        break;
    case 'cancel':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleCancel($userId);
        break;
    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}

function handleGetStatus($userId) {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT subscription_tier, subscription_expires_at, subscription_plan, subscription_billing
        FROM users WHERE id = ?
    ");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['error' => 'User not found'], 404);
    }

    $tier = $user['subscription_tier'] ?? 'free';
    $expiresAt = $user['subscription_expires_at'] ?? null;
    $plan = $user['subscription_plan'] ?? null;
    $billing = $user['subscription_billing'] ?? 'monthly';

    // Check if subscription has expired
    if ($expiresAt && strtotime($expiresAt) < time() && $tier !== 'free') {
        // Auto-downgrade expired subscription
        $stmt = $db->prepare("UPDATE users SET subscription_tier = 'free', subscription_expires_at = NULL WHERE id = ?");
        $stmt->execute([$userId]);
        $tier = 'free';
        $expiresAt = null;
    }

    jsonResponse([
        'success' => true,
        'tier' => $tier,
        'expires_at' => $expiresAt,
        'plan' => $plan,
        'billing' => $billing,
        'is_active' => $tier !== 'free',
    ]);
}

function handleUpgrade($userId) {
    $input = getInput();
    $tier = $input['tier'] ?? '';
    $billing = $input['billing'] ?? 'monthly'; // 'monthly' or 'yearly'

    if (!in_array($tier, ['premium', 'pro'])) {
        jsonResponse(['error' => 'Paket tidak valid'], 400);
    }

    // New Pricing table (IDR)
    $prices = [
        'pro'     => ['monthly' => 75000, 'yearly' => 540000],   // 40% discount
        'premium' => ['monthly' => 135000, 'yearly' => 972000],  // 40% discount
    ];

    $price = $prices[$tier][$billing] ?? 0;
    $db = getDB();

    // Ensure subscription columns exist & tier column is flexible VARCHAR (auto-migrate)
    try { $db->exec("ALTER TABLE `users` MODIFY COLUMN `subscription_tier` VARCHAR(20) DEFAULT 'free'"); } catch(Exception $e){}
    try { $db->exec("ALTER TABLE `users` ADD COLUMN `subscription_expires_at` DATETIME NULL DEFAULT NULL"); } catch(Exception $e){}
    try { $db->exec("ALTER TABLE `users` ADD COLUMN `subscription_plan` VARCHAR(20) NULL DEFAULT NULL"); } catch(Exception $e){}
    try { $db->exec("ALTER TABLE `users` ADD COLUMN `subscription_billing` VARCHAR(20) DEFAULT 'monthly'"); } catch(Exception $e){}

    // Fetch user details for Midtrans
    $stmtUser = $db->prepare("SELECT name, email FROM users WHERE id = ?");
    $stmtUser->execute([$userId]);
    $user = $stmtUser->fetch();
    $userName = $user['name'] ?? 'User SelarasKas';
    $userEmail = $user['email'] ?? 'user@selaraskas.com';

    // Generate unique order ID
    $orderId = 'SK-' . $userId . '-' . time() . '-' . rand(1000, 9999);

    // Call Midtrans Snap to generate token
    $snapToken = createMidtransSnapToken($orderId, $price, $userEmail, $userName);

    if (!$snapToken) {
        jsonResponse(['error' => 'Gagal membuat sesi pembayaran Midtrans. Pastikan konfigurasi server benar.'], 500);
    }

    // Insert order to db as pending
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS `subscription_orders` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `order_id` VARCHAR(100) NULL UNIQUE,
            `user_id` INT NOT NULL,
            `tier` VARCHAR(20) NOT NULL,
            `billing` VARCHAR(10) NOT NULL,
            `amount` INT NOT NULL,
            `snap_token` VARCHAR(255) NULL,
            `status` ENUM('pending','paid','cancelled') DEFAULT 'pending',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB");

        // Migration for existing table
        try { $db->exec("ALTER TABLE `subscription_orders` ADD COLUMN `order_id` VARCHAR(100) NULL UNIQUE"); } catch(Exception $e){}
        try { $db->exec("ALTER TABLE `subscription_orders` ADD COLUMN `snap_token` VARCHAR(255) NULL"); } catch(Exception $e){}

        $stmtO = $db->prepare("INSERT INTO subscription_orders (order_id, user_id, tier, billing, amount, snap_token, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')");
        $stmtO->execute([$orderId, $userId, $tier, $billing, $price, $snapToken]);
    } catch(Exception $e) {
        jsonResponse(['error' => 'Gagal mencatat transaksi di sistem: ' . $e->getMessage()], 500);
    }

    jsonResponse([
        'success' => true,
        'snap_token' => $snapToken,
        'client_key' => defined('MIDTRANS_CLIENT_KEY') ? MIDTRANS_CLIENT_KEY : '',
        'order_id' => $orderId,
        'amount' => $price,
        'tier' => $tier,
        'billing' => $billing
    ]);
}

function handleCancel($userId) {
    $db = getDB();
    $stmt = $db->prepare("UPDATE users SET subscription_tier = 'free', subscription_expires_at = NULL WHERE id = ?");
    $stmt->execute([$userId]);
    jsonResponse(['success' => true, 'message' => 'Langganan berhasil dibatalkan.']);
}

function createMidtransSnapToken($orderId, $amount, $email, $name) {
    $serverKey = defined('MIDTRANS_SERVER_KEY') ? MIDTRANS_SERVER_KEY : '';
    $isProd = defined('MIDTRANS_IS_PRODUCTION') ? MIDTRANS_IS_PRODUCTION : false;
    
    if (!$serverKey) {
        error_log('MIDTRANS_SERVER_KEY not configured');
        return null;
    }

    $url = $isProd 
        ? 'https://app.midtrans.com/snap/v1/transactions' 
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    $payload = [
        'transaction_details' => [
            'order_id' => $orderId,
            'gross_amount' => (int)$amount,
        ],
        'customer_details' => [
            'first_name' => $name,
            'email' => $email,
        ],
        'credit_card' => [
            'secure' => true,
        ]
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json',
        'Authorization: Basic ' . base64_encode($serverKey . ':')
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 201 && $httpCode !== 200) {
        error_log("Midtrans API Error: HTTP $httpCode Response: $response");
        return null;
    }

    $result = json_decode($response, true);
    return $result['token'] ?? null;
}
