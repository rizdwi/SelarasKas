<?php
// ============================================
// FinFlow — Categories API
// ============================================
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

requireAuth();

$db = getDB();
$type = $_GET['type'] ?? '';

// Get all categories with hierarchy
$sql = "SELECT id, name, type, parent_id, emoji, color, sort_order FROM categories WHERE user_id IS NULL";
$params = [];

if ($type && in_array($type, ['income', 'expense'])) {
    $sql .= " AND type = ?";
    $params[] = $type;
}

$sql .= " ORDER BY sort_order, name";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$all = $stmt->fetchAll();

// Build hierarchy
$parents = [];
$children = [];

foreach ($all as $cat) {
    if ($cat['parent_id'] === null) {
        $cat['children'] = [];
        $parents[$cat['id']] = $cat;
    } else {
        $children[] = $cat;
    }
}

foreach ($children as $child) {
    $pid = $child['parent_id'];
    if (isset($parents[$pid])) {
        $parents[$pid]['children'][] = $child;
    }
}

jsonResponse(['categories' => array_values($parents)]);
