<?php
// Unified Serverless Entrypoint for Vercel
ini_set('display_errors', '0');
error_reporting(0);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

// Handle API requests
if (strpos($path, '/api/') === 0) {
    $script = basename($path);
    if (substr($script, -4) !== '.php') {
        $script .= '.php';
    }
    
    $targetFile = __DIR__ . '/' . $script;
    if (file_exists($targetFile) && $script !== 'index.php') {
        chdir(__DIR__);
        require $targetFile;
        exit;
    }
    
    // If not found in api/
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'API endpoint not found: ' . htmlspecialchars($script)]);
    exit;
}

// Handle Root / Web Pages
chdir(__DIR__ . '/..');
require_once __DIR__ . '/../index.php';
