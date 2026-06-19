<?php
// ============================================
// SelarasKas — Midtrans Webhook Handler
// ============================================
require_once __DIR__ . '/config.php';

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Read payload
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload']);
    exit;
}

// Log notification (optional for debugging)
error_log("Midtrans Webhook Received: " . $rawInput);

$serverKey = defined('MIDTRANS_SERVER_KEY') ? MIDTRANS_SERVER_KEY : '';
$orderId = $input['order_id'] ?? '';
$statusCode = $input['status_code'] ?? '';
$grossAmount = $input['gross_amount'] ?? '';
$signatureKey = $input['signature_key'] ?? '';
$transactionStatus = $input['transaction_status'] ?? '';
$paymentType = $input['payment_type'] ?? '';

// Verify Signature
// signature_key = SHA512(order_id + status_code + gross_amount + server_key)
$localSignature = hash('sha512', $orderId . $statusCode . $grossAmount . $serverKey);

if ($localSignature !== $signatureKey) {
    http_response_code(403);
    echo json_encode(['error' => 'Signature verification failed']);
    error_log("Midtrans Webhook Signature Mismatch! Local: $localSignature, Received: $signatureKey");
    exit;
}

$db = getDB();

// Find matching pending order in database
$stmt = $db->prepare("SELECT * FROM subscription_orders WHERE order_id = ?");
$stmt->execute([$orderId]);
$order = $stmt->fetch();

if (!$order) {
    http_response_code(404);
    echo json_encode(['error' => 'Order not found in SelarasKas database']);
    exit;
}

// Map transaction status to orders status
$status = 'pending';
if ($transactionStatus === 'settlement' || $transactionStatus === 'capture') {
    $status = 'paid';
} elseif (in_array($transactionStatus, ['cancel', 'deny', 'expire'])) {
    $status = 'cancelled';
}

// Update transaction order status and save payment method if provided
$stmtU = $db->prepare("UPDATE subscription_orders SET status = ? WHERE order_id = ?");
$stmtU->execute([$status, $orderId]);

// If order is paid, activate/upgrade user subscription
if ($status === 'paid') {
    // Ensure subscription columns exist (auto-migrate)
    try { $db->exec("ALTER TABLE `users` MODIFY COLUMN `subscription_tier` VARCHAR(20) DEFAULT 'free'"); } catch(Exception $e){}
    try { $db->exec("ALTER TABLE `users` ADD COLUMN `subscription_expires_at` DATETIME NULL DEFAULT NULL"); } catch(Exception $e){}
    try { $db->exec("ALTER TABLE `users` ADD COLUMN `subscription_plan` VARCHAR(20) NULL DEFAULT NULL"); } catch(Exception $e){}
    try { $db->exec("ALTER TABLE `users` ADD COLUMN `subscription_billing` VARCHAR(20) DEFAULT 'monthly'"); } catch(Exception $e){}

    $userId = $order['user_id'];
    $tier = $order['tier']; // 'pro' or 'premium'
    $billing = $order['billing']; // 'monthly' or 'yearly'
    
    // Calculate expiration
    $expiresAt = $billing === 'yearly'
        ? date('Y-m-d H:i:s', strtotime('+1 year'))
        : date('Y-m-d H:i:s', strtotime('+1 month'));

    $stmtUser = $db->prepare("
        UPDATE users SET
            subscription_tier = ?,
            subscription_expires_at = ?,
            subscription_plan = ?,
            subscription_billing = ?
        WHERE id = ?
    ");
    $stmtUser->execute([$tier, $expiresAt, $tier, $billing, $userId]);
    error_log("Midtrans Webhook: Upgraded user $userId to tier $tier ($billing) until $expiresAt");
}

http_response_code(200);
echo json_encode(['success' => true, 'status' => $status]);
