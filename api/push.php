<?php
// ============================================
// SelarasKas — Push Notification API
// ============================================
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/WebPush.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'vapid_public_key':
        handleVapidPublicKey();
        break;
    case 'subscribe':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleSubscribe();
        break;
    case 'unsubscribe':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleUnsubscribe();
        break;
    case 'status':
        handleStatus();
        break;
    case 'test':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleTest();
        break;
    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}

// =========================================================
// Get or auto-generate VAPID public key (no auth required)
// =========================================================
function handleVapidPublicKey(): void
{
    $db = getDB();

    $stmt = $db->query("SELECT public_key FROM vapid_keys ORDER BY id DESC LIMIT 1");
    $row = $stmt->fetch();

    if ($row) {
        jsonResponse(['success' => true, 'publicKey' => $row['public_key']]);
    }

    // Auto-generate VAPID keys
    $keys = WebPush::generateVAPIDKeys();

    $stmt = $db->prepare("INSERT INTO vapid_keys (public_key, private_key) VALUES (?, ?)");
    $stmt->execute([$keys['publicKey'], $keys['privateKey']]);

    jsonResponse(['success' => true, 'publicKey' => $keys['publicKey']]);
}

// =========================================================
// Subscribe — save push subscription (upsert by endpoint)
// =========================================================
function handleSubscribe(): void
{
    $userId = requireAuth();
    $input = getInput();

    $endpoint   = trim($input['endpoint'] ?? '');
    $p256dh     = trim($input['keys']['p256dh'] ?? '');
    $auth       = trim($input['keys']['auth'] ?? '');
    $deviceInfo = trim($input['device_info'] ?? '');

    if (!$endpoint || !$p256dh || !$auth) {
        jsonResponse(['error' => 'Data subscription tidak lengkap (endpoint, p256dh, auth wajib)'], 400);
    }

    $db = getDB();

    // Upsert: if same endpoint exists, update user_id & keys
    $stmt = $db->prepare("
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, device_info)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            user_id = VALUES(user_id),
            p256dh = VALUES(p256dh),
            auth = VALUES(auth),
            device_info = VALUES(device_info)
    ");

    // The endpoint column needs a UNIQUE index for upsert — fallback to delete+insert
    try {
        // Try the upsert first (requires UNIQUE on endpoint)
        $stmt->execute([$userId, $endpoint, $p256dh, $auth, $deviceInfo]);
    } catch (\PDOException $e) {
        // Fallback: delete existing then insert
        $db->prepare("DELETE FROM push_subscriptions WHERE endpoint = ?")->execute([$endpoint]);
        $db->prepare("INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, device_info) VALUES (?, ?, ?, ?, ?)")
           ->execute([$userId, $endpoint, $p256dh, $auth, $deviceInfo]);
    }

    jsonResponse(['success' => true, 'message' => 'Subscription berhasil disimpan']);
}

// =========================================================
// Unsubscribe — remove subscription by endpoint
// =========================================================
function handleUnsubscribe(): void
{
    $userId = requireAuth();
    $input = getInput();
    $endpoint = trim($input['endpoint'] ?? '');

    if (!$endpoint) {
        jsonResponse(['error' => 'Endpoint wajib diisi'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?");
    $stmt->execute([$endpoint, $userId]);

    jsonResponse(['success' => true, 'message' => 'Subscription berhasil dihapus']);
}

// =========================================================
// Status — check if current user has active subscriptions
// =========================================================
function handleStatus(): void
{
    $userId = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT COUNT(*) FROM push_subscriptions WHERE user_id = ?");
    $stmt->execute([$userId]);
    $count = (int)$stmt->fetchColumn();

    jsonResponse([
        'success'    => true,
        'subscribed' => $count > 0,
        'count'      => $count,
    ]);
}

// =========================================================
// Test — send a test notification to all user's devices
// =========================================================
function handleTest(): void
{
    $userId = requireAuth();
    $db = getDB();

    // Get VAPID keys
    $vapid = $db->query("SELECT public_key, private_key FROM vapid_keys ORDER BY id DESC LIMIT 1")->fetch();
    if (!$vapid) {
        jsonResponse(['error' => 'VAPID keys belum digenerate. Panggil vapid_public_key terlebih dahulu.'], 500);
    }

    // Get user's subscriptions
    $stmt = $db->prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?");
    $stmt->execute([$userId]);
    $subscriptions = $stmt->fetchAll();

    if (empty($subscriptions)) {
        jsonResponse(['error' => 'Tidak ada subscription aktif. Aktifkan notifikasi terlebih dahulu.'], 404);
    }

    $payload = json_encode([
        'title' => '🔔 SelarasKas',
        'body'  => 'Notifikasi push berhasil! Kamu akan menerima notifikasi penting tentang keuanganmu.',
        'icon'  => '/icons/icon-192x192.png',
        'badge' => '/icons/icon-72x72.png',
        'data'  => ['url' => '/'],
    ]);

    $results = [];
    $sent = 0;
    $failed = 0;

    foreach ($subscriptions as $sub) {
        $subscription = [
            'endpoint' => $sub['endpoint'],
            'keys' => [
                'p256dh' => $sub['p256dh'],
                'auth'   => $sub['auth'],
            ],
        ];

        try {
            $result = WebPush::sendNotification(
                $subscription,
                $payload,
                $vapid['public_key'],
                $vapid['private_key']
            );

            if ($result['success']) {
                $sent++;
            } else {
                $failed++;
                // Remove stale subscriptions (410 Gone or 404 Not Found)
                if (in_array($result['statusCode'], [404, 410])) {
                    $db->prepare("DELETE FROM push_subscriptions WHERE endpoint = ?")
                       ->execute([$sub['endpoint']]);
                }
            }

            $results[] = $result;
        } catch (\Exception $e) {
            $failed++;
            $results[] = ['success' => false, 'reason' => $e->getMessage()];
        }
    }

    jsonResponse([
        'success' => true,
        'sent'    => $sent,
        'failed'  => $failed,
        'details' => $results,
    ]);
}
