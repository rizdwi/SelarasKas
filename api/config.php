<?php
// ============================================
// FinFlow — Database Configuration
// ============================================

session_start();

// CORS Headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database Configuration (Supports Environment Variables for Vercel/Cloud Deployments)
define('DB_HOST', getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? 'localhost'));
define('DB_PORT', getenv('DB_PORT') ?: ($_ENV['DB_PORT'] ?? '3306'));
define('DB_NAME', getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? 'finflow_db'));
define('DB_USER', getenv('DB_USER') ?: ($_ENV['DB_USER'] ?? 'root'));
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : ($_ENV['DB_PASS'] ?? ''));

// OAuth Credentials (Supports Environment Variables)
define('GOOGLE_CLIENT_ID', getenv('GOOGLE_CLIENT_ID') ?: '261568703120-i2p77mrsoo9o5iore6l6jqhraer48hpt.apps.googleusercontent.com');
define('FACEBOOK_APP_ID', getenv('FACEBOOK_APP_ID') ?: '1348574213882211');

function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];

            // Enable SSL for cloud databases (like TiDB Serverless)
            if (defined('PDO::MYSQL_ATTR_SSL_CA') && DB_HOST !== 'localhost' && DB_HOST !== '127.0.0.1') {
                $options[PDO::MYSQL_ATTR_SSL_CA] = true;
                if (defined('PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT')) {
                    $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
                }
            }

            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                $options
            );
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
            exit;
        }
    }
    return $pdo;
}

function requireAuth() {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
    return $_SESSION['user_id'];
}

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function getInput() {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}
