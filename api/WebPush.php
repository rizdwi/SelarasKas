<?php
// ============================================
// SelarasKas — Web Push Library (Self-contained)
// RFC 8291 payload encryption + VAPID (RFC 8292)
// No external dependencies — uses PHP built-in openssl & hash
// ============================================

class WebPush
{
    // =========================================================
    // Base64url helpers (RFC 4648 §5)
    // =========================================================
    public static function base64url_encode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    public static function base64url_decode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
    }

    // =========================================================
    // VAPID key generation (ECDSA P-256)
    // =========================================================
    /**
     * Generate a new VAPID key pair.
     * @return array{publicKey: string, privateKey: string} base64url-encoded keys
     */
    public static function generateVAPIDKeys(): array
    {
        $key = openssl_pkey_new([
            'curve_name'       => 'prime256v1',
            'private_key_type' => OPENSSL_KEYTYPE_EC,
        ]);
        if ($key === false) {
            throw new \RuntimeException('Failed to generate EC key: ' . openssl_error_string());
        }

        $details = openssl_pkey_get_details($key);

        // Uncompressed public key: 0x04 || x (32 bytes) || y (32 bytes)
        $x = str_pad($details['ec']['x'], 32, "\0", STR_PAD_LEFT);
        $y = str_pad($details['ec']['y'], 32, "\0", STR_PAD_LEFT);
        $publicKeyRaw = "\x04" . $x . $y;

        // Private key scalar d (32 bytes)
        $d = str_pad($details['ec']['d'], 32, "\0", STR_PAD_LEFT);

        openssl_pkey_free($key);

        return [
            'publicKey'  => self::base64url_encode($publicKeyRaw),
            'privateKey' => self::base64url_encode($d),
        ];
    }

    // =========================================================
    // Send a push notification
    // =========================================================
    /**
     * @param array  $subscription  {endpoint, keys: {p256dh, auth}}
     * @param string $payload        JSON string
     * @param string $vapidPublic    base64url-encoded 65-byte uncompressed public key
     * @param string $vapidPrivate   base64url-encoded 32-byte private scalar
     * @return array {success: bool, statusCode: int, reason: string}
     */
    public static function sendNotification(
        array  $subscription,
        string $payload,
        string $vapidPublic,
        string $vapidPrivate
    ): array {
        $endpoint = $subscription['endpoint'];
        $p256dh   = $subscription['keys']['p256dh'];
        $authKey  = $subscription['keys']['auth'];

        // 1. Encrypt payload (RFC 8291 — aes128gcm)
        $encrypted = self::encryptPayload($payload, $p256dh, $authKey);

        // 2. Build VAPID Authorization header
        $audience = self::getOrigin($endpoint);
        $vapidHeaders = self::buildVapidHeaders($audience, $vapidPublic, $vapidPrivate);

        // 3. Send via cURL
        $headers = [
            'Content-Type: application/octet-stream',
            'Content-Encoding: aes128gcm',
            'Content-Length: ' . strlen($encrypted['body']),
            'TTL: 86400',
            'Urgency: normal',
            'Authorization: ' . $vapidHeaders['authorization'],
        ];

        // Add Crypto-Key only if needed (for vapid)
        if (!empty($vapidHeaders['cryptoKey'])) {
            $headers[] = 'Crypto-Key: ' . $vapidHeaders['cryptoKey'];
        }

        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $encrypted['body'],
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response   = curl_exec($ch);
        $statusCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error      = curl_error($ch);
        curl_close($ch);

        if ($error) {
            return ['success' => false, 'statusCode' => 0, 'reason' => 'cURL error: ' . $error];
        }

        return [
            'success'    => $statusCode >= 200 && $statusCode < 300,
            'statusCode' => $statusCode,
            'reason'     => $response ?: 'HTTP ' . $statusCode,
        ];
    }

    // =========================================================
    // VAPID JWT + headers  (RFC 8292)
    // =========================================================
    private static function buildVapidHeaders(string $audience, string $vapidPublic, string $vapidPrivate): array
    {
        $header = self::base64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));

        $payload = self::base64url_encode(json_encode([
            'aud' => $audience,
            'exp' => time() + 43200, // 12 hours
            'sub' => 'mailto:admin@selaraskas.my.id',
        ]));

        $signingInput = $header . '.' . $payload;
        $signature = self::signES256($signingInput, $vapidPrivate);

        $jwt = $signingInput . '.' . self::base64url_encode($signature);

        return [
            'authorization' => 'vapid t=' . $jwt . ', k=' . $vapidPublic,
            'cryptoKey'     => '',
        ];
    }

    /**
     * Sign with ES256 (ECDSA P-256 + SHA-256) — produces a 64-byte r||s signature.
     */
    private static function signES256(string $data, string $vapidPrivate): string
    {
        $privKeyRaw = self::base64url_decode($vapidPrivate);

        // Build a PEM from the raw 32-byte scalar using the SEC1/DER template
        $pem = self::buildECPrivateKeyPEM($privKeyRaw);

        $key = openssl_pkey_get_private($pem);
        if ($key === false) {
            throw new \RuntimeException('Invalid VAPID private key: ' . openssl_error_string());
        }

        $result = openssl_sign($data, $derSig, $key, OPENSSL_ALGO_SHA256);
        openssl_pkey_free($key);

        if (!$result) {
            throw new \RuntimeException('Signing failed: ' . openssl_error_string());
        }

        // Convert DER-encoded ECDSA signature to raw r||s (64 bytes)
        return self::derToRaw($derSig);
    }

    /**
     * Build a PEM-encoded EC private key from a 32-byte scalar.
     * Uses the SEC1 DER format with the OID for prime256v1 (P-256).
     */
    private static function buildECPrivateKeyPEM(string $d): string
    {
        // Derive the public key from the private scalar
        $privKeyHex = bin2hex($d);

        // Use openssl to derive the public key by importing a minimal DER structure
        // DER template for SEC1 ECPrivateKey with prime256v1 OID
        // SEQUENCE {
        //   INTEGER 1 (version)
        //   OCTET STRING (32 bytes, private key d)
        //   [0] OID prime256v1
        // }
        $oid = "\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07"; // OID 1.2.840.10045.3.1.7
        $oidTagged = "\xa0" . chr(strlen($oid)) . $oid;

        $privKeyOctet = "\x04" . chr(strlen($d)) . $d;
        $version = "\x02\x01\x01";

        $inner = $version . $privKeyOctet . $oidTagged;
        $der = "\x30" . self::derLength(strlen($inner)) . $inner;

        $pem  = "-----BEGIN EC PRIVATE KEY-----\n";
        $pem .= chunk_split(base64_encode($der), 64, "\n");
        $pem .= "-----END EC PRIVATE KEY-----\n";

        return $pem;
    }

    /**
     * Encode a DER length field.
     */
    private static function derLength(int $length): string
    {
        if ($length < 128) {
            return chr($length);
        }
        $bytes = '';
        $temp = $length;
        while ($temp > 0) {
            $bytes = chr($temp & 0xFF) . $bytes;
            $temp >>= 8;
        }
        return chr(0x80 | strlen($bytes)) . $bytes;
    }

    /**
     * Convert DER-encoded ECDSA signature to raw 64-byte r||s.
     */
    private static function derToRaw(string $der): string
    {
        $offset = 2; // skip SEQUENCE tag + length

        // Read r
        if (ord($der[$offset]) !== 0x02) {
            throw new \RuntimeException('Invalid DER signature (r tag)');
        }
        $offset++;
        $rLen = ord($der[$offset]);
        $offset++;
        $r = substr($der, $offset, $rLen);
        $offset += $rLen;

        // Read s
        if (ord($der[$offset]) !== 0x02) {
            throw new \RuntimeException('Invalid DER signature (s tag)');
        }
        $offset++;
        $sLen = ord($der[$offset]);
        $offset++;
        $s = substr($der, $offset, $sLen);

        // Trim leading zero bytes and pad to 32 bytes
        $r = ltrim($r, "\x00");
        $s = ltrim($s, "\x00");
        $r = str_pad($r, 32, "\x00", STR_PAD_LEFT);
        $s = str_pad($s, 32, "\x00", STR_PAD_LEFT);

        return $r . $s;
    }

    // =========================================================
    // Payload encryption (RFC 8291 — aes128gcm)
    // =========================================================
    private static function encryptPayload(string $payload, string $userPublicKeyB64, string $userAuthB64): array
    {
        $userPublicKey = self::base64url_decode($userPublicKeyB64); // 65 bytes uncompressed
        $userAuth      = self::base64url_decode($userAuthB64);       // 16 bytes

        // 1. Generate local ephemeral ECDH key pair
        $localKey = openssl_pkey_new([
            'curve_name'       => 'prime256v1',
            'private_key_type' => OPENSSL_KEYTYPE_EC,
        ]);
        if ($localKey === false) {
            throw new \RuntimeException('Failed to generate local EC key: ' . openssl_error_string());
        }
        $localDetails = openssl_pkey_get_details($localKey);
        $localX = str_pad($localDetails['ec']['x'], 32, "\0", STR_PAD_LEFT);
        $localY = str_pad($localDetails['ec']['y'], 32, "\0", STR_PAD_LEFT);
        $localPublicKey = "\x04" . $localX . $localY;

        // 2. ECDH: derive shared secret
        $sharedSecret = self::performECDH($localKey, $userPublicKey);
        openssl_pkey_free($localKey);

        // 3. Derive IKM using HKDF with auth secret (RFC 8291 §3.3)
        $ikm = self::hkdf(
            $userAuth,                                           // salt
            $sharedSecret,                                       // IKM
            "WebPush: info\x00" . $userPublicKey . $localPublicKey, // info
            32                                                    // length
        );

        // 4. Generate 16-byte salt
        $salt = random_bytes(16);

        // 5. Derive content encryption key (CEK) and nonce
        $cek = self::hkdf($salt, $ikm, "Content-Encoding: aes128gcm\x00\x01", 16);
        $nonce = self::hkdf($salt, $ikm, "Content-Encoding: nonce\x00\x01", 12);

        // 6. Add padding delimiter (RFC 8291 §4)
        $paddedPayload = $payload . "\x02"; // delimiter byte

        // 7. Encrypt with AES-128-GCM
        $tag = '';
        $encrypted = openssl_encrypt(
            $paddedPayload,
            'aes-128-gcm',
            $cek,
            OPENSSL_RAW_DATA,
            $nonce,
            $tag,
            '',
            16 // tag length
        );

        if ($encrypted === false) {
            throw new \RuntimeException('AES-128-GCM encryption failed: ' . openssl_error_string());
        }

        $ciphertext = $encrypted . $tag;

        // 8. Build aes128gcm header: salt(16) || rs(4) || idlen(1) || keyid(65) || ciphertext
        $recordSize = pack('N', 4096);
        $keyIdLen   = chr(strlen($localPublicKey)); // 65

        $body = $salt . $recordSize . $keyIdLen . $localPublicKey . $ciphertext;

        return ['body' => $body];
    }

    /**
     * Perform ECDH key exchange.
     * Derives the shared secret between a local private key and a remote uncompressed public key.
     */
    private static function performECDH($localPrivateKey, string $remotePublicKeyRaw): string
    {
        // Build a PEM for the remote public key so openssl_pkey_get_public can load it
        $remotePem = self::buildECPublicKeyPEM($remotePublicKeyRaw);

        $remoteKey = openssl_pkey_get_public($remotePem);
        if ($remoteKey === false) {
            throw new \RuntimeException('Failed to load remote EC public key: ' . openssl_error_string());
        }

        $sharedSecret = openssl_pkey_derive($localPrivateKey, $remoteKey, 256);
        openssl_pkey_free($remoteKey);

        if ($sharedSecret === false) {
            throw new \RuntimeException('ECDH key derivation failed: ' . openssl_error_string());
        }

        return $sharedSecret;
    }

    /**
     * Build a PEM-encoded EC public key from a 65-byte uncompressed point.
     * Uses the SubjectPublicKeyInfo DER structure.
     */
    private static function buildECPublicKeyPEM(string $publicKeyRaw): string
    {
        // AlgorithmIdentifier for EC + prime256v1
        $algorithmIdentifier = "\x30\x13"
            . "\x06\x07\x2a\x86\x48\xce\x3d\x02\x01"          // OID 1.2.840.10045.2.1 (EC)
            . "\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07";     // OID 1.2.840.10045.3.1.7 (prime256v1)

        // BIT STRING wrapping the public key (prepend 0x00 unused bits indicator)
        $bitString = "\x03" . self::derLength(strlen($publicKeyRaw) + 1)
            . "\x00" . $publicKeyRaw;

        $spki = "\x30" . self::derLength(strlen($algorithmIdentifier) + strlen($bitString))
            . $algorithmIdentifier . $bitString;

        $pem  = "-----BEGIN PUBLIC KEY-----\n";
        $pem .= chunk_split(base64_encode($spki), 64, "\n");
        $pem .= "-----END PUBLIC KEY-----\n";

        return $pem;
    }

    /**
     * HKDF (RFC 5869) using SHA-256.
     */
    private static function hkdf(string $salt, string $ikm, string $info, int $length): string
    {
        // Extract
        $prk = hash_hmac('sha256', $ikm, $salt, true);

        // Expand
        $output = '';
        $t = '';
        $counter = 1;
        while (strlen($output) < $length) {
            $t = hash_hmac('sha256', $t . $info . chr($counter), $prk, true);
            $output .= $t;
            $counter++;
        }

        return substr($output, 0, $length);
    }

    /**
     * Extract the origin (scheme + host + port) from a URL.
     */
    private static function getOrigin(string $url): string
    {
        $parsed = parse_url($url);
        $scheme = $parsed['scheme'] ?? 'https';
        $host   = $parsed['host'] ?? '';
        $port   = $parsed['port'] ?? null;

        $origin = $scheme . '://' . $host;
        if ($port && (($scheme === 'https' && $port !== 443) || ($scheme === 'http' && $port !== 80))) {
            $origin .= ':' . $port;
        }

        return $origin;
    }
}
