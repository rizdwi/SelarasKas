<?php
// ============================================
// SelarasKas — Wallets API (Multiplayer)
// ============================================
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'list':
        handleListWallets();
        break;
    case 'create':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleCreateWallet();
        break;
    case 'switch':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleSwitchWallet();
        break;
    case 'invite':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleInviteMember();
        break;
    case 'remove_member':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleRemoveMember();
        break;
    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}

function handleListWallets() {
    $userId = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("
        SELECT w.id, w.name, w.type, w.owner_id, wm.role 
        FROM wallets w
        JOIN wallet_members wm ON w.id = wm.wallet_id
        WHERE wm.user_id = ?
        ORDER BY w.type ASC, w.id ASC
    ");
    $stmt->execute([$userId]);
    $wallets = $stmt->fetchAll();

    // Determine active wallet
    $activeWalletId = $_SESSION['active_wallet_id'] ?? null;
    if (!$activeWalletId && count($wallets) > 0) {
        $activeWalletId = $wallets[0]['id'];
        $_SESSION['active_wallet_id'] = $activeWalletId;
    }

    foreach ($wallets as &$w) {
        $w['is_active'] = ($w['id'] == $activeWalletId);
    }

    jsonResponse(['success' => true, 'wallets' => $wallets]);
}

function handleCreateWallet() {
    $userId = requireAuth();
    $input = getInput();
    $name = trim($input['name'] ?? '');

    if (!$name) {
        jsonResponse(['error' => 'Nama dompet wajib diisi'], 400);
    }

    $db = getDB();

    // Check tier
    $stmt = $db->prepare("SELECT subscription_tier FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    $tier = $user['subscription_tier'] ?? 'free';
    
    if ($tier === 'free') {
        jsonResponse(['error' => 'Akun Free tidak diizinkan membuat Dompet Bersama (Multiplayer). Silakan upgrade ke Pro/Premium.'], 403);
    } elseif ($tier === 'pro') {
        // Allow max 2 shared wallets for Pro users
        $stmtC = $db->prepare("SELECT COUNT(*) FROM wallets WHERE owner_id = ? AND type = 'shared'");
        $stmtC->execute([$userId]);
        $sharedCount = $stmtC->fetchColumn();
        if ($sharedCount >= 2) {
            jsonResponse(['error' => 'Akun Pro maksimal memiliki 2 dompet bersama. Upgrade ke Premium untuk membuat dompet bersama tanpa batas.'], 403);
        }
    }

    try {
        $db->beginTransaction();

        $stmt = $db->prepare("INSERT INTO wallets (name, owner_id, type) VALUES (?, ?, 'shared')");
        $stmt->execute([$name, $userId]);
        $walletId = $db->lastInsertId();

        $stmtM = $db->prepare("INSERT INTO wallet_members (wallet_id, user_id, role) VALUES (?, ?, 'owner')");
        $stmtM->execute([$walletId, $userId]);

        $db->commit();

        jsonResponse([
            'success' => true, 
            'message' => 'Dompet bersama berhasil dibuat',
            'wallet_id' => $walletId
        ]);
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(['error' => 'Gagal membuat dompet: ' . $e->getMessage()], 500);
    }
}

function handleSwitchWallet() {
    $userId = requireAuth();
    $input = getInput();
    $walletId = $input['wallet_id'] ?? null;

    if (!$walletId) {
        jsonResponse(['error' => 'Wallet ID diperlukan'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT role FROM wallet_members WHERE wallet_id = ? AND user_id = ?");
    $stmt->execute([$walletId, $userId]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => 'Anda tidak memiliki akses ke dompet ini'], 403);
    }

    $_SESSION['active_wallet_id'] = $walletId;
    jsonResponse(['success' => true, 'message' => 'Berhasil pindah dompet']);
}

function handleInviteMember() {
    $userId = requireAuth();
    $input = getInput();
    $walletId = $input['wallet_id'] ?? null;
    $email = trim($input['email'] ?? '');
    $role = $input['role'] ?? 'editor'; // editor or viewer

    if (!$walletId || !$email) {
        jsonResponse(['error' => 'Wallet ID dan Email wajib diisi'], 400);
    }

    $db = getDB();
    
    // Check if current user is owner
    $stmt = $db->prepare("SELECT role FROM wallet_members WHERE wallet_id = ? AND user_id = ?");
    $stmt->execute([$walletId, $userId]);
    $myRole = $stmt->fetchColumn();
    if ($myRole !== 'owner') {
        jsonResponse(['error' => 'Hanya owner yang dapat mengundang anggota'], 403);
    }

    // Check tier limits for collaboration
    $stmtTier = $db->prepare("SELECT subscription_tier FROM users WHERE id = ?");
    $stmtTier->execute([$userId]);
    $tier = $stmtTier->fetchColumn() ?: 'free';

    if ($tier === 'free') {
        jsonResponse(['error' => 'Fitur kolaborasi (multiplayer) eksklusif untuk Pro/Premium. Silakan upgrade.'], 403);
    } elseif ($tier === 'pro') {
        $stmtC = $db->prepare("SELECT COUNT(*) FROM wallet_members WHERE wallet_id = ?");
        $stmtC->execute([$walletId]);
        $memberCount = $stmtC->fetchColumn();
        if ($memberCount >= 5) {
            jsonResponse(['error' => 'Paket Pro maksimal memiliki 5 anggota per dompet bersama. Upgrade ke Premium untuk anggota tanpa batas.'], 403);
        }
    }

    // Check if user to invite exists
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $targetUser = $stmt->fetch();

    if (!$targetUser) {
        jsonResponse(['error' => 'Pengguna dengan email tersebut tidak ditemukan di sistem'], 404);
    }

    $targetUserId = $targetUser['id'];
    if ($targetUserId == $userId) {
        jsonResponse(['error' => 'Anda tidak dapat mengundang diri sendiri'], 400);
    }

    try {
        $stmtM = $db->prepare("INSERT INTO wallet_members (wallet_id, user_id, role) VALUES (?, ?, ?)");
        $stmtM->execute([$walletId, $targetUserId, $role]);
        jsonResponse(['success' => true, 'message' => 'Anggota berhasil ditambahkan']);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) { // Duplicate entry
            jsonResponse(['error' => 'Pengguna tersebut sudah menjadi anggota dompet ini'], 400);
        }
        jsonResponse(['error' => 'Gagal mengundang anggota'], 500);
    }
}

function handleRemoveMember() {
    $userId = requireAuth();
    $input = getInput();
    $walletId = $input['wallet_id'] ?? null;
    $targetUserId = $input['user_id'] ?? null;

    if (!$walletId || !$targetUserId) {
        jsonResponse(['error' => 'Wallet ID dan User ID wajib diisi'], 400);
    }

    $db = getDB();
    
    // Check if current user is owner
    $stmt = $db->prepare("SELECT role FROM wallet_members WHERE wallet_id = ? AND user_id = ?");
    $stmt->execute([$walletId, $userId]);
    $myRole = $stmt->fetchColumn();
    if ($myRole !== 'owner') {
        jsonResponse(['error' => 'Hanya owner yang dapat mengeluarkan anggota'], 403);
    }

    if ($targetUserId == $userId) {
        jsonResponse(['error' => 'Anda tidak dapat mengeluarkan diri sendiri'], 400);
    }

    $stmt = $db->prepare("DELETE FROM wallet_members WHERE wallet_id = ? AND user_id = ?");
    $stmt->execute([$walletId, $targetUserId]);
    
    jsonResponse(['success' => true, 'message' => 'Anggota berhasil dikeluarkan']);
}
