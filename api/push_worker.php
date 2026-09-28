<?php
// ============================================
// SelarasKas — Push Notification Cron Worker
// Usage CLI:  php push_worker.php --check-budget
//             php push_worker.php --daily-summary
//             php push_worker.php --weekly-summary
// Usage HTTP: push_worker.php?action=check-budget
//             push_worker.php?action=daily-summary
//             push_worker.php?action=weekly-summary
// ============================================

// Detect CLI vs HTTP
$isCLI = (php_sapi_name() === 'cli');

if (!$isCLI) {
    header('Content-Type: application/json; charset=utf-8');
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/WebPush.php';

// Parse action from CLI args or HTTP query
$action = '';
if ($isCLI) {
    $args = $argv ?? [];
    if (in_array('--check-budget', $args)) {
        $action = 'check-budget';
    } elseif (in_array('--daily-summary', $args)) {
        $action = 'daily-summary';
    } elseif (in_array('--weekly-summary', $args)) {
        $action = 'weekly-summary';
    }
} else {
    $action = $_GET['action'] ?? '';
}

if (!in_array($action, ['check-budget', 'daily-summary', 'weekly-summary'])) {
    $msg = 'Usage: --check-budget | --daily-summary | --weekly-summary (or ?action=...)';
    if ($isCLI) {
        echo $msg . "\n";
    } else {
        echo json_encode(['error' => $msg]);
    }
    exit(1);
}

try {
    $db = getDB();

    // Load VAPID keys
    $vapid = $db->query("SELECT public_key, private_key FROM vapid_keys ORDER BY id DESC LIMIT 1")->fetch();
    if (!$vapid) {
        output('ERROR: VAPID keys not generated yet. Visit push.php?action=vapid_public_key first.');
        exit(1);
    }

    switch ($action) {
        case 'check-budget':
            checkBudgetAlerts($db, $vapid);
            break;
        case 'daily-summary':
            sendDailySummary($db, $vapid);
            break;
        case 'weekly-summary':
            sendWeeklySummary($db, $vapid);
            break;
    }
} catch (\Exception $e) {
    output('FATAL: ' . $e->getMessage());
    exit(1);
}

// =========================================================
// Output helper (CLI print or JSON)
// =========================================================
function output(string $message): void
{
    global $isCLI;
    if ($isCLI) {
        echo $message . "\n";
    } else {
        echo json_encode(['message' => $message]) . "\n";
    }
}

// =========================================================
// Send push to a single user's subscriptions
// =========================================================
function sendPushToUser(PDO $db, array $vapid, int $userId, array $payload): int
{
    $stmt = $db->prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?");
    $stmt->execute([$userId]);
    $subs = $stmt->fetchAll();

    $sent = 0;
    $payloadJson = json_encode($payload);

    foreach ($subs as $sub) {
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
                $payloadJson,
                $vapid['public_key'],
                $vapid['private_key']
            );

            if ($result['success']) {
                $sent++;
            } else {
                // Remove stale subscriptions
                if (in_array($result['statusCode'], [404, 410])) {
                    $db->prepare("DELETE FROM push_subscriptions WHERE endpoint = ?")
                       ->execute([$sub['endpoint']]);
                }
            }
        } catch (\Exception $e) {
            // Log but continue
            output('  Push error for user ' . $userId . ': ' . $e->getMessage());
        }
    }

    return $sent;
}

// =========================================================
// Budget Alert Check (>= 80% threshold)
// =========================================================
function checkBudgetAlerts(PDO $db, array $vapid): void
{
    output('=== Budget Alert Check ===');
    $currentMonth = date('Y-m');

    // Ensure budget_notifications tracking table exists
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS budget_notifications (
            id SERIAL PRIMARY KEY,
            budget_id INT NOT NULL,
            threshold INT NOT NULL,
            month VARCHAR(7) NOT NULL,
            notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_notif (budget_id, threshold, month)
        ) ");
    } catch (\Exception $e) {
        // Table already exists
    }

    // Get all budgets for current month with their spent amounts
    $stmt = $db->prepare("
        SELECT 
            b.id AS budget_id,
            b.user_id,
            b.amount AS budget_amount,
            b.month,
            c.name AS category_name,
            COALESCE(SUM(t.amount), 0) AS spent
        FROM budgets b
        JOIN categories c ON b.category_id = c.id
        LEFT JOIN transactions t ON t.category_id = b.category_id 
            AND t.wallet_id IN (
                SELECT wm.wallet_id FROM wallet_members wm WHERE wm.user_id = b.user_id
            )
            AND t.type = 'expense'
            AND (CASE WHEN DAY(t.transaction_date) >= 25 
                 THEN TO_CHAR(DATE_ADD(t.transaction_date, INTERVAL 1 MONTH), 'YYYY-MM') 
                 ELSE TO_CHAR(t.transaction_date, 'YYYY-MM') END) = b.month
        WHERE b.month = ?
        GROUP BY b.id, b.user_id, b.amount, b.month, c.name
    ");
    $stmt->execute([$currentMonth]);
    $budgets = $stmt->fetchAll();

    $alertsSent = 0;

    foreach ($budgets as $budget) {
        $budgetAmount = (float)$budget['budget_amount'];
        if ($budgetAmount <= 0) continue;

        $spent = (float)$budget['spent'];
        $percent = round(($spent / $budgetAmount) * 100);

        // Determine threshold level
        $threshold = 0;
        if ($percent >= 100) {
            $threshold = 100;
        } elseif ($percent >= 90) {
            $threshold = 90;
        } elseif ($percent >= 80) {
            $threshold = 80;
        } else {
            continue; // Below 80%, skip
        }

        // Check if we already notified for this threshold
        $stmtCheck = $db->prepare("
            SELECT id FROM budget_notifications 
            WHERE budget_id = ? AND threshold = ? AND month = ?
        ");
        $stmtCheck->execute([$budget['budget_id'], $threshold, $currentMonth]);

        if ($stmtCheck->fetch()) {
            continue; // Already notified
        }

        // Send notification
        $emoji = $threshold >= 100 ? '🚨' : '⚠️';
        $formattedAmount = number_format($budgetAmount, 0, ',', '.');

        $payload = [
            'title' => $emoji . ' Peringatan Budget',
            'body'  => "Pengeluaran {$budget['category_name']} sudah {$percent}% dari budget Rp{$formattedAmount}!",
            'icon'  => '/icons/icon-192x192.png',
            'badge' => '/icons/icon-72x72.png',
            'data'  => ['url' => '/budgets'],
        ];

        $sent = sendPushToUser($db, $vapid, (int)$budget['user_id'], $payload);

        if ($sent > 0) {
            // Record notification to avoid spam
            try {
                $db->prepare("INSERT INTO budget_notifications (budget_id, threshold, month) VALUES (?, ?, ?)")
                   ->execute([$budget['budget_id'], $threshold, $currentMonth]);
            } catch (\Exception $e) {
                // Duplicate, ignore
            }
            $alertsSent++;
            output("  Alert sent: {$budget['category_name']} at {$percent}% for user {$budget['user_id']}");
        }
    }

    output("Budget alerts sent: {$alertsSent}");
}

// =========================================================
// Daily Summary
// =========================================================
function sendDailySummary(PDO $db, array $vapid): void
{
    output('=== Daily Summary ===');
    $today = date('Y-m-d');

    // Get all users who have push subscriptions
    $users = $db->query("SELECT DISTINCT user_id FROM push_subscriptions")->fetchAll();

    $sent = 0;
    foreach ($users as $userRow) {
        $userId = (int)$userRow['user_id'];

        // Get today's totals across all wallets the user belongs to
        $stmt = $db->prepare("
            SELECT 
                COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS income,
                COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS expense
            FROM transactions t
            JOIN wallet_members wm ON t.wallet_id = wm.wallet_id
            WHERE wm.user_id = ? AND t.transaction_date = ?
        ");
        $stmt->execute([$userId, $today]);
        $totals = $stmt->fetch();

        $income  = (float)($totals['income'] ?? 0);
        $expense = (float)($totals['expense'] ?? 0);

        // Get overall balance
        $stmtBal = $db->prepare("
            SELECT 
                COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS balance
            FROM transactions t
            JOIN wallet_members wm ON t.wallet_id = wm.wallet_id
            WHERE wm.user_id = ?
        ");
        $stmtBal->execute([$userId]);
        $balance = (float)$stmtBal->fetchColumn();

        $fmtIncome  = number_format($income, 0, ',', '.');
        $fmtExpense = number_format($expense, 0, ',', '.');
        $fmtBalance = number_format($balance, 0, ',', '.');

        $payload = [
            'title' => '📊 Ringkasan Hari Ini',
            'body'  => "Hari ini: +Rp{$fmtIncome} / -Rp{$fmtExpense}. Saldo: Rp{$fmtBalance}",
            'icon'  => '/icons/icon-192x192.png',
            'badge' => '/icons/icon-72x72.png',
            'data'  => ['url' => '/'],
        ];

        $count = sendPushToUser($db, $vapid, $userId, $payload);
        if ($count > 0) $sent++;
    }

    output("Daily summaries sent to {$sent} users");
}

// =========================================================
// Weekly Summary
// =========================================================
function sendWeeklySummary(PDO $db, array $vapid): void
{
    output('=== Weekly Summary ===');

    // Week boundaries (Monday to Sunday)
    $weekStart = date('Y-m-d', strtotime('monday this week'));
    $weekEnd   = date('Y-m-d', strtotime('sunday this week'));

    // Get all users who have push subscriptions
    $users = $db->query("SELECT DISTINCT user_id FROM push_subscriptions")->fetchAll();

    $sent = 0;
    foreach ($users as $userRow) {
        $userId = (int)$userRow['user_id'];

        // Get this week's totals
        $stmt = $db->prepare("
            SELECT 
                COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS income,
                COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS expense,
                COUNT(*) AS tx_count
            FROM transactions t
            JOIN wallet_members wm ON t.wallet_id = wm.wallet_id
            WHERE wm.user_id = ? 
              AND t.transaction_date BETWEEN ? AND ?
        ");
        $stmt->execute([$userId, $weekStart, $weekEnd]);
        $totals = $stmt->fetch();

        $income  = (float)($totals['income'] ?? 0);
        $expense = (float)($totals['expense'] ?? 0);
        $txCount = (int)($totals['tx_count'] ?? 0);
        $net     = $income - $expense;

        $fmtIncome  = number_format($income, 0, ',', '.');
        $fmtExpense = number_format($expense, 0, ',', '.');
        $fmtNet     = number_format(abs($net), 0, ',', '.');
        $netSign    = $net >= 0 ? '+' : '-';

        $payload = [
            'title' => '📈 Ringkasan Mingguan',
            'body'  => "Minggu ini ({$txCount} transaksi): +Rp{$fmtIncome} / -Rp{$fmtExpense}. Nett: {$netSign}Rp{$fmtNet}",
            'icon'  => '/icons/icon-192x192.png',
            'badge' => '/icons/icon-72x72.png',
            'data'  => ['url' => '/'],
        ];

        $count = sendPushToUser($db, $vapid, $userId, $payload);
        if ($count > 0) $sent++;
    }

    output("Weekly summaries sent to {$sent} users");
}
