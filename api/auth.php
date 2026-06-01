<?php
// ============================================
// FinFlow — Authentication API
// ============================================
require_once __DIR__ . '/config.php';

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

    $db = getDB();

    // Check if email exists
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'Email sudah terdaftar'], 409);
    }

    // Create user
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $initial = strtoupper(mb_substr($name, 0, 1));

    $stmt = $db->prepare("INSERT INTO users (name, email, password, avatar_initial) VALUES (?, ?, ?, ?)");
    $stmt->execute([$name, $email, $hash, $initial]);

    $userId = $db->lastInsertId();

    // Auto login
    $_SESSION['user_id'] = $userId;

    jsonResponse([
        'success' => true,
        'user' => [
            'id' => (int)$userId,
            'name' => $name,
            'email' => $email,
            'avatar_initial' => $initial,
            'theme' => 'dark',
        ]
    ], 201);
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
        // Update google_id and avatar if missing
        if (!$user['google_id']) {
            $stmt = $db->prepare("UPDATE users SET google_id = ?, avatar_url = ? WHERE id = ?");
            $stmt->execute([$googleId, $avatarUrl, $user['id']]);
        }
        $userId = $user['id'];
        $initial = $user['avatar_initial'];
        $theme = $user['theme'];
        $dbAvatar = $user['avatar_url'] ?? $avatarUrl;
    } else {
        // Register new user
        $initial = strtoupper(mb_substr($name, 0, 1));
        $hash = password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT); // random pass
        
        $stmt = $db->prepare("INSERT INTO users (name, email, password, avatar_initial, avatar_url, google_id) VALUES (?, ?, ?, ?, ?, ?)");
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
        // Update facebook_id and avatar if missing
        if (!$user['facebook_id']) {
            $stmt = $db->prepare("UPDATE users SET facebook_id = ?, avatar_url = ? WHERE id = ?");
            $stmt->execute([$facebookId, $avatarUrl, $user['id']]);
        }
        $userId = $user['id'];
        $initial = $user['avatar_initial'];
        $theme = $user['theme'];
        $dbAvatar = $user['avatar_url'] ?? $avatarUrl;
    } else {
        // Register new user
        $initial = strtoupper(mb_substr($name, 0, 1));
        $hash = password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT); // random pass
        
        $stmt = $db->prepare("INSERT INTO users (name, email, password, avatar_initial, avatar_url, facebook_id) VALUES (?, ?, ?, ?, ?, ?)");
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
