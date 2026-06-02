<?php
// ============================================
// FinFlow — Database Initialization & Seeder
// Run this ONCE to set up the database
// ============================================

header('Content-Type: application/json; charset=utf-8');

$host = getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? 'localhost');
$port = getenv('DB_PORT') ?: ($_ENV['DB_PORT'] ?? '3306');
$user = getenv('DB_USER') ?: ($_ENV['DB_USER'] ?? 'root');
$pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : ($_ENV['DB_PASS'] ?? '');
$dbname = getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? 'finflow_db');

try {
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ];

    // Enable SSL for cloud databases (like TiDB Serverless)
    if (defined('PDO::MYSQL_ATTR_SSL_CA') && $host !== 'localhost' && $host !== '127.0.0.1') {
        $options[PDO::MYSQL_ATTR_SSL_CA] = true;
        if (defined('PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT')) {
            $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
        }
    }

    // Connect directly to the database if it is a cloud service where DB is pre-created
    try {
        $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4", $user, $pass, $options);
        echo json_encode(['step' => 'Connected to existing database']) . "\n";
    } catch (PDOException $e) {
        // Fallback: connect to host and try creating database (for local localhost/development)
        $pdo = new PDO("mysql:host=$host;port=$port;charset=utf8mb4", $user, $pass, $options);
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE `$dbname`");
        echo json_encode(['step' => 'Database created and selected']) . "\n";
    }

    // ===== CREATE TABLES =====

    // Users
    $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(100) NOT NULL,
        `email` VARCHAR(150) UNIQUE NOT NULL,
        `password` VARCHAR(255) NOT NULL,
        `avatar_initial` CHAR(2),
        `avatar_url` MEDIUMTEXT DEFAULT NULL,
        `google_id` VARCHAR(100) DEFAULT NULL,
        `facebook_id` VARCHAR(100) DEFAULT NULL,
        `email_verified` TINYINT(1) DEFAULT 0,
        `verification_code` VARCHAR(6) DEFAULT NULL,
        `verification_expires` TIMESTAMP NULL DEFAULT NULL,
        `theme` VARCHAR(5) DEFAULT 'dark',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB");

    // Alter if table exists to add columns safely (for updates)
    try {
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `google_id` VARCHAR(100) DEFAULT NULL, ADD COLUMN `facebook_id` VARCHAR(100) DEFAULT NULL");
    } catch(PDOException $e) { /* Ignore if already exists */ }

    // Modify avatar_url to MEDIUMTEXT if table already exists (supporting Base64 avatars)
    try {
        $pdo->exec("ALTER TABLE `users` MODIFY COLUMN `avatar_url` MEDIUMTEXT DEFAULT NULL");
    } catch(PDOException $e) { /* Ignore */ }

    // Add email verification columns (migration for existing databases)
    try {
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `email_verified` TINYINT(1) DEFAULT 0");
    } catch(PDOException $e) { /* Ignore if already exists */ }
    try {
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `verification_code` VARCHAR(6) DEFAULT NULL");
    } catch(PDOException $e) { /* Ignore if already exists */ }
    try {
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `verification_expires` TIMESTAMP NULL DEFAULT NULL");
    } catch(PDOException $e) { /* Ignore if already exists */ }

    echo json_encode(['step' => 'Table users created']) . "\n";

    // Categories
    $pdo->exec("CREATE TABLE IF NOT EXISTS `categories` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT DEFAULT NULL,
        `name` VARCHAR(100) NOT NULL,
        `type` ENUM('income','expense') NOT NULL,
        `parent_id` INT DEFAULT NULL,
        `emoji` VARCHAR(50),
        `color` VARCHAR(7),
        `sort_order` INT DEFAULT 0,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB");

    echo json_encode(['step' => 'Table categories created']) . "\n";

    // Transactions
    $pdo->exec("CREATE TABLE IF NOT EXISTS `transactions` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NOT NULL,
        `category_id` INT NOT NULL,
        `amount` DECIMAL(15,2) NOT NULL,
        `type` ENUM('income','expense') NOT NULL,
        `description` VARCHAR(255),
        `transaction_date` DATE NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
    ) ENGINE=InnoDB");

    echo json_encode(['step' => 'Table transactions created']) . "\n";

    // Savings Goals
    $pdo->exec("CREATE TABLE IF NOT EXISTS `savings_goals` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NOT NULL,
        `title` VARCHAR(100) NOT NULL,
        `emoji` VARCHAR(50) DEFAULT '🎯',
        `target_amount` DECIMAL(15,2) NOT NULL,
        `current_amount` DECIMAL(15,2) DEFAULT 0,
        `deadline` DATE DEFAULT NULL,
        `color` VARCHAR(7) DEFAULT '#818cf8',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB");

    echo json_encode(['step' => 'Table savings_goals created']) . "\n";

    // Budgets
    $pdo->exec("CREATE TABLE IF NOT EXISTS `budgets` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NOT NULL,
        `category_id` INT NOT NULL,
        `amount` DECIMAL(15,2) NOT NULL,
        `month` VARCHAR(7) NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_budget` (`user_id`, `category_id`, `month`),
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
    ) ENGINE=InnoDB");

    echo json_encode(['step' => 'Table budgets created']) . "\n";

    // Sessions (for stateless cloud environments)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `sessions` (
        `id` VARCHAR(128) PRIMARY KEY,
        `data` TEXT NOT NULL,
        `timestamp` INT UNSIGNED NOT NULL,
        INDEX (`timestamp`)
    ) ENGINE=InnoDB");

    echo json_encode(['step' => 'Table sessions created']) . "\n";

    // ===== SEED CATEGORIES =====
    // Check if already seeded
    $count = $pdo->query("SELECT COUNT(*) FROM categories")->fetchColumn();

    if ($count == 0) {
        $categories = [
            // === EXPENSE CATEGORIES ===
            // Rumah Tangga
            ['Rumah Tangga', 'expense', null, '🏠', '#818cf8', 1],
            ['Listrik', 'expense', 'Rumah Tangga', '⚡', '#818cf8', 1],
            ['Air (PDAM)', 'expense', 'Rumah Tangga', '💧', '#818cf8', 2],
            ['Internet', 'expense', 'Rumah Tangga', '📡', '#818cf8', 3],
            ['Sewa/Cicilan', 'expense', 'Rumah Tangga', '🏠', '#818cf8', 4],
            ['Kebersihan', 'expense', 'Rumah Tangga', '🧹', '#818cf8', 5],
            ['Perbaikan', 'expense', 'Rumah Tangga', '🔧', '#818cf8', 6],
            ['Peralatan RT', 'expense', 'Rumah Tangga', '🪣', '#818cf8', 7],

            // Anak
            ['Anak', 'expense', null, '👶', '#f472b6', 2],
            ['Sekolah/SPP', 'expense', 'Anak', '📚', '#f472b6', 1],
            ['Les/Kursus', 'expense', 'Anak', '✏️', '#f472b6', 2],
            ['Buku/Alat Tulis', 'expense', 'Anak', '📖', '#f472b6', 3],
            ['Susu/Makanan Bayi', 'expense', 'Anak', '🍼', '#f472b6', 4],
            ['Pakaian Anak', 'expense', 'Anak', '👕', '#f472b6', 5],
            ['Mainan', 'expense', 'Anak', '🧸', '#f472b6', 6],
            ['Kesehatan Anak', 'expense', 'Anak', '🏥', '#f472b6', 7],

            // Dapur
            ['Dapur', 'expense', null, '🍳', '#fbbf24', 3],
            ['Belanja Sayur/Buah', 'expense', 'Dapur', '🥬', '#fbbf24', 1],
            ['Daging/Ikan', 'expense', 'Dapur', '🥩', '#fbbf24', 2],
            ['Bumbu/Rempah', 'expense', 'Dapur', '🌶️', '#fbbf24', 3],
            ['Beras/Minyak', 'expense', 'Dapur', '🍚', '#fbbf24', 4],
            ['Snack/Minuman', 'expense', 'Dapur', '🧃', '#fbbf24', 5],
            ['Gas/LPG', 'expense', 'Dapur', '🔥', '#fbbf24', 6],

            // Transport
            ['Transport', 'expense', null, '🚗', '#38bdf8', 4],
            ['Bensin/BBM', 'expense', 'Transport', '⛽', '#38bdf8', 1],
            ['Parkir/Tol', 'expense', 'Transport', '🅿️', '#38bdf8', 2],
            ['Ojol/Taksi', 'expense', 'Transport', '🛵', '#38bdf8', 3],
            ['Servis Kendaraan', 'expense', 'Transport', '🔧', '#38bdf8', 4],
            ['Angkutan Umum', 'expense', 'Transport', '🚌', '#38bdf8', 5],

            // Jajan
            ['Jajan', 'expense', null, '🍿', '#ff6b6b', 5],
            ['Kopi/Cafe', 'expense', 'Jajan', '☕', '#ff6b6b', 1],
            ['Street Food', 'expense', 'Jajan', '🍜', '#ff6b6b', 2],
            ['Restaurant', 'expense', 'Jajan', '🍽️', '#ff6b6b', 3],
            ['Boba/Minuman', 'expense', 'Jajan', '🧋', '#ff6b6b', 4],
            ['Snack', 'expense', 'Jajan', '🍩', '#ff6b6b', 5],

            // Kesehatan
            ['Kesehatan', 'expense', null, '💊', '#34d399', 6],
            ['Dokter/RS', 'expense', 'Kesehatan', '🏥', '#34d399', 1],
            ['Obat-obatan', 'expense', 'Kesehatan', '💊', '#34d399', 2],
            ['Vitamin/Suplemen', 'expense', 'Kesehatan', '💪', '#34d399', 3],
            ['BPJS', 'expense', 'Kesehatan', '🏛️', '#34d399', 4],
            ['Gym/Fitness', 'expense', 'Kesehatan', '🏋️', '#34d399', 5],

            // Hiburan
            ['Hiburan', 'expense', null, '🎮', '#a78bfa', 7],
            ['Film/Bioskop', 'expense', 'Hiburan', '🎬', '#a78bfa', 1],
            ['Streaming', 'expense', 'Hiburan', '📺', '#a78bfa', 2],
            ['Game', 'expense', 'Hiburan', '🎮', '#a78bfa', 3],
            ['Liburan/Wisata', 'expense', 'Hiburan', '✈️', '#a78bfa', 4],
            ['Hobi', 'expense', 'Hiburan', '🎨', '#a78bfa', 5],

            // Pakaian
            ['Pakaian', 'expense', null, '👔', '#fb923c', 8],
            ['Baju', 'expense', 'Pakaian', '👕', '#fb923c', 1],
            ['Sepatu', 'expense', 'Pakaian', '👟', '#fb923c', 2],
            ['Aksesoris', 'expense', 'Pakaian', '⌚', '#fb923c', 3],
            ['Laundry', 'expense', 'Pakaian', '👔', '#fb923c', 4],

            // Lainnya (Expense)
            ['Lainnya', 'expense', null, '📦', '#94a3b8', 9],
            ['Sedekah/Donasi', 'expense', 'Lainnya', '🤲', '#94a3b8', 1],
            ['Hadiah', 'expense', 'Lainnya', '🎁', '#94a3b8', 2],
            ['Tak Terduga', 'expense', 'Lainnya', '❓', '#94a3b8', 3],

            // === INCOME CATEGORIES ===
            ['Gaji', 'income', null, '💰', '#10b981', 1],
            ['Bonus', 'income', null, '🎁', '#34d399', 2],
            ['THR', 'income', null, '🕌', '#059669', 3],
            ['Freelance', 'income', null, '💻', '#6ee7b7', 4],
            ['Investasi', 'income', null, '📈', '#a7f3d0', 5],
            ['Lainnya', 'income', null, '💵', '#d1fae5', 6],
        ];

        // First pass: insert parent categories (parent_id = null)
        $insertStmt = $pdo->prepare("INSERT INTO categories (name, type, parent_id, emoji, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)");

        $parentIds = [];

        foreach ($categories as $cat) {
            if ($cat[2] === null) {
                $insertStmt->execute([$cat[0], $cat[1], null, $cat[3], $cat[4], $cat[5]]);
                $key = $cat[0] . '_' . $cat[1];
                $parentIds[$key] = $pdo->lastInsertId();
            }
        }

        // Second pass: insert child categories
        foreach ($categories as $cat) {
            if ($cat[2] !== null) {
                $parentKey = $cat[2] . '_' . $cat[1];
                $pid = $parentIds[$parentKey] ?? null;
                $insertStmt->execute([$cat[0], $cat[1], $pid, $cat[3], $cat[4], $cat[5]]);
            }
        }

        echo json_encode(['step' => 'Categories seeded (' . count($categories) . ' items)']) . "\n";
    } else {
        echo json_encode(['step' => 'Categories already seeded, skipped']) . "\n";
    }

    echo json_encode(['success' => true, 'message' => 'Database initialized successfully! 🚀']) . "\n";

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
