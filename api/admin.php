<?php
// ============================================
// SelarasKas — Admin Dashboard API
// ============================================
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$userId = requireAuth();

// Simple auth check for admin. Let's assume user ID 1 is admin.
$db = getDB();
$stmt = $db->prepare("SELECT role FROM users WHERE id = ?");
$stmt->execute([$userId]);
$userRole = $stmt->fetchColumn();
if ($userRole !== 'admin') {
    jsonResponse(['error' => 'Akses ditolak'], 403);
}

$action = $_GET['action'] ?? 'stats';

if ($action === 'stats') {
    $db = getDB();
    
    // Total users
    $stmt = $db->prepare("SELECT COUNT(*) FROM users");
    $stmt->execute();
    $totalUsers = $stmt->fetchColumn();
    
    // Subscription tiers
    $stmt = $db->prepare("SELECT subscription_tier, COUNT(*) as count FROM users GROUP BY subscription_tier");
    $stmt->execute();
    $tiers = $stmt->fetchAll();
    
    // Total transactions
    $stmt = $db->prepare("SELECT COUNT(*) FROM transactions");
    $stmt->execute();
    $totalTx = $stmt->fetchColumn();
    
    // Total wallets
    $stmt = $db->prepare("SELECT COUNT(*) FROM wallets");
    $stmt->execute();
    $totalWallets = $stmt->fetchColumn();
    
    jsonResponse([
        'success' => true,
        'total_users' => $totalUsers,
        'tiers' => $tiers,
        'total_transactions' => $totalTx,
        'total_wallets' => $totalWallets
    ]);
} elseif ($action === 'users') {
    $db = getDB();
    $stmt = $db->prepare("SELECT id, name, email, subscription_tier, created_at FROM users ORDER BY created_at DESC LIMIT 50");
    $stmt->execute();
    $users = $stmt->fetchAll();
    
    jsonResponse(['success' => true, 'users' => $users]);
} else {
    jsonResponse(['error' => 'Invalid action'], 400);
}
