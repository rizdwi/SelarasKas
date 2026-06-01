<?php
// Set headers for command line output
if (php_sapi_name() !== 'cli') {
    header('Content-Type: text/plain; charset=utf-8');
}

require 'api/config.php';
$db = getDB();

try {
    // 1. Alter categories table
    $db->exec("ALTER TABLE categories MODIFY emoji VARCHAR(50)");
    echo "Altered categories table successfully.\n";

    // 2. Alter savings_goals table
    $db->exec("ALTER TABLE savings_goals MODIFY emoji VARCHAR(50)");
    echo "Altered savings_goals table successfully.\n";

    // 3. Run fix_cat_icons.php
    echo "Running fix_cat_icons.php...\n";
    include 'fix_cat_icons.php';
    echo "\n";

    // 4. Run fix_missing_icons.php
    echo "Running fix_missing_icons.php...\n";
    include 'fix_missing_icons.php';
    echo "\n";

    echo "Migration completed successfully!\n";
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
