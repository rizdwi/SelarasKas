<?php
// ============================================
// SelarasKas — Authentication API
// ============================================
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/send_email.php';

// Auto-migrate: create tables if not exist (runs silently)
try {
    $pdo = getDB();
    $pdo->exec("CREATE TABLE IF NOT EXISTS remember_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY idx_token_hash (token_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS webauthn_credentials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        credential_id TEXT NOT NULL,
        public_key TEXT NOT NULL,
        sign_count INT DEFAULT 0,
        device_name VARCHAR(100) DEFAULT 'Perangkat',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
} catch (Exception $e) { /* tables already exist */ }

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
    // ===== WebAuthn (Biometric) Actions =====
    case 'webauthn_register_options':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleWebAuthnRegisterOptions();
        break;
    case 'webauthn_register':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleWebAuthnRegister();
        break;
    case 'webauthn_login_options':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleWebAuthnLoginOptions();
        break;
    case 'webauthn_login':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        handleWebAuthnLogin();
        break;
    case 'webauthn_credentials':
        handleWebAuthnCredentials();
        break;
    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}

// =============================================
// Remember Me Helper Functions
// =============================================

function generateRememberToken($userId) {
    $token = bin2hex(random_bytes(32)); // 64 char hex token
    $hash = hash('sha256', $token);
    $expires = date('Y-m-d H:i:s', time() + (86400 * 30)); // 30 days

    $db = getDB();
    // Clean up old tokens for this user (max 5 devices)
    $stmt = $db->prepare("DELETE FROM remember_tokens WHERE user_id = ? AND expires_at < NOW()");
    $stmt->execute([$userId]);
    
    $stmt = $db->prepare("INSERT INTO remember_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)");
    $stmt->execute([$userId, $hash, $expires]);

    // Set cookie (30 days, httponly, secure on HTTPS)
    $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    setcookie('remember_token', $token, [
        'expires' => time() + (86400 * 30),
        'path' => '/',
        'secure' => $isSecure,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    
    return $token;
}

function checkRememberToken() {
    if (!isset($_COOKIE['remember_token'])) return null;
    
    $token = $_COOKIE['remember_token'];
    $hash = hash('sha256', $token);
    
    $db = getDB();
    $stmt = $db->prepare("SELECT user_id FROM remember_tokens WHERE token_hash = ? AND expires_at > NOW()");
    $stmt->execute([$hash]);
    $result = $stmt->fetch();
    
    if ($result) {
        return $result['user_id'];
    }
    
    // Token expired or invalid — clear cookie
    clearRememberCookie();
    return null;
}

function clearRememberToken($userId = null) {
    $db = getDB();
    
    // Delete specific token from cookie
    if (isset($_COOKIE['remember_token'])) {
        $hash = hash('sha256', $_COOKIE['remember_token']);
        $stmt = $db->prepare("DELETE FROM remember_tokens WHERE token_hash = ?");
        $stmt->execute([$hash]);
    }
    
    clearRememberCookie();
}

function clearRememberCookie() {
    $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    setcookie('remember_token', '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => $isSecure,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
}

// =============================================
// Original Auth Functions (with Remember Me)
// =============================================

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
        'csrf_token' => $_SESSION['csrf_token'] ?? null,
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
    $rememberMe = $input['remember_me'] ?? false;

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

    // Remember Me: generate persistent token
    if ($rememberMe) {
        generateRememberToken($user['id']);
    }

    // Check if user has WebAuthn credentials registered
    $stmt = $db->prepare("SELECT COUNT(*) FROM webauthn_credentials WHERE user_id = ?");
    $stmt->execute([$user['id']]);
    $hasWebAuthn = $stmt->fetchColumn() > 0;

    jsonResponse([
        'success' => true,
        'csrf_token' => $_SESSION['csrf_token'] ?? null,
        'user' => [
            'id' => (int)$user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'avatar_initial' => $user['avatar_initial'],
            'avatar_url' => $user['avatar_url'],
            'theme' => $user['theme'],
            'has_webauthn' => $hasWebAuthn,
        ]
    ]);
}

function handleLogout() {
    // Clear remember token
    clearRememberToken();
    
    session_destroy();
    jsonResponse(['success' => true]);
}

function handleCheck() {
    // First check session
    if (isset($_SESSION['user_id'])) {
        $userId = $_SESSION['user_id'];
    } else {
        // Try remember me cookie
        $userId = checkRememberToken();
        if ($userId) {
            // Restore session from remember token
            $_SESSION['user_id'] = $userId;
        }
    }
    
    if (!$userId) {
        jsonResponse(['authenticated' => false]);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT id, name, email, avatar_initial, avatar_url, theme FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        session_destroy();
        clearRememberCookie();
        jsonResponse(['authenticated' => false]);
    }

    // Check if user has WebAuthn credentials
    $stmt = $db->prepare("SELECT COUNT(*) FROM webauthn_credentials WHERE user_id = ?");
    $stmt->execute([$userId]);
    $user['has_webauthn'] = $stmt->fetchColumn() > 0;

    jsonResponse([
        'authenticated' => true,
        'csrf_token' => $_SESSION['csrf_token'] ?? null,
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
        'csrf_token' => $_SESSION['csrf_token'] ?? null,
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
        'csrf_token' => $_SESSION['csrf_token'] ?? null,
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

// =============================================
// WebAuthn (Biometric) Functions
// =============================================

function handleWebAuthnRegisterOptions() {
    $userId = requireAuth();
    
    $db = getDB();
    $stmt = $db->prepare("SELECT id, name, email FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user) jsonResponse(['error' => 'User not found'], 404);
    
    // Get existing credentials to exclude
    $stmt = $db->prepare("SELECT credential_id FROM webauthn_credentials WHERE user_id = ?");
    $stmt->execute([$userId]);
    $existingCreds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Generate challenge
    $challenge = bin2hex(random_bytes(32));
    $_SESSION['webauthn_challenge'] = $challenge;
    $_SESSION['webauthn_action'] = 'register';
    
    $excludeCredentials = array_map(function($credId) {
        return ['type' => 'public-key', 'id' => $credId];
    }, $existingCreds);
    
    jsonResponse([
        'challenge' => $challenge,
        'rp' => [
            'name' => 'SelarasKas',
            'id' => $_SERVER['HTTP_HOST'] ?? 'localhost'
        ],
        'user' => [
            'id' => base64_encode((string)$user['id']),
            'name' => $user['email'],
            'displayName' => $user['name']
        ],
        'pubKeyCredParams' => [
            ['type' => 'public-key', 'alg' => -7],   // ES256
            ['type' => 'public-key', 'alg' => -257],  // RS256
        ],
        'timeout' => 60000,
        'authenticatorSelection' => [
            'authenticatorAttachment' => 'platform', // Built-in (fingerprint/face)
            'userVerification' => 'required',
            'residentKey' => 'preferred',
        ],
        'excludeCredentials' => $excludeCredentials,
        'attestation' => 'none'
    ]);
}

function handleWebAuthnRegister() {
    $userId = requireAuth();
    $input = getInput();
    
    $credentialId = $input['credential_id'] ?? '';
    $publicKey = $input['public_key'] ?? '';
    $deviceName = trim($input['device_name'] ?? 'Perangkat');
    
    if (!$credentialId || !$publicKey) {
        jsonResponse(['error' => 'Credential data tidak lengkap'], 400);
    }
    
    // Verify challenge was issued
    if (!isset($_SESSION['webauthn_challenge']) || $_SESSION['webauthn_action'] !== 'register') {
        jsonResponse(['error' => 'Challenge tidak valid. Coba lagi.'], 400);
    }
    
    // Clear challenge
    unset($_SESSION['webauthn_challenge']);
    unset($_SESSION['webauthn_action']);
    
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO webauthn_credentials (user_id, credential_id, public_key, device_name) VALUES (?, ?, ?, ?)");
    $stmt->execute([$userId, $credentialId, $publicKey, $deviceName]);
    
    jsonResponse([
        'success' => true,
        'message' => 'Sidik jari / Face ID berhasil didaftarkan! 🎉'
    ]);
}

function handleWebAuthnLoginOptions() {
    $input = getInput();
    $email = trim($input['email'] ?? '');
    
    // Get stored email from localStorage (sent by frontend)
    // If no email, try to find any credentials
    $db = getDB();
    
    if ($email) {
        $stmt = $db->prepare("
            SELECT wc.credential_id 
            FROM webauthn_credentials wc 
            JOIN users u ON wc.user_id = u.id 
            WHERE u.email = ?
        ");
        $stmt->execute([$email]);
    } else {
        // No email — can't determine which credentials to allow
        jsonResponse(['error' => 'Email diperlukan untuk login biometrik'], 400);
    }
    
    $credentials = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($credentials)) {
        jsonResponse(['error' => 'Belum ada sidik jari/Face ID terdaftar untuk akun ini', 'no_credentials' => true], 404);
    }
    
    // Generate challenge
    $challenge = bin2hex(random_bytes(32));
    $_SESSION['webauthn_challenge'] = $challenge;
    $_SESSION['webauthn_action'] = 'login';
    $_SESSION['webauthn_email'] = $email;
    
    $allowCredentials = array_map(function($credId) {
        return ['type' => 'public-key', 'id' => $credId];
    }, $credentials);
    
    jsonResponse([
        'challenge' => $challenge,
        'rpId' => $_SERVER['HTTP_HOST'] ?? 'localhost',
        'timeout' => 60000,
        'userVerification' => 'required',
        'allowCredentials' => $allowCredentials
    ]);
}

function handleWebAuthnLogin() {
    $input = getInput();
    $credentialId = $input['credential_id'] ?? '';
    
    if (!$credentialId) {
        jsonResponse(['error' => 'Credential ID tidak valid'], 400);
    }
    
    // Verify challenge
    if (!isset($_SESSION['webauthn_challenge']) || $_SESSION['webauthn_action'] !== 'login') {
        jsonResponse(['error' => 'Challenge tidak valid. Coba lagi.'], 400);
    }
    
    $email = $_SESSION['webauthn_email'] ?? '';
    
    // Clear challenge
    unset($_SESSION['webauthn_challenge']);
    unset($_SESSION['webauthn_action']);
    unset($_SESSION['webauthn_email']);
    
    $db = getDB();
    
    // Find the credential
    $stmt = $db->prepare("
        SELECT wc.*, u.id as uid, u.name, u.email, u.avatar_initial, u.avatar_url, u.theme
        FROM webauthn_credentials wc
        JOIN users u ON wc.user_id = u.id
        WHERE wc.credential_id = ?
    ");
    $stmt->execute([$credentialId]);
    $cred = $stmt->fetch();
    
    if (!$cred) {
        jsonResponse(['error' => 'Credential tidak ditemukan. Daftarkan ulang sidik jari.'], 401);
    }
    
    // Update sign count
    $stmt = $db->prepare("UPDATE webauthn_credentials SET sign_count = sign_count + 1 WHERE id = ?");
    $stmt->execute([$cred['id']]);
    
    // Login the user
    $_SESSION['user_id'] = $cred['uid'];
    
    // Also set remember token for convenience
    generateRememberToken($cred['uid']);
    
    jsonResponse([
        'success' => true,
        'csrf_token' => $_SESSION['csrf_token'] ?? null,
        'user' => [
            'id' => (int)$cred['uid'],
            'name' => $cred['name'],
            'email' => $cred['email'],
            'avatar_initial' => $cred['avatar_initial'],
            'avatar_url' => $cred['avatar_url'],
            'theme' => $cred['theme'],
            'has_webauthn' => true,
        ]
    ]);
}

function handleWebAuthnCredentials() {
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $userId = requireAuth();
        $input = getInput();
        $db = getDB();
        
        if (isset($input['all']) && $input['all'] === true) {
            $stmt = $db->prepare("DELETE FROM webauthn_credentials WHERE user_id = ?");
            $stmt->execute([$userId]);
            jsonResponse(['success' => true, 'message' => 'Semua credential berhasil dihapus']);
        } else {
            $credId = $input['id'] ?? 0;
            $stmt = $db->prepare("DELETE FROM webauthn_credentials WHERE id = ? AND user_id = ?");
            $stmt->execute([$credId, $userId]);
            jsonResponse(['success' => true, 'message' => 'Credential dihapus']);
        }
    }
    
    // GET — list credentials
    $userId = requireAuth();
    $db = getDB();
    $stmt = $db->prepare("SELECT id, device_name, created_at FROM webauthn_credentials WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$userId]);
    
    jsonResponse(['credentials' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}
