<?php
require_once 'api/config.php';
$db = getDB();

$map = [
    // === EXPENSE CATEGORIES ===
    'Rumah Tangga' => 'home',
    'Listrik' => 'zap',
    'Air (PDAM)' => 'droplets',
    'Internet' => 'wifi',
    'Sewa/Cicilan' => 'key',
    'Kebersihan' => 'trash-2',
    'Perbaikan' => 'wrench',
    'Peralatan RT' => 'hammer',
    'Servis Kendaraan' => 'wrench',
    'Anak' => 'baby',
    'Sekolah/SPP' => 'book-open',
    'Les/Kursus' => 'pen-tool',
    'Buku/Alat Tulis' => 'book',
    'Susu/Makanan Bayi' => 'baby',
    'Pakaian Anak' => 'shirt',
    'Mainan' => 'toy-brick',
    'Kesehatan Anak' => 'stethoscope',
    'Dapur' => 'utensils-crossed',
    'Belanja Sayur/Buah' => 'carrot',
    'Daging/Ikan' => 'drumstick',
    'Bumbu/Rempah' => 'flame',
    'Beras/Minyak' => 'wheat',
    'Snack/Minuman' => 'cup-soda',
    'Gas/LPG' => 'flame',
    'Transport' => 'car',
    'Bensin/BBM' => 'fuel',
    'Parkir/Tol' => 'circle-parking',
    'Ojol/Taksi' => 'navigation',
    'Angkutan Umum' => 'bus',
    'Jajan' => 'pizza',
    'Kopi/Cafe' => 'coffee',
    'Street Food' => 'soup',
    'Restaurant' => 'utensils',
    'Boba/Minuman' => 'glass-water',
    'Snack' => 'cookie',
    'Kesehatan' => 'heart-pulse',
    'Dokter/RS' => 'hospital',
    'Obat-obatan' => 'pill',
    'Vitamin/Suplemen' => 'activity',
    'BPJS' => 'landmark',
    'Gym/Fitness' => 'dumbbell',
    'Hiburan' => 'party-popper',
    'Film/Bioskop' => 'film',
    'Streaming' => 'tv',
    'Game' => 'gamepad-2',
    'Liburan/Wisata' => 'plane',
    'Hobi' => 'palette',
    'Pakaian' => 'shirt',
    'Baju' => 'shirt',
    'Sepatu' => 'footprints',
    'Aksesoris' => 'watch',
    'Laundry' => 'washing-machine',
    'Lainnya' => 'box',
    'Sedekah/Donasi' => 'heart-handshake',
    'Hadiah' => 'gift',
    'Tak Terduga' => 'help-circle',

    // === INCOME CATEGORIES ===
    'Gaji' => 'wallet',
    'Bonus' => 'gift',
    'THR' => 'coins',
    'Freelance' => 'laptop',
    'Investasi' => 'trending-up',
];

header('Content-Type: application/json; charset=utf-8');

$updated = 0;
$errors = [];

foreach ($map as $name => $icon) {
    try {
        $stmt = $db->prepare("UPDATE categories SET emoji = ? WHERE name = ?");
        $stmt->execute([$icon, $name]);
        $updated += $stmt->rowCount();
    } catch (Exception $e) {
        $errors[] = "Failed to update '$name': " . $e->getMessage();
    }
}

// Also fix income 'Lainnya' which shares a name with expense 'Lainnya'
try {
    $db->prepare("UPDATE categories SET emoji = 'coins' WHERE name = 'Lainnya' AND type = 'income'")->execute();
    $db->prepare("UPDATE categories SET emoji = 'box' WHERE name = 'Lainnya' AND type = 'expense'")->execute();
} catch (Exception $e) {
    $errors[] = "Failed to update Lainnya: " . $e->getMessage();
}

// Verify results
$stmt = $db->query("SELECT name, emoji, type FROM categories ORDER BY type, sort_order, name");
$all = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'success' => true,
    'message' => "Database icons updated! $updated rows affected.",
    'errors' => $errors,
    'categories' => $all
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
