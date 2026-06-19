<?php
// ============================================
// SelarasKas — Gamification API
// ============================================
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

// Exportable functions for internal use
function addGamificationPoints($userId, $action) {
    $db = getDB();
    $points = 0;
    
    switch ($action) {
        case 'add_income': $points = 10; break;
        case 'add_saving': $points = 20; break;
        case 'add_budget': $points = 15; break;
        case 'daily_login': $points = 5; break;
    }

    if ($points > 0) {
        $stmt = $db->prepare("UPDATE users SET gamification_points = gamification_points + ? WHERE id = ?");
        $stmt->execute([$points, $userId]);
        
        checkBadges($userId);
    }
}

function checkBadges($userId) {
    $db = getDB();
    $stmt = $db->prepare("SELECT gamification_points FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $pts = $stmt->fetchColumn();

    $newBadge = null;
    if ($pts >= 100 && $pts < 200) {
        $newBadge = ['badge_id' => 'novice_saver', 'name' => 'Novice Saver', 'icon' => '🌱'];
    } elseif ($pts >= 500) {
        $newBadge = ['badge_id' => 'master_saver', 'name' => 'Master Saver', 'icon' => '🌳'];
    }

    if ($newBadge) {
        // Check if already has badge
        $stmt = $db->prepare("SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?");
        $stmt->execute([$userId, $newBadge['badge_id']]);
        if (!$stmt->fetch()) {
            $stmtI = $db->prepare("INSERT INTO user_badges (user_id, badge_id, badge_name, badge_icon) VALUES (?, ?, ?, ?)");
            $stmtI->execute([$userId, $newBadge['badge_id'], $newBadge['name'], $newBadge['icon']]);
        }
    }
}

function calculateHealthScore($userId, $walletId) {
    $db = getDB();
    $month = date('Y-m');
    
    // Get income vs expense
    $stmt = $db->prepare("
        SELECT type, COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE wallet_id = ? AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
        GROUP BY type
    ");
    $stmt->execute([$walletId, $month]);
    $rows = $stmt->fetchAll();
    
    $income = 0; $expense = 0;
    foreach ($rows as $r) {
        if ($r['type'] === 'income') $income = $r['total'];
        if ($r['type'] === 'expense') $expense = $r['total'];
    }
    
    $score = 50; // Base score
    if ($income > 0) {
        $ratio = $expense / $income;
        if ($ratio < 0.5) $score += 40;
        elseif ($ratio < 0.8) $score += 20;
        elseif ($ratio > 1) $score -= 30;
    } else if ($expense > 0) {
        $score -= 20;
    }
    
    // Add points for savings
    $stmt2 = $db->prepare("SELECT COUNT(*) FROM savings_goals WHERE wallet_id = ? AND current_amount > 0");
    $stmt2->execute([$walletId]);
    if ($stmt2->fetchColumn() > 0) {
        $score += 10;
    }

    // Clamp 0 - 100
    $score = max(0, min(100, $score));
    
    // Update user record
    $stmtU = $db->prepare("UPDATE users SET health_score = ? WHERE id = ?");
    $stmtU->execute([$score, $userId]);
    
    return $score;
}

// REST API Handling
if (basename($_SERVER['PHP_SELF']) === 'gamification.php') {
    $userId = requireAuth();
    $walletId = requireActiveWallet($userId);
    
    $action = $_GET['action'] ?? 'status';

    if ($action === 'status') {
        $db = getDB();
        $stmt = $db->prepare("SELECT gamification_points, health_score FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        $healthScore = calculateHealthScore($userId, $walletId);

        $stmtB = $db->prepare("SELECT * FROM user_badges WHERE user_id = ?");
        $stmtB->execute([$userId]);
        $badges = $stmtB->fetchAll();

        jsonResponse([
            'success' => true,
            'points' => (int)$user['gamification_points'],
            'health_score' => $healthScore,
            'badges' => $badges
        ]);
    } else {
        jsonResponse(['error' => 'Invalid action'], 400);
    }
}
