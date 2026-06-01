<?php
require 'api/config.php';
$db = getDB();
$stmt = $db->query("SELECT id, transaction_date, DATE_FORMAT(transaction_date, '%Y-%m') as formatted_date FROM transactions WHERE user_id = 4");
var_dump($stmt->fetchAll());
