<?php
// ============================================
// SelarasKas — Authentication API
// ============================================
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/send_email.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'register':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleRegister();
        break;
    case 'login':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleLogin();
        break;
    case 'verify_email':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleVerifyEmail();
        break;
    case 'resend_code':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleResendCode();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'check':
        handleCheck();
        break;
    case 'google_login':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleGoogleLogin();
        break;
    case 'facebook_login':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleFacebookLogin();
        break;
    case 'config':
        jsonResponse([
            'google_client_id' => GOOGLE_CLIENT_ID,
            'facebook_app_id' => FACEBOOK_APP_ID
        ]);
        break;
    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}

function handleRegister() {
    $input = getInput();
    $name = trim($input['name'] ?? '');
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';

    if (!$name || !$email || !$password) {
        jsonResponse(['error' => 'Nama, email, dan password wajib diisi'], 400);
    }

    if (strlen($password) < 6) {
        jsonResponse(['error' => 'Password minimal 6 karakter'], 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['error' => 'Format email tidak valid'], 400);
    }

    // Stricter email validation - block common fake domains
    $blockedDomains = ['example.com', 'test.com', 'fake.com', 'mailinator.com', 'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la', 'dispostable.com', 'temp-mail.org'];
    $emailDomain = strtolower(substr($email, strrpos($email, '@') + 1));
    if (in_array($emailDomain, $blockedDomains)) {
        jsonResponse(['error' => 'Gunakan alamat email asli untuk mendaftar'], 400);
    }

    // Check DNS MX record for the email domain
    if (!checkdnsrr($emailDomain, 'MX')) {
        jsonResponse(['error' => 'Domain email tidak valid. Gunakan email asli.'], 400);
    }

    $db = getDB();

    // Check if email exists
    $stmt = $db->prepare("SELECT id, email_verified FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $existing = $stmt->fetch();

    if ($existing) {
        if ($existing['email_verified']) {
            jsonResponse(['error' => 'Email sudah terdaftar'], 409);
        } else {
            // Account exists but not verified — resend code
            $code = generateVerificationCode();
            $expires = date('Y-m-d H:i:s', time() + 900); // 15 minutes

            $stmt = $db->prepare("UPDATE users SET name = ?, password = ?, verification_code = ?, verification_expires = ? WHERE id = ?");
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $stmt->execute([$name, $hash, $code, $expires, $existing['id']]);

            sendVerificationEmail($email, $name, $code);

            jsonResponse([
                'needs_verification' => true,
                'email' => $email,
                'message' => 'Kode verifikasi telah dikirim ulang ke email kamu'
            ]);
        }
    }

    // Create user with verification
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $initial = strtoupper(mb_substr($name, 0, 1));
    $code = generateVerificationCode();
    $expires = date('Y-m-d H:i:s', time() + 900); // 15 minutes

    $stmt = $db->prepare("INSERT INTO users (name, email, password, avatar_initial, email_verified, verification_code, verification_expires) VALUES (?, ?, ?, ?, 0, ?, ?)");
    $stmt->execute([$name, $email, $hash, $initial, $code, $expires]);

    // Send verification email
    $emailSent = sendVerificationEmail($email, $name, $code);

    jsonResponse([
        'needs_verification' => true,
        'email' => $email,
        'message' => $emailSent 
            ? 'Kode verifikasi telah dikirim ke ' . $email 
            : 'Akun dibuat, tapi gagal mengirim email. Coba kirim ulang kode.'
    ], 201);
}

function handleVerifyEmail() {
    $input = getInput();
    $email = trim($input['email'] ?? '');
    $code = trim($input['code'] ?? '');

    if (!$email || !$code) {
        jsonResponse(['error' => 'Email dan kode verifikasi wajib diisi'], 400);
    }

    if (strlen($code) !== 6 || !ctype_digit($code)) {
        jsonResponse(['error' => 'Kode verifikasi harus 6 digit angka'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ? AND email_verified = 0");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['error' => 'Akun tidak ditemukan atau sudah diverifikasi'], 404);
    }

    // Check code
    if ($user['verification_code'] !== $code) {
        jsonResponse(['error' => 'Kode verifikasi salah'], 400);
    }

    // Check expiration
    if (strtotime($user['verification_expires']) < time()) {
        jsonResponse(['error' => 'Kode verifikasi sudah kedaluwarsa. Silakan kirim ulang kode.', 'expired' => true], 400);
    }

    // Verify the account
    $stmt = $db->prepare("UPDATE users SET email_verified = 1, verification_code = NULL, verification_expires = NULL WHERE id = ?");
    $stmt->execute([$user['id']]);

    // Auto login
    $_SESSION['user_id'] = $user['id'];

    jsonResponse([
        'success' => true,
        'message' => 'Email berhasil diverifikasi! 🎉',
        'user' => [
            'id' => (int)$user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'avatar_initial' => $user['avatar_initial'],
            'avatar_url' => $user['avatar_url'],
            'theme' => $user['theme'],
        ]
    ]);
}

function handleResendCode() {
    $input = getInput();
    $email = trim($input['email'] ?? '');

    if (!$email) {
        jsonResponse(['error' => 'Email wajib diisi'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ? AND email_verified = 0");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['error' => 'Akun tidak ditemukan atau sudah diverifikasi'], 404);
    }

    // Rate limit: check if last code was sent less than 60 seconds ago
    if ($user['verification_expires']) {
        $lastSent = strtotime($user['verification_expires']) - 900; // verification_expires - 15 min = send time
        if (time() - $lastSent < 60) {
            $waitSeconds = 60 - (time() - $lastSent);
            jsonResponse(['error' => "Tunggu {$waitSeconds} detik sebelum mengirim ulang kode", 'wait' => $waitSeconds], 429);
        }
    }

    // Generate new code
    $code = generateVerificationCode();
    $expires = date('Y-m-d H:i:s', time() + 900);

    $stmt = $db->prepare("UPDATE users SET verification_code = ?, verification_expires = ? WHERE id = ?");
    $stmt->execute([$code, $expires, $user['id']]);

    $emailSent = sendVerificationEmail($email, $user['name'], $code);

    jsonResponse([
        'success' => true,
        'message' => $emailSent 
            ? 'Kode verifikasi baru telah dikirim ke ' . $email
            : 'Gagal mengirim email. Coba lagi nanti.'
    ]);
}

function handleLogin() {
    $input = getInput();
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';

    if (!$email || !$password) {
        jsonResponse(['error' => 'Email dan password wajib diisi'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        jsonResponse(['error' => 'Email atau password salah'], 401);
    }

    // Check email verification status
    if (!$user['email_verified'] && !$user['google_id'] && !$user['facebook_id']) {
        // Resend verification code automatically
        $code = generateVerificationCode();
        $expires = date('Y-m-d H:i:s', time() + 900);

        $stmt = $db->prepare("UPDATE users SET verification_code = ?, verification_expires = ? WHERE id = ?");
        $stmt->execute([$code, $expires, $user['id']]);

        sendVerificationEmail($email, $user['name'], $code);

        jsonResponse([
            'needs_verification' => true,
            'email' => $email,
            'message' => 'Akun belum diverifikasi. Kode verifikasi baru telah dikirim ke email kamu.'
        ], 403);
    }

    // Set session
    $_SESSION['user_id'] = $user['id'];

    jsonResponse([
        'success' => true,
        'user' => [
            'id' => (int)$user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'avatar_initial' => $user['avatar_initial'],
            'avatar_url' => $user['avatar_url'],
            'theme' => $user['theme'],
        ]
    ]);
}

function handleLogout() {
    session_destroy();
    jsonResponse(['success' => true]);
}

function handleCheck() {
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(['authenticated' => false]);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT id, name, email, avatar_initial, avatar_url, theme FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        session_destroy();
        jsonResponse(['authenticated' => false]);
    }

    jsonResponse([
        'authenticated' => true,
        'user' => $user
    ]);
}

function handleGoogleLogin() {
    $input = getInput();
    $googleId = $input['google_id'] ?? '';
    $email = $input['email'] ?? '';
    $name = $input['name'] ?? '';
    $avatarUrl = $input['avatar_url'] ?? null;

    if (!$googleId || !$email) {
        jsonResponse(['error' => 'Data Google tidak valid'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        // Update google_id, avatar and mark as verified (Google emails are pre-verified)
        if (!$user['google_id']) {
            $stmt = $db->prepare("UPDATE users SET google_id = ?, avatar_url = ?, email_verified = 1 WHERE id = ?");
            $stmt->execute([$googleId, $avatarUrl, $user['id']]);
        }
        $userId = $user['id'];
        $initial = $user['avatar_initial'];
        $theme = $user['theme'];
        $dbAvatar = $user['avatar_url'] ?? $avatarUrl;
    } else {
        // Register new user — already verified via Google
        $initial = strtoupper(mb_substr($name, 0, 1));
        $hash = password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT);
        
        $stmt = $db->prepare("INSERT INTO users (name, email, password, avatar_initial, avatar_url, google_id, email_verified) VALUES (?, ?, ?, ?, ?, ?, 1)");
        $stmt->execute([$name, $email, $hash, $initial, $avatarUrl, $googleId]);
        
        $userId = $db->lastInsertId();
        $theme = 'dark';
        $dbAvatar = $avatarUrl;
    }

    $_SESSION['user_id'] = $userId;

    jsonResponse([
        'success' => true,
        'user' => [
            'id' => (int)$userId,
            'name' => $name,
            'email' => $email,
            'avatar_initial' => $initial,
            'avatar_url' => $dbAvatar,
            'theme' => $theme,
        ]
    ]);
}

function handleFacebookLogin() {
    $input = getInput();
    $facebookId = $input['facebook_id'] ?? '';
    $email = $input['email'] ?? '';
    $name = $input['name'] ?? '';
    $avatarUrl = $input['avatar_url'] ?? null;

    if (!$facebookId || !$email) {
        jsonResponse(['error' => 'Data Facebook tidak valid'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        // Update facebook_id, avatar and mark as verified
        if (!$user['facebook_id']) {
            $stmt = $db->prepare("UPDATE users SET facebook_id = ?, avatar_url = ?, email_verified = 1 WHERE id = ?");
            $stmt->execute([$facebookId, $avatarUrl, $user['id']]);
        }
        $userId = $user['id'];
        $initial = $user['avatar_initial'];
        $theme = $user['theme'];
        $dbAvatar = $user['avatar_url'] ?? $avatarUrl;
    } else {
        // Register new user — already verified via Facebook
        $initial = strtoupper(mb_substr($name, 0, 1));
        $hash = password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT);
        
        $stmt = $db->prepare("INSERT INTO users (name, email, password, avatar_initial, avatar_url, facebook_id, email_verified) VALUES (?, ?, ?, ?, ?, ?, 1)");
        $stmt->execute([$name, $email, $hash, $initial, $avatarUrl, $facebookId]);
        
        $userId = $db->lastInsertId();
        $theme = 'dark';
        $dbAvatar = $avatarUrl;
    }

    $_SESSION['user_id'] = $userId;

    jsonResponse([
        'success' => true,
        'user' => [
            'id' => (int)$userId,
            'name' => $name,
            'email' => $email,
            'avatar_initial' => $initial,
            'avatar_url' => $dbAvatar,
            'theme' => $theme,
        ]
    ]);
}
