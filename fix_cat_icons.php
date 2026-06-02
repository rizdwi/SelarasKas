<?php
require_once 'api/config.php';
$db = getDB();

$map = [
    'Rumah Tangga' => 'home',
    'Listrik' => 'zap',
    'Air (PDAM)' => 'droplets',
    'Internet' => 'wifi',
    'Sewa/Cicilan' => 'key',
    'Kebersihan' => 'trash-2',
    'Perbaikan' => 'wrench',
    'Peralatan RT' => 'hammer',
    'Anak' => 'baby',
    'Sekolah/SPP' => 'book-open',
    'Les/Kursus' => 'pen-tool',
    'Buku/Alat Tulis' => 'book',
    'Susu/Makanan Bayi' => 'coffee',
    'Pakaian Anak' => 'shirt',
    'Mainan' => 'smile',
    'Kesehatan Anak' => 'stethoscope',
    'Dapur' => 'utensils-crossed',
    'Belanja Sayur/Buah' => 'carrot',
    'Daging/Ikan' => 'beef',
    'Bumbu/Rempah' => 'flame',
    'Beras/Minyak' => 'wheat',
    'Snack/Minuman' => 'cup-soda',
    'Gas/LPG' => 'flame',
    'Transport' => 'car',
    'Bensin/BBM' => 'fuel',
    'Parkir/Tol' => 'circle-parking',
    'Ojol/Taksi' => 'bike',
    'Servis Kendaraan' => 'wrench',
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
    'Laundry' => 'shirt', // replaced washing-machine to be safe
    'Lainnya' => 'box',
    'Sedekah/Donasi' => 'heart-handshake',
    'Hadiah' => 'gift',
    'Tak Terduga' => 'help-circle',
    'Gaji' => 'banknote',
    'Bonus' => 'gift',
    'THR' => 'landmark',
    'Freelance' => 'laptop',
    'Investasi' => 'trending-up'
];

foreach ($map as $name => $icon) {
    $db->prepare("UPDATE categories SET emoji = ? WHERE name = ?")->execute([$icon, $name]);
}

echo "Database icons fully fixed!";
