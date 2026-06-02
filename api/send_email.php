<?php
// ============================================
// SelarasKas — Email Sender via Resend API
// ============================================

function sendVerificationEmail($toEmail, $toName, $code) {
    $apiKey = defined('RESEND_API_KEY') ? RESEND_API_KEY : '';
    
    if (!$apiKey) {
        error_log('RESEND_API_KEY not configured');
        return false;
    }

    $htmlContent = getEmailTemplate($toName, $code);

    $data = json_encode([
        'from' => 'SelarasKas <onboarding@resend.dev>',
        'to' => [$toEmail],
        'subject' => "🔐 Kode Verifikasi SelarasKas: $code",
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
            'timeout' => 10,
            'ignore_errors' => true,
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
        ],
    ]);

    $response = @file_get_contents('https://api.resend.com/emails', false, $context);
    
    if ($response === false) {
        error_log('Resend API request failed');
        return false;
    }

    $result = json_decode($response, true);
    
    if (isset($result['id'])) {
        return true;
    }

    error_log('Resend API error: ' . $response);
    return false;
}

function generateVerificationCode() {
    return str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

function getEmailTemplate($name, $code) {
    $digits = str_split($code);
    $codeBoxes = '';
    foreach ($digits as $d) {
        $codeBoxes .= '<td style="width:42px;height:52px;text-align:center;font-size:28px;font-weight:700;font-family:\'Inter\',monospace;background:#1a1f2e;color:#818cf8;border-radius:10px;border:2px solid #2a2f3e;letter-spacing:0">' . $d . '</td>';
    }

    return '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:Inter,Segoe UI,Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e1a;padding:40px 0">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#111627;border-radius:16px;border:1px solid #1e2338;overflow:hidden;max-width:90%">
    <!-- Header -->
    <tr><td style="background:linear-gradient(135deg,#818cf8 0%,#6366f1 50%,#4f46e5 100%);padding:32px 40px;text-align:center">
        <table cellpadding="0" cellspacing="0" style="margin:0 auto"><tr>
            <td style="background:rgba(255,255,255,0.2);border-radius:12px;padding:10px;vertical-align:middle">
                <img src="https://img.icons8.com/fluency/48/stack-of-coins.png" width="28" height="28" alt="SK" style="display:block">
            </td>
            <td style="padding-left:12px;vertical-align:middle">
                <span style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px">SelarasKas</span>
            </td>
        </tr></table>
        <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:14px">Kelola Keuanganmu</p>
    </td></tr>
    
    <!-- Body -->
    <tr><td style="padding:36px 40px">
        <h2 style="color:#f1f5f9;margin:0 0 8px;font-size:20px;font-weight:700">Halo, ' . htmlspecialchars($name) . '! 👋</h2>
        <p style="color:#94a3b8;margin:0 0 28px;font-size:14px;line-height:1.6">Masukkan kode verifikasi di bawah ini untuk mengaktifkan akun SelarasKas kamu:</p>
        
        <!-- OTP Code -->
        <table cellpadding="0" cellspacing="6" style="margin:0 auto 28px"><tr>' . $codeBoxes . '</tr></table>
        
        <p style="color:#64748b;font-size:12px;text-align:center;margin:0 0 28px">⏱ Kode ini berlaku selama <strong style="color:#818cf8">15 menit</strong></p>
        
        <div style="background:#1a1f2e;border-radius:10px;padding:16px 20px;border-left:3px solid #818cf8">
            <p style="color:#94a3b8;margin:0;font-size:13px;line-height:1.5">
                ⚠️ Jika kamu tidak merasa mendaftar akun SelarasKas, abaikan email ini. Akun tidak akan aktif tanpa verifikasi.
            </p>
        </div>
    </td></tr>
    
    <!-- Footer -->
    <tr><td style="padding:20px 40px 28px;border-top:1px solid #1e2338;text-align:center">
        <p style="color:#475569;margin:0;font-size:12px">© ' . date('Y') . ' SelarasKas — Personal Finance App</p>
    </td></tr>
</table>
</td></tr>
</table>
</body>
</html>';
}
