<?php
require 'api/config.php';
$db = getDB();
$cats=$db->query('SELECT name, emoji FROM categories')->fetchAll(PDO::FETCH_ASSOC); 
echo json_encode($cats, JSON_PRETTY_PRINT);
