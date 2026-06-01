<?php
require 'api/config.php';
$_SESSION['user_id'] = 6;
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['month'] = '2026-05'; 
$userId = 6;

echo "=== TEST SUMMARY ===\n";
try {
    $_GET['action'] = 'summary';
    ob_start();
    require 'api/transactions.php';
    $out = ob_get_clean();
    echo $out . "\n";
} catch(Exception $e) { echo "ERROR: " . $e->getMessage() . "\n"; }

echo "=== TEST CHART ===\n";
try {
    $_GET['action'] = 'chart';
    ob_start();
    require 'api/transactions.php';
    $out = ob_get_clean();
    echo $out . "\n";
} catch(Exception $e) { echo "ERROR: " . $e->getMessage() . "\n"; }

echo "=== TEST LIST ===\n";
try {
    unset($_GET['action']);
    ob_start();
    require 'api/transactions.php';
    $out = ob_get_clean();
    echo $out . "\n";
} catch(Exception $e) { echo "ERROR: " . $e->getMessage() . "\n"; }
