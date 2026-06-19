<?php
// Diagnostic script — DELETE after debugging
header('Content-Type: application/json; charset=utf-8');

// Show what values are actually being used
$info = [
    'php_version' => PHP_VERSION,
    'pdo_drivers' => PDO::getAvailableDrivers(),
    'server_ip' => $_SERVER['SERVER_ADDR'] ?? 'unknown',
    'env_vars' => [
        'DB_HOST_getenv' => getenv('DB_HOST') ?: '(not set)',
        'DB_PORT_getenv' => getenv('DB_PORT') ?: '(not set)',
        'DB_NAME_getenv' => getenv('DB_NAME') ?: '(not set)',
        'DB_USER_getenv' => getenv('DB_USER') ?: '(not set)',
        'DB_PASS_getenv' => getenv('DB_PASS') !== false ? '***SET***' : '(not set)',
    ],
    'env_array' => [
        'DB_HOST' => $_ENV['DB_HOST'] ?? '(not set)',
        'DB_PORT' => $_ENV['DB_PORT'] ?? '(not set)',
        'DB_NAME' => $_ENV['DB_NAME'] ?? '(not set)',
        'DB_USER' => $_ENV['DB_USER'] ?? '(not set)',
        'DB_PASS' => isset($_ENV['DB_PASS']) ? '***SET***' : '(not set)',
    ],
];

// Test direct connection with hardcoded values
$host = 'mysql-dbas-jkt-001.sumobase.my.id';
$port = '63306';
$dbname = 'dbca8d8138feed42c6';
$user = 'uqWmml0iC7aDfCZmw';
$pass = '07726fa720454a1dbb2a4648';

$info['connection_test'] = [
    'host' => $host,
    'port' => $port,
    'dbname' => $dbname,
    'user' => $user,
    'pass_length' => strlen($pass),
    'pass_first3' => substr($pass, 0, 3) . '***',
];

// Test 1: Without SSL
try {
    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4",
        $user,
        $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]
    );
    $info['test_no_ssl'] = 'SUCCESS';
    $stmt = $pdo->query("SHOW TABLES");
    $info['tables'] = $stmt->fetchAll(PDO::FETCH_COLUMN);
} catch (PDOException $e) {
    $info['test_no_ssl'] = 'FAILED: ' . $e->getMessage();
}

// Test 2: With mysql_native_password
try {
    $pdo2 = new PDO(
        "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 5,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4",
        ]
    );
    $info['test_with_init'] = 'SUCCESS';
} catch (PDOException $e) {
    $info['test_with_init'] = 'FAILED: ' . $e->getMessage();
}

// Test 3: Without specifying database name
try {
    $pdo3 = new PDO(
        "mysql:host=$host;port=$port;charset=utf8mb4",
        $user,
        $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]
    );
    $info['test_no_dbname'] = 'SUCCESS - connected without specifying database';
} catch (PDOException $e) {
    $info['test_no_dbname'] = 'FAILED: ' . $e->getMessage();
}

echo json_encode($info, JSON_PRETTY_PRINT);
