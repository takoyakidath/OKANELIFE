<?php

use Okanelife\Domain\AuthAccountRepository;
use Okanelife\Domain\AuthException;
use Okanelife\Domain\AuthService;
use Okanelife\Domain\RefreshTokenRepository;
use Okanelife\Support\Env;
use Okanelife\Support\Jwt;

return [
    'AuthService::resolveAccessToken finds the user encoded in a valid token' => function () {
        $user = test_create_user();
        $token = Jwt::encode(['sub' => $user['uuid'], 'typ' => 'access'], Env::required('JWT_SECRET'), 900);

        $resolved = (new AuthService())->resolveAccessToken($token);
        assert_equal($user['uuid'], $resolved['uuid'] ?? null);
    },

    'AuthService::resolveAccessToken rejects a non-access token' => function () {
        $user = test_create_user();
        $token = Jwt::encode(['sub' => $user['uuid'], 'typ' => 'refresh'], Env::required('JWT_SECRET'), 900);
        assert_null((new AuthService())->resolveAccessToken($token));
    },

    'AuthService::refresh rotates the refresh token and revokes the old one' => function () {
        $user = test_create_user();
        $plainToken = (new RefreshTokenRepository())->issue((int) $user['id'], 180);

        $result = (new AuthService())->refresh($plainToken);
        assert_equal($user['uuid'], $result['user']['uuid']);
        assert_true($result['refresh_token'] !== $plainToken);

        try {
            (new AuthService())->refresh($plainToken);
            throw new RuntimeException('expected AuthException for a reused refresh token');
        } catch (AuthException) {
            // expected: rotation revokes the old token
        }
    },

    'Reusing an already-rotated refresh token revokes the whole session family' => function () {
        $user = test_create_user();
        $repo = new RefreshTokenRepository();
        $tokenA = $repo->issue((int) $user['id'], 180);
        $tokenB = $repo->issue((int) $user['id'], 180);

        // Rotate tokenA away (as a normal refresh would).
        $result = (new AuthService())->refresh($tokenA);
        assert_true($result['refresh_token'] !== $tokenA);

        // Replaying the now-revoked tokenA should also kill tokenB.
        try {
            (new AuthService())->refresh($tokenA);
            throw new RuntimeException('expected AuthException');
        } catch (AuthException) {
            // expected
        }

        try {
            (new AuthService())->refresh($tokenB);
            throw new RuntimeException('expected tokenB to have been revoked too');
        } catch (AuthException) {
            // expected: the whole family was cut off
        }
    },

    'AuthService::unlinkAccount refuses to remove the last login method' => function () {
        $user = test_create_user();
        (new AuthAccountRepository())->create((int) $user['id'], 'google', 'sub-1', 'a@example.com');

        $accounts = (new AuthAccountRepository())->listForUser((int) $user['id']);
        try {
            (new AuthService())->unlinkAccount((int) $user['id'], $accounts[0]['uuid']);
            throw new RuntimeException('expected AuthException');
        } catch (AuthException $e) {
            assert_equal(422, $e->status);
        }
    },

    'AuthService::unlinkAccount succeeds when another login method remains' => function () {
        $user = test_create_user();
        $accountRepo = new AuthAccountRepository();
        $accountRepo->create((int) $user['id'], 'google', 'sub-1', 'a@example.com');
        $second = $accountRepo->create((int) $user['id'], 'google', 'sub-2', 'b@example.com');

        (new AuthService())->unlinkAccount((int) $user['id'], $second['uuid']);
        assert_equal(1, $accountRepo->countForUser((int) $user['id']));
    },
];
