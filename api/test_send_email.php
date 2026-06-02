<?php
// ============================================
// SelarasKas — Email Diagnostic Tool
// ============================================
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/send_email.php';

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html>
<html>
<head>
    <title>SelarasKas Email Diagnostic</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0e1a; color: #f1f5f9; padding: 40px; }
        .card { background: #111627; border: 1px solid #1e2338; border-radius: 12px; padding: 24px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
        h1 { color: #818cf8; margin-top: 0; font-size: 24px; border-bottom: 1px solid #1e2338; padding-bottom: 12px; }
        h3 { color: #f1f5f9; margin-bottom: 8px; }
        pre { background: #1a1f2e; border: 1px solid #2a2f3e; padding: 12px; border-radius: 8px; overflow-x: auto; color: #34d399; font-family: monospace; }
        .success { color: #34d399; font-weight: bold; }
        .error { color: #f87171; font-weight: bold; }
        .warning { color: #fbbf24; font-weight: bold; }
        a { color: #818cf8; text-decoration: none; }
        a:hover { text-decoration: underline; }
        input[type='email'] { background: #1a1f2e; border: 1px solid #2a2f3e; padding: 8px 12px; border-radius: 6px; color: #fff; width: 100%; box-sizing: border-box; margin-bottom: 12px; }
        button { background: #6366f1; border: none; padding: 10px 16px; border-radius: 6px; color: #fff; font-weight: bold; cursor: pointer; }
        button:hover { background: #4f46e5; }
    </style>
</head>
<body>
<div class='card'>
    <h1>SelarasKas Email Diagnostic</h1>";

$apiKey = defined('RESEND_API_KEY') ? RESEND_API_KEY : '';
echo "<h3>1. Environment Configuration</h3>";
echo "<ul>";
echo "<li><strong>RESEND_API_KEY Constant:</strong> " . (defined('RESEND_API_KEY') ? "<span class='success'>Defined</span>" : "<span class='error'>Undefined</span>") . "</li>";
echo "<li><strong>RESEND_API_KEY Length:</strong> " . strlen($apiKey) . " characters</li>";

if ($apiKey) {
    echo "<li><strong>RESEND_API_KEY Prefix:</strong> <code>" . htmlspecialchars(substr($apiKey, 0, 7)) . "...</code></li>";
    if (strpos($apiKey, 're_') !== 0) {
        echo "<li><span class='warning'>⚠️ API Key format warning: Resend API keys typically start with <code>re_</code>. Please make sure you copied the correct key.</span></li>";
    }
} else {
    echo "<li><span class='error'>❌ RESEND_API_KEY is empty. Environment variable is not loaded.</span></li>";
}

echo "<li><strong>getenv('RESEND_API_KEY'):</strong> " . (getenv('RESEND_API_KEY') ? "<span class='success'>Found</span>" : "<span class='warning'>Not Found</span>") . "</li>";
echo "<li><strong>\$_ENV['RESEND_API_KEY']:</strong> " . (isset($_ENV['RESEND_API_KEY']) ? "<span class='success'>Found</span>" : "<span class='warning'>Not Found</span>") . "</li>";
echo "</ul>";

echo "<h3>2. Test Send Email</h3>";
if (isset($_GET['test_email'])) {
    $email = trim($_GET['test_email']);
    echo "<p>Attempting to send test verification email to: <code>" . htmlspecialchars($email) . "</code>...</p>";
    
    $code = generateVerificationCode();
    $htmlContent = getEmailTemplate("Diagnostic User", $code);
    
    $data = json_encode([
        'from' => 'SelarasKas <onboarding@resend.dev>',
        'to' => [$email],
        'subject' => "🔐 Test Kode Verifikasi SelarasKas: $code",
        'html' => $htmlContent,
    ]);

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ]),
            'content' => $data,
            'timeout' => 15,
            'ignore_errors' => true,
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
        ],
    ]);

    $response = @file_get_contents('https://api.resend.com/emails', false, $context);
    
    echo "<h4>HTTP Response Headers</h4>";
    echo "<pre>";
    if (isset($http_response_header)) {
        print_r($http_response_header);
    } else {
        echo "No response headers (request timed out or failed to connect)";
    }
    echo "</pre>";
    
    echo "<h4>Resend API Response</h4>";
    echo "<pre>";
    if ($response !== false) {
        $decoded = json_decode($response, true);
        echo htmlspecialchars(json_encode($decoded, JSON_PRETTY_PRINT));
        
        if (isset($decoded['id'])) {
            echo "\n\n<span class='success'>✅ SUCCESS! Email sent successfully. ID: " . htmlspecialchars($decoded['id']) . "</span>";
        } else {
            echo "\n\n<span class='error'>❌ FAILED! Check error message above.</span>";
            if (isset($decoded['message']) && strpos($decoded['message'], 'restricted') !== false) {
                echo "\n<span class='warning'>💡 Note: You are using the default free domain onboarding@resend.dev. Resend restricts sending to the email address you registered with unless you verify your own custom domain.</span>";
            }
        }
    } else {
        echo "Failed to connect to Resend API. Check network/cURL configurations.";
    }
    echo "</pre>";
} else {
    echo "<form method='GET'>
        <label for='test_email'>Target Email Address:</label><br>
        <input type='email' id='test_email' name='test_email' placeholder='e.g., your-registered-resend-email@gmail.com' required><br>
        <button type='submit'>Send Test Email</button>
    </form>";
}

echo "<p style='margin-top: 30px; text-align: center; font-size: 12px; color: #475569;'><a href='../'>&larr; Back to App</a></p>
</div>
</body>
</html>";
