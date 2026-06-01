<?php
require_once 'config.php';

$userId = requireAuth();
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
                    WHERE t.user_id = b.user_id 
                      AND (CASE WHEN DAY(t.transaction_date) >= 25 THEN DATE_FORMAT(DATE_ADD(t.transaction_date, INTERVAL 1 MONTH), '%Y-%m') ELSE DATE_FORMAT(t.transaction_date, '%Y-%m') END) = b.month
                      AND t.type = 'expense'
                      AND (t.category_id = b.category_id OR 
                           t.category_id IN (SELECT id FROM categories WHERE parent_id = b.category_id))
                   ) as spent
            FROM budgets b
            JOIN categories c ON b.category_id = c.id
            WHERE b.user_id = :uid AND b.month = :month
            ORDER BY b.amount DESC
        ");
        $stmt->execute(['uid' => $userId, 'month' => $month]);
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

        $stmt = $pdo->prepare("
            INSERT INTO budgets (user_id, category_id, amount, month)
            VALUES (:uid, :cid, :amt, :month)
            ON DUPLICATE KEY UPDATE amount = VALUES(amount)
        ");
        $stmt->execute([
            'uid' => $userId,
            'cid' => $input['category_id'],
            'amt' => $input['amount'],
            'month' => $input['month']
        ]);

        jsonResponse(['success' => true, 'message' => 'Budget saved']);
    }

    if ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if (!$id) throw new Exception("ID required");

        $stmt = $pdo->prepare("DELETE FROM budgets WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        jsonResponse(['success' => true]);
    }

} catch (Exception $e) {
    http_response_code(400);
    jsonResponse(['error' => $e->getMessage()]);
}
