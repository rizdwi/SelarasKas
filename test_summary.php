<?php
require 'api/config.php';
$_GET['month'] = '2026-06';
$userId = 4;
$db = getDB();
$month = $_GET['month'];

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

// Previous month comparison
$prevMonth = date('Y-m', strtotime($month . '-01 -1 month'));
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

// All-time balance
$stmt = $db->prepare("
    SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as balance
    FROM transactions WHERE user_id = ?
");
$stmt->execute([$userId]);
$balance = (float)$stmt->fetchColumn();

var_dump([
    'income' => $income,
    'expense' => $expense,
    'balance' => $balance,
    'prev_income' => $prevIncome,
    'prev_expense' => $prevExpense
]);
