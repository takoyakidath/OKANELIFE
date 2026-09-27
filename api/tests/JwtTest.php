<?php

use Okanelife\Support\Jwt;

return [
    'Jwt encode/decode round-trips a payload' => function () {
        $token = Jwt::encode(['sub' => 'abc-123', 'typ' => 'access'], 'secret', 60);
        $payload = Jwt::decode($token, 'secret');
        assert_equal('abc-123', $payload['sub'] ?? null);
        assert_equal('access', $payload['typ'] ?? null);
    },

    'Jwt decode rejects a tampered signature' => function () {
        $token = Jwt::encode(['sub' => 'abc-123'], 'secret', 60);
        $tampered = substr($token, 0, -2) . 'xx';
        assert_null(Jwt::decode($tampered, 'secret'));
    },

    'Jwt decode rejects the wrong secret' => function () {
        $token = Jwt::encode(['sub' => 'abc-123'], 'secret-a', 60);
        assert_null(Jwt::decode($token, 'secret-b'));
    },

    'Jwt decode rejects an expired token' => function () {
        $token = Jwt::encode(['sub' => 'abc-123'], 'secret', -1);
        assert_null(Jwt::decode($token, 'secret'));
    },
];
