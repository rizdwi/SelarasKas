<?php
require 'api/config.php';
$db = getDB();

$map = [
    '🍔' => 'utensils',
    '🚗' => 'car',
    '🏠' => 'home',
    '💡' => 'zap',
    '🎉' => 'party-popper',
    '🛍️' => 'shopping-bag',
    '🏥' => 'heart-pulse',
    '🎓' => 'graduation-cap',
    '💼' => 'briefcase',
    '💰' => 'banknote',
    '🎁' => 'gift',
    '📈' => 'trending-up'
];

foreach ($map as $emoji => $icon) {
    $db->prepare("UPDATE categories SET emoji = ? WHERE emoji = ?")->execute([$icon, $emoji]);
}

echo "OK";
