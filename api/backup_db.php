<?php
// ============================================
// Database Auto-Backup Script
// This script is meant to be run via cron job
// ============================================

require_once __DIR__ . '/config.php';

// Block execution via browser for security
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    die("403 Forbidden - This script can only be run via CLI.");
}

$host = DB_HOST;
$port = DB_PORT;
$user = escapeshellarg(DB_USER);
$pass = escapeshellarg(DB_PASS);
$dbname = escapeshellarg(DB_NAME);

$backupDir = __DIR__ . '/../backups';
if (!is_dir($backupDir)) {
    mkdir($backupDir, 0755, true);
}

$date = date('Y-m-d_H-i-s');
$backupFile = $backupDir . '/backup_' . $date . '.sql.gz';

echo "[*] Starting database backup...\n";

// Execute mysqldump and compress with gzip
// Using --column-statistics=0 for compatibility with some MySQL 8/MariaDB servers
$command = "mysqldump --host={$host} --port={$port} --user={$user} --password={$pass} --column-statistics=0 {$dbname} 2>/dev/null | gzip > {$backupFile}";

exec($command, $output, $returnVar);

if ($returnVar === 0) {
    echo "[+] Backup successfully created: {$backupFile}\n";
    
    // Clean up old backups (keep last 7 days)
    $files = glob($backupDir . '/*.sql.gz');
    $now = time();
    $deletedCount = 0;
    
    foreach ($files as $file) {
        if (is_file($file)) {
            if ($now - filemtime($file) >= 7 * 24 * 60 * 60) { // 7 days
                unlink($file);
                $deletedCount++;
            }
        }
    }
    
    if ($deletedCount > 0) {
        echo "[+] Cleaned up {$deletedCount} old backup(s).\n";
    }
    
} else {
    echo "[-] Backup failed with exit code: {$returnVar}\n";
    // Check if mysqldump is installed
    exec("mysqldump --version", $output2, $returnVar2);
    if ($returnVar2 !== 0) {
        echo "[-] mysqldump is not installed or not in PATH.\n";
    }
}
