<?php
// ============================================
// FinFlow — User Profile API
// ============================================
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$userId = requireAuth();

switch ($method) {
    case 'GET':
        getUser($userId);
        break;
    case 'PUT':
        updateUser($userId);
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function getUser($userId) {
    $db = getDB();
    $stmt = $db->prepare("SELECT id, name, email, avatar_initial, theme, created_at FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) jsonResponse(['error' => 'User not found'], 404);

    jsonResponse(['user' => $user]);
}

function updateUser($userId) {
    $input = getInput();
    $db = getDB();

    // Get current user
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) jsonResponse(['error' => 'User not found'], 404);

    $name = trim($input['name'] ?? $user['name']);
    $theme = $input['theme'] ?? $user['theme'];

    if (!in_array($theme, ['dark', 'light'])) $theme = 'dark';

    $initial = strtoupper(mb_substr($name, 0, 1));

    $stmt = $db->prepare("UPDATE users SET name=?, avatar_initial=?, theme=? WHERE id=?");
    $stmt->execute([$name, $initial, $theme, $userId]);

    // Update session
    jsonResponse([
        'success' => true,
        'user' => [
            'id' => (int)$userId,
            'name' => $name,
            'email' => $user['email'],
            'avatar_initial' => $initial,
            'theme' => $theme,
        ]
    ]);
}
