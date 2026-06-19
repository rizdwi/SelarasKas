<?php
header('Content-Type: application/json; charset=utf-8');

// Load config to check what constants are defined
require_once __DIR__ . '/config.php';

echo json_encode([
    'getenv_DB_HOST' => getenv('DB_HOST'),
    'getenv_DB_PORT' => getenv('DB_PORT'),
    'getenv_DB_NAME' => getenv('DB_NAME'),
    'getenv_DB_USER' => getenv('DB_USER'),
    'getenv_DB_PASS_length' => getenv('DB_PASS') !== false ? strlen(getenv('DB_PASS')) : null,
    
    'defined_DB_HOST' => DB_HOST,
    'defined_DB_PORT' => DB_PORT,
    'defined_DB_NAME' => DB_NAME,
    'defined_DB_USER' => DB_USER,
    'defined_DB_PASS_length' => strlen(DB_PASS)
]);
