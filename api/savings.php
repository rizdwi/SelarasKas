<?php
// ============================================
// FinFlow — Savings Goals API
// ============================================
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$userId = requireAuth();

switch ($method) {
    case 'GET':
        getSavings($userId);
        break;
    case 'POST':
        createSaving($userId);
        break;
    case 'PUT':
        updateSaving($userId);
        break;
    case 'DELETE':
        deleteSaving($userId);
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function getSavings($userId) {
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$userId]);
    $goals = $stmt->fetchAll();

    // Calculate total saved
    $totalSaved = array_reduce($goals, function($sum, $g) { return $sum + (float)$g['current_amount']; }, 0);
    $totalTarget = array_reduce($goals, function($sum, $g) { return $sum + (float)$g['target_amount']; }, 0);

    jsonResponse([
        'goals' => $goals,
        'total_saved' => $totalSaved,
        'total_target' => $totalTarget,
    ]);
}

function createSaving($userId) {
    $input = getInput();
    $title = trim($input['title'] ?? '');
    $emoji = $input['emoji'] ?? '🎯';
    $target = (float)($input['target_amount'] ?? 0);
    $current = (float)($input['current_amount'] ?? 0);
    $deadline = $input['deadline'] ?? null;
    $color = $input['color'] ?? '#818cf8';

    if (!$title || $target <= 0) {
        jsonResponse(['error' => 'Judul dan target wajib diisi'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("
        INSERT INTO savings_goals (user_id, title, emoji, target_amount, current_amount, deadline, color)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$userId, $title, $emoji, $target, $current, $deadline, $color]);

    jsonResponse(['success' => true, 'id' => (int)$db->lastInsertId()], 201);
}

function updateSaving($userId) {
    $input = getInput();
    $id = (int)($input['id'] ?? 0);

    if (!$id) jsonResponse(['error' => 'ID required'], 400);

    $db = getDB();

    // Check ownership
    $stmt = $db->prepare("SELECT * FROM savings_goals WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $userId]);
    $goal = $stmt->fetch();

    if (!$goal) jsonResponse(['error' => 'Goal not found'], 404);

    // Update fields
    $title = trim($input['title'] ?? $goal['title']);
    $emoji = $input['emoji'] ?? $goal['emoji'];
    $target = (float)($input['target_amount'] ?? $goal['target_amount']);
    $current = (float)($input['current_amount'] ?? $goal['current_amount']);
    $deadline = $input['deadline'] ?? $goal['deadline'];
    $color = $input['color'] ?? $goal['color'];

    // If adding amount (increment mode)
    if (isset($input['add_amount'])) {
        $current = (float)$goal['current_amount'] + (float)$input['add_amount'];
    }

    $stmt = $db->prepare("
        UPDATE savings_goals SET title=?, emoji=?, target_amount=?, current_amount=?, deadline=?, color=?
        WHERE id=? AND user_id=?
    ");
    $stmt->execute([$title, $emoji, $target, $current, $deadline, $color, $id, $userId]);

    jsonResponse(['success' => true]);
}

function deleteSaving($userId) {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'ID required'], 400);

    $db = getDB();
    $stmt = $db->prepare("DELETE FROM savings_goals WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $userId]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Goal not found'], 404);
    }

    jsonResponse(['success' => true]);
}
