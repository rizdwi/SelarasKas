<?php
// ============================================
// SelarasKas — Subscription Upgrade API
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
    $method = $input['payment_method'] ?? 'transfer';

    if (!in_array($tier, ['premium', 'pro'])) {
        jsonResponse(['error' => 'Paket tidak valid'], 400);
    }

    // Pricing table (IDR)
    $prices = [
        'premium' => ['monthly' => 29000, 'yearly' => 209000],  // yearly = 29000*12 * 0.6
        'pro'     => ['monthly' => 59000, 'yearly' => 425000],  // yearly = 59000*12 * 0.6
    ];

    $price = $prices[$tier][$billing] ?? 0;

    // Set expiry: 1 month or 1 year from now
    $expiresAt = $billing === 'yearly'
        ? date('Y-m-d H:i:s', strtotime('+1 year'))
        : date('Y-m-d H:i:s', strtotime('+1 month'));

    $db = getDB();

    // Ensure subscription columns exist (auto-migrate)
    try { $db->exec("ALTER TABLE `users` ADD COLUMN `subscription_expires_at` DATETIME NULL DEFAULT NULL"); } catch(Exception $e){}
    try { $db->exec("ALTER TABLE `users` ADD COLUMN `subscription_plan` VARCHAR(20) NULL DEFAULT NULL"); } catch(Exception $e){}
    try { $db->exec("ALTER TABLE `users` ADD COLUMN `subscription_billing` ENUM('monthly','yearly') DEFAULT 'monthly'"); } catch(Exception $e){}

    // Update user subscription
    $stmt = $db->prepare("
        UPDATE users SET
            subscription_tier = ?,
            subscription_expires_at = ?,
            subscription_plan = ?,
            subscription_billing = ?
        WHERE id = ?
    ");
    $stmt->execute([$tier, $expiresAt, $tier, $billing, $userId]);

    // Log the transaction (if subscriptions table exists)
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS `subscription_orders` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` INT NOT NULL,
            `tier` VARCHAR(20) NOT NULL,
            `billing` VARCHAR(10) NOT NULL,
            `amount` INT NOT NULL,
            `payment_method` VARCHAR(50) NOT NULL,
            `status` ENUM('pending','paid','cancelled') DEFAULT 'pending',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB");

        $stmtO = $db->prepare("INSERT INTO subscription_orders (user_id, tier, billing, amount, payment_method, status) VALUES (?, ?, ?, ?, ?, 'pending')");
        $stmtO->execute([$userId, $tier, $billing, $price, $method]);
        $orderId = $db->lastInsertId();
    } catch(Exception $e) {
        $orderId = null;
    }

    // Get payment instructions
    $instructions = getPaymentInstructions($method, $price, $tier, $billing);

    jsonResponse([
        'success' => true,
        'message' => "Berhasil upgrade ke $tier! 🎉",
        'tier' => $tier,
        'billing' => $billing,
        'amount' => $price,
        'expires_at' => $expiresAt,
        'order_id' => $orderId,
        'payment_instructions' => $instructions,
    ]);
}

function handleCancel($userId) {
    $db = getDB();
    $stmt = $db->prepare("UPDATE users SET subscription_tier = 'free', subscription_expires_at = NULL WHERE id = ?");
    $stmt->execute([$userId]);
    jsonResponse(['success' => true, 'message' => 'Langganan berhasil dibatalkan.']);
}

function getPaymentInstructions($method, $amount, $tier, $billing) {
    $amountFmt = 'Rp ' . number_format($amount, 0, ',', '.');
    $tierLabel = ucfirst($tier);
    $billingLabel = $billing === 'yearly' ? 'Tahunan' : 'Bulanan';

    switch ($method) {
        case 'transfer':
            return [
                'title' => 'Transfer Bank',
                'steps' => [
                    "Transfer $amountFmt ke rekening BCA: 1234567890 a.n. SelarasKas",
                    "Gunakan keterangan: UPGRADE-$tierLabel-" . strtoupper($billing),
                    "Kirim bukti transfer ke: support@selaraskas.com",
                    "Akun Premium aktif dalam 1×24 jam kerja",
                ]
            ];
        case 'gopay':
            return [
                'title' => 'GoPay',
                'steps' => [
                    "Transfer $amountFmt ke GoPay: 0812-3456-7890 (SelarasKas)",
                    "Gunakan catatan: UPGRADE-$tierLabel",
                    "Screenshot & kirim ke: support@selaraskas.com",
                    "Akun Premium aktif dalam 1×24 jam kerja",
                ]
            ];
        case 'ovo':
            return [
                'title' => 'OVO',
                'steps' => [
                    "Transfer $amountFmt ke OVO: 0812-3456-7890 (SelarasKas)",
                    "Gunakan catatan: UPGRADE-$tierLabel",
                    "Screenshot & kirim ke: support@selaraskas.com",
                    "Akun Premium aktif dalam 1×24 jam kerja",
                ]
            ];
        case 'qris':
            return [
                'title' => 'QRIS',
                'steps' => [
                    "Scan QRIS SelarasKas di bawah ini",
                    "Masukkan nominal $amountFmt",
                    "Screenshot bukti bayar & kirim ke: support@selaraskas.com",
                    "Akun Premium aktif dalam 1×24 jam kerja",
                ]
            ];
        default:
            return ['title' => 'Pembayaran', 'steps' => ["Hubungi support@selaraskas.com untuk instruksi pembayaran $amountFmt"]];
    }
}
