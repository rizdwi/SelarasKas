<?php
// ============================================
// FinFlow — Transactions API
// ============================================
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$userId = requireAuth();

switch ($method) {
    case 'GET':
        if ($action === 'summary') {
            getSummary($userId);
        } elseif ($action === 'chart') {
            getChartData($userId);
        } elseif ($action === 'dashboard') {
            getDashboardData($userId);
        } elseif ($action === 'weekly') {
            getWeeklyData($userId);
        } elseif ($action === 'cashflow') {
            getCashflowData($userId);
        } elseif ($action === 'comparison') {
            getComparisonData($userId);
        } elseif ($action === 'trends') {
            getTrendsData($userId);
        } else {
            getTransactions($userId);
        }
        break;
    case 'POST':
        createTransaction($userId);
        break;
    case 'DELETE':
        deleteTransaction($userId);
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function getTransactions($userId) {
    $db = getDB();
    $month = $_GET['month'] ?? date('Y-m');
    $type = $_GET['type'] ?? '';
    $limit = (int)($_GET['limit'] ?? 50);

    $sql = "SELECT t.*, c.name as category_name, c.emoji, c.color,
                   pc.name as parent_category_name, pc.emoji as parent_emoji
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            LEFT JOIN categories pc ON c.parent_id = pc.id
            WHERE t.user_id = ?
            AND (CASE WHEN DAY(t.transaction_date) >= 25 THEN DATE_FORMAT(DATE_ADD(t.transaction_date, INTERVAL 1 MONTH), '%Y-%m') ELSE DATE_FORMAT(t.transaction_date, '%Y-%m') END) = ?";
    $params = [$userId, $month];

    if ($type && in_array($type, ['income', 'expense'])) {
        $sql .= " AND t.type = ?";
        $params[] = $type;
    }

    $sql .= " ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT " . $limit;

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $transactions = $stmt->fetchAll();

    jsonResponse(['transactions' => $transactions]);
}

function getSummary($userId) {
    $db = getDB();
    $month = $_GET['month'] ?? date('Y-m');

    // Total income & expense for the month
    $stmt = $db->prepare("
        SELECT type, COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id = ? AND (CASE WHEN DAY(transaction_date) >= 25 THEN DATE_FORMAT(DATE_ADD(transaction_date, INTERVAL 1 MONTH), '%Y-%m') ELSE DATE_FORMAT(transaction_date, '%Y-%m') END) = ?
        GROUP BY type
    ");
    $stmt->execute([$userId, $month]);
    $rows = $stmt->fetchAll();

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
        WHERE user_id = ? AND (CASE WHEN DAY(transaction_date) >= 25 THEN DATE_FORMAT(DATE_ADD(transaction_date, INTERVAL 1 MONTH), '%Y-%m') ELSE DATE_FORMAT(transaction_date, '%Y-%m') END) = ?
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

    jsonResponse([
        'income' => $income,
        'expense' => $expense,
        'balance' => $balance,
        'net' => $income - $expense,
        'prev_income' => $prevIncome,
        'prev_expense' => $prevExpense,
        'income_change' => $prevIncome > 0 ? round(($income - $prevIncome) / $prevIncome * 100, 1) : ($income > 0 ? 100.0 : 0.0),
        'expense_change' => $prevExpense > 0 ? round(($expense - $prevExpense) / $prevExpense * 100, 1) : ($expense > 0 ? 100.0 : 0.0),
    ]);
}

function getChartData($userId) {
    $db = getDB();
    $month = $_GET['month'] ?? date('Y-m');

    // Spending by specific category (instead of grouping by parent)
    $stmt = $db->prepare("
        SELECT
            c.id as cat_id,
            c.name as category_name,
            c.emoji as emoji,
            c.color as color,
            SUM(t.amount) as total
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ? AND t.type = 'expense'
        AND (CASE WHEN DAY(t.transaction_date) >= 25 THEN DATE_FORMAT(DATE_ADD(t.transaction_date, INTERVAL 1 MONTH), '%Y-%m') ELSE DATE_FORMAT(t.transaction_date, '%Y-%m') END) = ?
        GROUP BY c.id, c.name, c.emoji, c.color
        ORDER BY total DESC
    ");
    $stmt->execute([$userId, $month]);
    $data = $stmt->fetchAll();

    jsonResponse(['chart' => $data]);
}

function getWeeklyData($userId) {
    $db = getDB();
    $month = $_GET['month'] ?? date('Y-m');

    // Get daily data for the current month
    $stmt = $db->prepare("
        SELECT
            DATE_FORMAT(transaction_date, '%Y-%m-%d') as date,
            DAYNAME(transaction_date) as day_name,
            type,
            SUM(amount) as total
        FROM transactions
        WHERE user_id = ? AND (CASE WHEN DAY(transaction_date) >= 25 THEN DATE_FORMAT(DATE_ADD(transaction_date, INTERVAL 1 MONTH), '%Y-%m') ELSE DATE_FORMAT(transaction_date, '%Y-%m') END) = ?
        GROUP BY date, day_name, type
        ORDER BY date
    ");
    $stmt->execute([$userId, $month]);
    $rows = $stmt->fetchAll();

    // Group by date
    $daily = [];
    foreach ($rows as $row) {
        $date = $row['date'];
        if (!isset($daily[$date])) {
            $daily[$date] = ['date' => $date, 'day' => substr($row['day_name'], 0, 3), 'income' => 0, 'expense' => 0];
        }
        $daily[$date][$row['type']] = (float)$row['total'];
    }

    jsonResponse(['weekly' => array_values($daily)]);
}

function createTransaction($userId) {
    $input = getInput();
    $categoryId = (int)($input['category_id'] ?? 0);
    $amount = (float)($input['amount'] ?? 0);
    $type = $input['type'] ?? '';
    $description = trim($input['description'] ?? '');
    $date = !empty($input['transaction_date']) ? $input['transaction_date'] : date('Y-m-d');

    if (!$categoryId || $amount <= 0 || !in_array($type, ['income', 'expense'])) {
        jsonResponse(['error' => 'Data tidak lengkap. Kategori, jumlah, dan tipe wajib diisi.'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("
        INSERT INTO transactions (user_id, category_id, amount, type, description, transaction_date)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$userId, $categoryId, $amount, $type, $description, $date]);

    jsonResponse(['success' => true, 'id' => (int)$db->lastInsertId()], 201);
}

function deleteTransaction($userId) {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'ID required'], 400);

    $db = getDB();
    $stmt = $db->prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $userId]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Transaction not found'], 404);
    }

    jsonResponse(['success' => true]);
}

function getCashflowData($userId) {
    $db = getDB();
    $month = $_GET['month'] ?? date('Y-m');

    $stmt = $db->prepare("
        SELECT
            DATE_FORMAT(transaction_date, '%Y-%m-%d') as date,
            type,
            SUM(amount) as total
        FROM transactions
        WHERE user_id = ? AND (CASE WHEN DAY(transaction_date) >= 25 THEN DATE_FORMAT(DATE_ADD(transaction_date, INTERVAL 1 MONTH), '%Y-%m') ELSE DATE_FORMAT(transaction_date, '%Y-%m') END) = ?
        GROUP BY date, type
        ORDER BY date
    ");
    $stmt->execute([$userId, $month]);
    $rows = $stmt->fetchAll();

    $daily = [];
    foreach ($rows as $row) {
        $date = $row['date'];
        if (!isset($daily[$date])) {
            $daily[$date] = ['date' => $date, 'income' => 0, 'expense' => 0];
        }
        $daily[$date][$row['type']] = (float)$row['total'];
    }

    jsonResponse(['cashflow' => array_values($daily)]);
}

function getComparisonData($userId) {
    $db = getDB();
    $month = $_GET['month'] ?? date('Y-m');
    $prevMonth = date('Y-m', strtotime($month . '-01 -1 month'));

    $stmt = $db->prepare("
        SELECT (CASE WHEN DAY(transaction_date) >= 25 THEN DATE_FORMAT(DATE_ADD(transaction_date, INTERVAL 1 MONTH), '%Y-%m') ELSE DATE_FORMAT(transaction_date, '%Y-%m') END) as m, type, COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id = ? AND (CASE WHEN DAY(transaction_date) >= 25 THEN DATE_FORMAT(DATE_ADD(transaction_date, INTERVAL 1 MONTH), '%Y-%m') ELSE DATE_FORMAT(transaction_date, '%Y-%m') END) IN (?, ?)
        GROUP BY m, type
    ");
    $stmt->execute([$userId, $month, $prevMonth]);
    $rows = $stmt->fetchAll();

    $res = [
        'current_income' => 0, 'current_expense' => 0,
        'prev_income' => 0, 'prev_expense' => 0
    ];

    foreach ($rows as $row) {
        $isCurr = $row['m'] === $month;
        if ($row['type'] === 'income') {
            $isCurr ? $res['current_income'] = (float)$row['total'] : $res['prev_income'] = (float)$row['total'];
        } else {
            $isCurr ? $res['current_expense'] = (float)$row['total'] : $res['prev_expense'] = (float)$row['total'];
        }
    }

    jsonResponse($res);
}

function getTrendsData($userId) {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT (CASE WHEN DAY(transaction_date) >= 25 THEN DATE_FORMAT(DATE_ADD(transaction_date, INTERVAL 1 MONTH), '%Y-%m') ELSE DATE_FORMAT(transaction_date, '%Y-%m') END) as month, SUM(amount) as expense
        FROM transactions
        WHERE user_id = ? AND type = 'expense'
        GROUP BY month
        ORDER BY month DESC
        LIMIT 6
    ");
    $stmt->execute([$userId]);
    $rows = array_reverse($stmt->fetchAll());
    
    foreach ($rows as &$r) $r['expense'] = (float)$r['expense'];

    jsonResponse(['trends' => $rows]);
}

function getDashboardData($userId) {
    $db = getDB();
    $month = $_GET['month'] ?? date('Y-m');
    $limit = (int)($_GET['limit'] ?? 20);

    // 1. Get Summary (Income & Expense)
    $stmt = $db->prepare("
        SELECT type, COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id = ? AND (CASE WHEN DAY(transaction_date) >= 25 THEN DATE_FORMAT(DATE_ADD(transaction_date, INTERVAL 1 MONTH), '%Y-%m') ELSE DATE_FORMAT(transaction_date, '%Y-%m') END) = ?
        GROUP BY type
    ");
    $stmt->execute([$userId, $month]);
    $summaryRows = $stmt->fetchAll();
    
    $income = 0;
    $expense = 0;
    foreach ($summaryRows as $row) {
        if ($row['type'] === 'income') $income = (float)$row['total'];
        if ($row['type'] === 'expense') $expense = (float)$row['total'];
    }

    // Get last month summary for change calculation
    $lastMonth = date('Y-m', strtotime($month . '-01 -1 month'));
    $stmt = $db->prepare("
        SELECT type, COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id = ? AND (CASE WHEN DAY(transaction_date) >= 25 THEN DATE_FORMAT(DATE_ADD(transaction_date, INTERVAL 1 MONTH), '%Y-%m') ELSE DATE_FORMAT(transaction_date, '%Y-%m') END) = ?
        GROUP BY type
    ");
    $stmt->execute([$userId, $lastMonth]);
    $lastRows = $stmt->fetchAll();
    
    $lastIncome = 0;
    $lastExpense = 0;
    foreach ($lastRows as $row) {
        if ($row['type'] === 'income') $lastIncome = (float)$row['total'];
        if ($row['type'] === 'expense') $lastExpense = (float)$row['total'];
    }

    // 2. Get Chart Data
    $stmt = $db->prepare("
        SELECT c.name as category_name, COALESCE(SUM(t.amount), 0) as total, c.color, c.emoji
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ? 
        AND t.type = 'expense'
        AND (CASE WHEN DAY(t.transaction_date) >= 25 THEN DATE_FORMAT(DATE_ADD(t.transaction_date, INTERVAL 1 MONTH), '%Y-%m') ELSE DATE_FORMAT(t.transaction_date, '%Y-%m') END) = ?
        GROUP BY c.id, c.name, c.color, c.emoji
        ORDER BY total DESC
    ");
    $stmt->execute([$userId, $month]);
    $chartRows = $stmt->fetchAll();
    foreach ($chartRows as &$r) {
        $r['total'] = (float)$r['total'];
    }

    // 3. Get Transactions List
    $sql = "SELECT t.*, c.name as category_name, c.emoji, c.color,
                   pc.name as parent_category_name, pc.emoji as parent_emoji
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            LEFT JOIN categories pc ON c.parent_id = pc.id
            WHERE t.user_id = ?
            AND (CASE WHEN DAY(t.transaction_date) >= 25 THEN DATE_FORMAT(DATE_ADD(t.transaction_date, INTERVAL 1 MONTH), '%Y-%m') ELSE DATE_FORMAT(t.transaction_date, '%Y-%m') END) = ?
            ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT " . $limit;
    $stmt = $db->prepare($sql);
    $stmt->execute([$userId, $month]);
    $transactions = $stmt->fetchAll();
    foreach ($transactions as &$t) {
        $t['amount'] = (float)$t['amount'];
    }

    jsonResponse([
        'summary' => [
            'income' => $income,
            'expense' => $expense,
            'balance' => $income - $expense,
            'last_income' => $lastIncome,
            'last_expense' => $lastExpense
        ],
        'chart' => $chartRows,
        'transactions' => $transactions
    ]);
}
