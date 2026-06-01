<?php
require 'api/config.php';
$db = getDB();
$db->beginTransaction();

try {
    // 1. Add transaction
    $stmt = $db->prepare("INSERT INTO transactions (user_id, category_id, amount, type, description, transaction_date) VALUES (6, 19, 500000.00, 'expense', 'Test June Expense', '2026-06-01')");
    $stmt->execute();
    $txId = $db->lastInsertId();
    echo "Added transaction: $txId\n";

    // 2. Run summary logic
    $month = '2026-06';
    $userId = 6;

    $stmt = $db->prepare("
        SELECT type, COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id = ? AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
        GROUP BY type
    ");
    $stmt->execute([$userId, $month]);
    $rows = $stmt->fetchAll();
    var_dump($rows);

    $income = 0;
    $expense = 0;
    foreach ($rows as $row) {
        if ($row['type'] === 'income') $income = (float)$row['total'];
        if ($row['type'] === 'expense') $expense = (float)$row['total'];
    }

    $prevMonth = '2026-05';
    $stmt = $db->prepare("
        SELECT type, COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id = ? AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
        GROUP BY type
    ");
    $stmt->execute([$userId, $prevMonth]);
    $prevRows = $stmt->fetchAll();

    $prevIncome = 0;
    $prevExpense = 0;
    foreach ($prevRows as $row) {
        if ($row['type'] === 'income') $prevIncome = (float)$row['total'];
        if ($row['type'] === 'expense') $prevExpense = (float)$row['total'];
    }

    $stmt = $db->prepare("
        SELECT
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as balance
        FROM transactions WHERE user_id = ?
    ");
    $stmt->execute([$userId]);
    $balance = (float)$stmt->fetchColumn();

    $summary = [
        'income' => $income,
        'expense' => $expense,
        'balance' => $balance,
        'net' => $income - $expense,
        'prev_income' => $prevIncome,
        'prev_expense' => $prevExpense,
        'income_change' => $prevIncome > 0 ? round(($income - $prevIncome) / $prevIncome * 100, 1) : ($income > 0 ? 100.0 : 0.0),
        'expense_change' => $prevExpense > 0 ? round(($expense - $prevExpense) / $prevExpense * 100, 1) : ($expense > 0 ? 100.0 : 0.0),
    ];
    echo json_encode($summary, JSON_PRETTY_PRINT) . "\n";

} finally {
    $db->rollBack();
    echo "Rolled back\n";
}
