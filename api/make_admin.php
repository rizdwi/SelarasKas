<?php
require_once __DIR__ . '/config.php';

$email = $_GET['email'] ?? '';
if (!$email) {
    die("Masukkan email akun Anda. Contoh: http://domain.com/api/make_admin.php?email=akun_anda@email.com");
}

$db = getDB();
$stmt = $db->prepare("UPDATE users SET role = 'admin' WHERE email = ?");
$stmt->execute([$email]);

if ($stmt->rowCount() > 0) {
    echo "<h1>Berhasil!</h1> Akun <b>$email</b> sekarang resmi menjadi Superadmin.<br>Silakan kembali ke aplikasi dan Refresh halaman. Setelah itu, <b>HARAP HAPUS FILE INI</b> dari server demi keamanan.";
} else {
    echo "Gagal. Akun dengan email <b>$email</b> tidak ditemukan di database.";
}
