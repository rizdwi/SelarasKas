<?php
require_once __DIR__ . '/config.php';

$email = 'rizkidwisandy@gmail.com';

$db = getDB();
// Pastikan kolom langganan tersedia
try { $db->exec("ALTER TABLE `users` ADD COLUMN `subscription_tier` ENUM('free', 'premium', 'pro') DEFAULT 'free'"); } catch(Exception $e){}
try { $db->exec("ALTER TABLE `users` ADD COLUMN `subscription_expires_at` TIMESTAMP NULL DEFAULT NULL"); } catch(Exception $e){}

$stmt = $db->prepare("UPDATE users SET subscription_tier = 'premium', subscription_expires_at = '2099-12-31 23:59:59' WHERE email = ?");
$stmt->execute([$email]);

if ($stmt->rowCount() > 0) {
    echo "<h1>Berhasil!</h1> Akun <b>$email</b> sekarang resmi menjadi <b>Premium Tanpa Batas Waktu</b>.<br>Silakan kembali ke aplikasi dan Refresh halaman. Setelah itu, <b>HARAP HAPUS FILE INI</b> dari server demi keamanan.";
} else {
    echo "Gagal. Akun dengan email <b>$email</b> tidak ditemukan di database.";
}
