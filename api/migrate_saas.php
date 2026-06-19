<?php
// ============================================
// FinFlow — SaaS Migration Script
// Run this ONCE to migrate db to SaaS structure
// ============================================

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = getDB();
    
    // 1. Add new columns to users
    try { $pdo->exec("ALTER TABLE `users` ADD COLUMN `role` ENUM('user', 'admin') DEFAULT 'user'"); } catch(Exception $e){}
    try { $pdo->exec("ALTER TABLE `users` ADD COLUMN `subscription_tier` ENUM('free', 'pro', 'family') DEFAULT 'free'"); } catch(Exception $e){}
    try { $pdo->exec("ALTER TABLE `users` ADD COLUMN `health_score` INT DEFAULT 100"); } catch(Exception $e){}
    try { $pdo->exec("ALTER TABLE `users` ADD COLUMN `gamification_points` INT DEFAULT 0"); } catch(Exception $e){}

    // 2. Create wallets table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `wallets` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(100) NOT NULL,
        `owner_id` INT NOT NULL,
        `type` ENUM('personal', 'shared') DEFAULT 'personal',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB");

    // 3. Create wallet_members table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `wallet_members` (
        `wallet_id` INT NOT NULL,
        `user_id` INT NOT NULL,
        `role` ENUM('owner', 'editor', 'viewer') DEFAULT 'editor',
        `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`wallet_id`, `user_id`),
        FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB");

    // 4. Create user_badges table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `user_badges` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NOT NULL,
        `badge_id` VARCHAR(50) NOT NULL,
        `earned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_badge` (`user_id`, `badge_id`),
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB");

    // 5. Create chat_history table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `chat_history` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NOT NULL,
        `sender` ENUM('user', 'ai') NOT NULL,
        `message` TEXT NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB");

    // 6. Add wallet_id to existing tables
    $tablesToAlter = ['transactions', 'categories', 'savings_goals', 'budgets'];
    foreach ($tablesToAlter as $table) {
        try {
            $pdo->exec("ALTER TABLE `$table` ADD COLUMN `wallet_id` INT NULL AFTER `id`");
        } catch (PDOException $e) { /* Column might exist */ }
    }

    // 7. Migrate existing data (Create a default Personal Wallet for every user)
    $stmt = $pdo->query("SELECT id, name FROM users");
    $users = $stmt->fetchAll();

    foreach ($users as $user) {
        $userId = $user['id'];
        
        // Check if user already has a personal wallet
        $stmtW = $pdo->prepare("SELECT id FROM wallets WHERE owner_id = ? AND type = 'personal'");
        $stmtW->execute([$userId]);
        $wallet = $stmtW->fetch();

        if (!$wallet) {
            // Create personal wallet
            $stmtInsertW = $pdo->prepare("INSERT INTO wallets (name, owner_id, type) VALUES (?, ?, 'personal')");
            $firstName = explode(' ', $user['name'])[0];
            $stmtInsertW->execute(["Dompet " . $firstName, $userId]);
            $walletId = $pdo->lastInsertId();

            // Add as owner member
            $stmtInsertM = $pdo->prepare("INSERT INTO wallet_members (wallet_id, user_id, role) VALUES (?, ?, 'owner')");
            $stmtInsertM->execute([$walletId, $userId]);
        } else {
            $walletId = $wallet['id'];
        }

        // Move their existing data to this wallet_id
        $pdo->exec("UPDATE transactions SET wallet_id = $walletId WHERE user_id = $userId AND wallet_id IS NULL");
        $pdo->exec("UPDATE categories SET wallet_id = $walletId WHERE user_id = $userId AND wallet_id IS NULL");
        $pdo->exec("UPDATE savings_goals SET wallet_id = $walletId WHERE user_id = $userId AND wallet_id IS NULL");
        $pdo->exec("UPDATE budgets SET wallet_id = $walletId WHERE user_id = $userId AND wallet_id IS NULL");
    }

    // 8. Add foreign key constraints for wallet_id safely
    foreach ($tablesToAlter as $table) {
        // Drop existing FK if any so we can re-add it cleanly
        try {
            $pdo->exec("ALTER TABLE `$table` DROP FOREIGN KEY `fk_{$table}_wallet`");
        } catch(Exception $e) {}
        
        try {
            $pdo->exec("ALTER TABLE `$table` ADD CONSTRAINT `fk_{$table}_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE CASCADE");
        } catch(PDOException $e) { /* Might exist or fail if orphaned records, but our migration above handles that */ }
    }

    // Also remove the unique budget constraint which relies on user_id, and replace it with wallet_id
    try {
        $pdo->exec("ALTER TABLE `budgets` DROP INDEX `unique_budget`");
        $pdo->exec("ALTER TABLE `budgets` ADD UNIQUE KEY `unique_budget` (`wallet_id`, `category_id`, `month`)");
    } catch(Exception $e) {}

    echo json_encode(['success' => true, 'message' => 'Migrasi SaaS Database berhasil!']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
