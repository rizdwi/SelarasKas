<?php
// ============================================
// FinFlow — Profile API
// ============================================
require_once __DIR__ . '/config.php';

$userId = requireAuth();
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

try {
    $db = getDB();

    if ($action === 'upload_photo') {
        if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
            throw new Exception("File upload error");
        }

        $file = $_FILES['avatar'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'webp'];

        if (!in_array($ext, $allowed)) {
            throw new Exception("Hanya file JPG, PNG, atau WEBP yang diperbolehkan");
        }
        
        if ($file['size'] > 1.5 * 1024 * 1024) {
            throw new Exception("Ukuran file maksimal 1.5MB untuk penyimpanan cloud");
        }

        // Safe delete old avatar from disk if it was a legacy upload
        $stmt = $db->prepare("SELECT avatar_url FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $oldAvatar = $stmt->fetchColumn();
        if ($oldAvatar && strpos($oldAvatar, 'uploads/') !== false) {
            $oldFile = __DIR__ . '/../' . $oldAvatar;
            if (file_exists($oldFile) && is_writable($oldFile)) {
                @unlink($oldFile);
            }
        }

        // Convert the image to Base64 Data URL
        $imageData = file_get_contents($file['tmp_name']);
        if ($imageData === false) {
            throw new Exception("Gagal membaca file gambar");
        }

        $base64 = base64_encode($imageData);
        $mimeType = 'image/' . ($ext === 'jpg' ? 'jpeg' : $ext);
        $avatarUrl = 'data:' . $mimeType . ';base64,' . $base64;

        $stmt = $db->prepare("UPDATE users SET avatar_url = ? WHERE id = ?");
        $stmt->execute([$avatarUrl, $userId]);

        jsonResponse(['success' => true, 'avatar_url' => $avatarUrl]);

    } elseif ($action === 'update_profile') {
        $input = getInput();
        $name = trim($input['name'] ?? '');

        if (!$name) throw new Exception("Nama tidak boleh kosong");

        $initial = strtoupper(mb_substr($name, 0, 1));

        $stmt = $db->prepare("UPDATE users SET name = ?, avatar_initial = ? WHERE id = ?");
        $stmt->execute([$name, $initial, $userId]);

        jsonResponse(['success' => true, 'name' => $name, 'avatar_initial' => $initial]);

    } elseif ($action === 'change_password') {
        $input = getInput();
        $oldPassword = $input['old_password'] ?? '';
        $newPassword = $input['new_password'] ?? '';

        if (!$oldPassword || !$newPassword) throw new Exception("Password lama dan baru wajib diisi");
        if (strlen($newPassword) < 6) throw new Exception("Password baru minimal 6 karakter");

        $stmt = $db->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $currentHash = $stmt->fetchColumn();

        if (!password_verify($oldPassword, $currentHash)) {
            throw new Exception("Password lama salah");
        }

        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        $stmt = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
        $stmt->execute([$newHash, $userId]);

        jsonResponse(['success' => true]);

    } else {
        throw new Exception("Aksi tidak valid");
    }

} catch (Exception $e) {
    jsonResponse(['error' => $e->getMessage()], 400);
}
