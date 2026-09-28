<?php
require_once 'config.php';

$userId = requireAuth();
$walletId = requireActiveWallet($userId);
$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDB();

try {
    if ($method === 'GET') {
        $month = $_GET['month'] ?? date('Y-m');
        // Get budgets for the month and calculate spending
        $stmt = $pdo->prepare("
            SELECT b.id, b.category_id, b.amount, c.name as category_name, c.emoji as category_emoji, c.color as category_color,
                   (SELECT COALESCE(SUM(t.amount), 0)
                    FROM transactions t
                    WHERE t.wallet_id = b.wallet_id 
                      AND (CASE WHEN EXTRACT(DAY FROM t.transaction_date) >= 25 THEN TO_CHAR(t.transaction_date + INTERVAL '1 month', 'YYYY-MM') ELSE TO_CHAR(t.transaction_date, 'YYYY-MM') END) = b.month
                      AND t.type = 'expense'
                      AND (t.category_id = b.category_id OR 
                           t.category_id IN (SELECT id FROM categories WHERE parent_id = b.category_id))
                   ) as spent
            FROM budgets b
            JOIN categories c ON b.category_id = c.id
            WHERE b.wallet_id = :walletId AND b.month = :month
            ORDER BY b.amount DESC
        ");
        $stmt->execute(['walletId' => $walletId, 'month' => $month]);
        $budgets = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Convert numeric strings
        $totalBudget = 0;
        $totalSpent = 0;
        foreach ($budgets as &$b) {
            $b['amount'] = (float)$b['amount'];
            $b['spent'] = (float)$b['spent'];
            $totalBudget += $b['amount'];
            $totalSpent += $b['spent'];
        }

        jsonResponse([
            'budgets' => $budgets,
            'total_budget' => $totalBudget,
            'total_spent' => $totalSpent
        ]);
    }

    if ($method === 'POST') {
        $input = getInput();
        if (!isset($input['category_id']) || !isset($input['amount']) || !isset($input['month'])) {
            throw new Exception("Kategori, jumlah, dan bulan wajib diisi");
        }

        // Get user's subscription tier
        $stmtTier = $pdo->prepare("SELECT subscription_tier FROM users WHERE id = ?");
        $stmtTier->execute([$userId]);
        $tier = $stmtTier->fetchColumn() ?: 'free';

        if ($tier === 'free') {
            // Count current budgets for this wallet and month (excluding target category if update)
            $stmtC = $pdo->prepare("SELECT COUNT(*) FROM budgets WHERE wallet_id = ? AND month = ? AND category_id != ?");
            $stmtC->execute([$walletId, $input['month'], $input['category_id']]);
            $count = $stmtC->fetchColumn();
            if ($count >= 1) {
                jsonResponse(['error' => 'Akun Free maksimal memiliki 1 anggaran bulanan. Upgrade untuk menambah lebih banyak.'], 403);
            }
        } elseif ($tier === 'pro') {
            // Count current budgets for this wallet and month (excluding target category if update)
            $stmtC = $pdo->prepare("SELECT COUNT(*) FROM budgets WHERE wallet_id = ? AND month = ? AND category_id != ?");
            $stmtC->execute([$walletId, $input['month'], $input['category_id']]);
            $count = $stmtC->fetchColumn();
            if ($count >= 3) {
                jsonResponse(['error' => 'Akun Pro maksimal memiliki 3 anggaran bulanan. Upgrade ke Premium untuk anggaran tanpa batas.'], 403);
            }
        }

        $stmt = $pdo->prepare("
            INSERT INTO budgets (user_id, wallet_id, category_id, amount, month)
            VALUES (:uid, :walletId, :cid, :amt, :month)
            ON CONFLICT (wallet_id, category_id, month) DO UPDATE SET amount = EXCLUDED.amount
        ");
        $stmt->execute([
            'uid' => $userId,
            'walletId' => $walletId,
            'cid' => $input['category_id'],
            'amt' => $input['amount'],
            'month' => $input['month']
        ]);

        jsonResponse(['success' => true, 'message' => 'Budget saved']);
    }

    if ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if (!$id) throw new Exception("ID required");

        $stmt = $pdo->prepare("DELETE FROM budgets WHERE id = ? AND wallet_id = ?");
        $stmt->execute([$id, $walletId]);
        jsonResponse(['success' => true]);
    }

} catch (Exception $e) {
    http_response_code(400);
    jsonResponse(['error' => $e->getMessage()]);
}
