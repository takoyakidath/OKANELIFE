<?php

namespace Okanelife\Support;

/**
 * Verifies a Google-issued OpenID Connect ID token entirely on this
 * backend, using Google's published JWKS — no per-login call to Google's
 * tokeninfo endpoint (avoids an external dependency in the hot path and
 * Google's rate limits on it). See docs/DESIGN.md §3.2.
 */
final class GoogleIdTokenVerifier
{
    private const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
    private const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

    public static function verify(string $idToken, string $expectedAudience): ?array
    {
        $parts = explode('.', $idToken);
        if (count($parts) !== 3) {
            return null;
        }
        [$headerB64, $payloadB64, $signatureB64] = $parts;

        $header = json_decode(self::base64UrlDecode($headerB64), true);
        $payload = json_decode(self::base64UrlDecode($payloadB64), true);
        $signature = self::base64UrlDecode($signatureB64);
        if (!is_array($header) || !is_array($payload) || $signature === false) {
            return null;
        }
        if (($header['alg'] ?? null) !== 'RS256' || !isset($header['kid'])) {
            return null;
        }

        $jwk = self::findKey((string) $header['kid']);
        if ($jwk === null) {
            return null;
        }

        $publicKeyPem = self::jwkToPem($jwk['n'], $jwk['e']);
        $publicKey = openssl_pkey_get_public($publicKeyPem);
        if ($publicKey === false) {
            return null;
        }

        $signingInput = "{$headerB64}.{$payloadB64}";
        $verified = openssl_verify($signingInput, $signature, $publicKey, OPENSSL_ALGO_SHA256);
        if ($verified !== 1) {
            return null;
        }

        if (!in_array($payload['iss'] ?? null, self::ISSUERS, true)) {
            return null;
        }
        if (($payload['aud'] ?? null) !== $expectedAudience) {
            return null;
        }
        if (!isset($payload['exp']) || time() >= (int) $payload['exp']) {
            return null;
        }
        if (empty($payload['sub'])) {
            return null;
        }

        return $payload;
    }

    private static function findKey(string $kid): ?array
    {
        $keys = self::loadJwks();
        foreach ($keys as $key) {
            if (($key['kid'] ?? null) === $kid) {
                return $key;
            }
        }
        return null;
    }

    private static function loadJwks(): array
    {
        $cachePath = sys_get_temp_dir() . '/okanelife_google_jwks.json';
        if (is_file($cachePath) && (time() - filemtime($cachePath)) < 3600) {
            $cached = json_decode((string) file_get_contents($cachePath), true);
            if (is_array($cached) && isset($cached['keys'])) {
                return $cached['keys'];
            }
        }

        $context = stream_context_create(['http' => ['timeout' => 5]]);
        $raw = @file_get_contents(self::JWKS_URL, false, $context);
        if ($raw === false) {
            if (is_file($cachePath)) {
                $stale = json_decode((string) file_get_contents($cachePath), true);
                return $stale['keys'] ?? [];
            }
            return [];
        }

        @file_put_contents($cachePath, $raw);
        $decoded = json_decode($raw, true);
        return $decoded['keys'] ?? [];
    }

    private static function jwkToPem(string $nB64Url, string $eB64Url): string
    {
        $modulus = self::base64UrlDecode($nB64Url);
        $exponent = self::base64UrlDecode($eB64Url);

        $rsaPublicKey = self::derSequence(
            self::derInteger($modulus) . self::derInteger($exponent)
        );

        // SEQUENCE { AlgorithmIdentifier(rsaEncryption, NULL), BIT STRING(RSAPublicKey) }
        $algorithmIdentifier = hex2bin('300d06092a864886f70d0101010500');
        $bitString = self::derBitString($rsaPublicKey);
        $subjectPublicKeyInfo = self::derSequence($algorithmIdentifier . $bitString);

        $base64 = base64_encode($subjectPublicKeyInfo);
        $lines = implode("\n", str_split($base64, 64));
        return "-----BEGIN PUBLIC KEY-----\n{$lines}\n-----END PUBLIC KEY-----\n";
    }

    private static function derInteger(string $bytes): string
    {
        if ($bytes === '') {
            $bytes = "\x00";
        }
        if ((ord($bytes[0]) & 0x80) !== 0) {
            $bytes = "\x00" . $bytes;
        }
        return "\x02" . self::derLength(strlen($bytes)) . $bytes;
    }

    private static function derBitString(string $bytes): string
    {
        $content = "\x00" . $bytes;
        return "\x03" . self::derLength(strlen($content)) . $content;
    }

    private static function derSequence(string $bytes): string
    {
        return "\x30" . self::derLength(strlen($bytes)) . $bytes;
    }

    private static function derLength(int $length): string
    {
        if ($length < 128) {
            return chr($length);
        }
        $bytes = '';
        while ($length > 0) {
            $bytes = chr($length & 0xff) . $bytes;
            $length >>= 8;
        }
        return chr(0x80 | strlen($bytes)) . $bytes;
    }

    private static function base64UrlDecode(string $data): string|false
    {
        $padded = str_pad($data, strlen($data) % 4 === 0 ? strlen($data) : strlen($data) + (4 - strlen($data) % 4), '=');
        return base64_decode(strtr($padded, '-_', '+/'));
    }
}
