<?php
// ============================================
// SelarasKas — Subscription API
// ============================================
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$userId = requireAuth();

$action = $_GET['action'] ?? 'status';

if ($action === 'status') {
    $db = getDB();
    $stmt = $db->prepare("SELECT subscription_tier FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $tier = $stmt->fetchColumn();
    
    jsonResponse(['success' => true, 'tier' => $tier]);
} elseif ($action === 'upgrade') {
    if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
    
    $input = getInput();
    $tier = $input['tier'] ?? '';
    
    if (!in_array($tier, ['free', 'premium', 'pro'])) {
        jsonResponse(['error' => 'Tier tidak valid'], 400);
    }
    
    $db = getDB();
    $stmt = $db->prepare("UPDATE users SET subscription_tier = ? WHERE id = ?");
    $stmt->execute([$tier, $userId]);
    
    jsonResponse([
        'success' => true,
        'message' => 'Berhasil upgrade ke ' . ucfirst($tier) . '!',
        'tier' => $tier
    ]);
} else {
    jsonResponse(['error' => 'Invalid action'], 400);
}
