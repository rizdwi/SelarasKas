<?php
require_once 'api/config.php';
$db = getDB();

$map = [
    'Dapur' => 'shopping-cart',
    'Kesehatan' => 'heart',
    'Hiburan' => 'music',
    'Jajan' => 'coffee',
    'Pakaian' => 'shopping-bag'
];

foreach ($map as $name => $icon) {
    $db->prepare("UPDATE categories SET emoji = ? WHERE name = ?")->execute([$icon, $name]);
}

echo "Missing icons fixed!";
