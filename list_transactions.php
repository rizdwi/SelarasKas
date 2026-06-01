<?php
require 'api/config.php';
$db = getDB();
$txs = $db->query('SELECT * FROM transactions')->fetchAll();
echo json_encode($txs, JSON_PRETTY_PRINT) . "\n";
