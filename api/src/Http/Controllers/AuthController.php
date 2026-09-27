<?php

namespace Okanelife\Http\Controllers;

use Okanelife\Domain\AuthException;
use Okanelife\Domain\AuthService;
use Okanelife\Support\RateLimiter;
use Okanelife\Support\Request;
use Okanelife\Support\Response;
use Okanelife\Support\Validator;

final class AuthController
{
    public function __construct(private AuthService $auth = new AuthService())
    {
    }

    public function googleLogin(Request $request): Response
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        if (!RateLimiter::allow("auth:login:{$ip}", 20, 300)) {
            return Response::error(429, 'しばらくしてから再度お試しください');
        }

        $idToken = Validator::requireString($request->json(), 'id_token', 4000);
        $result = $this->auth->loginWithGoogle($idToken);

        return Response::json([
            'access_token' => $result['access_token'],
            'refresh_token' => $result['refresh_token'],
            'is_new_user' => $result['is_new_user'],
            'user' => self::formatUser($result['user']),
        ]);
    }

    public function linkAccount(Request $request): Response
    {
        $idToken = Validator::requireString($request->json(), 'id_token', 4000);
        $this->auth->linkGoogleAccount($request->userId, $idToken);
        return Response::noContent();
    }

    public function listAccounts(Request $request): Response
    {
        $accounts = (new \Okanelife\Domain\AuthAccountRepository())->listForUser($request->userId);
        return Response::json(array_map(fn ($a) => [
            'id' => $a['uuid'],
            'provider' => $a['provider'],
            'email' => $a['email'],
            'created_at' => $a['created_at'],
        ], $accounts));
    }

    public function unlinkAccount(Request $request): Response
    {
        $this->auth->unlinkAccount($request->userId, $request->param('uuid'));
        return Response::noContent();
    }

    public function refresh(Request $request): Response
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        if (!RateLimiter::allow("auth:refresh:{$ip}", 60, 300)) {
            return Response::error(429, 'しばらくしてから再度お試しください');
        }

        $refreshToken = Validator::requireString($request->json(), 'refresh_token', 200);
        $result = $this->auth->refresh($refreshToken);

        return Response::json([
            'access_token' => $result['access_token'],
            'refresh_token' => $result['refresh_token'],
            'user' => self::formatUser($result['user']),
        ]);
    }

    public function logout(Request $request): Response
    {
        $refreshToken = Validator::optionalString($request->json(), 'refresh_token', 200);
        if ($refreshToken !== null) {
            $this->auth->logout($refreshToken);
        }
        return Response::noContent();
    }

    public static function formatUser(array $user): array
    {
        return [
            'uuid' => $user['uuid'],
            'name' => $user['name'],
            'email' => $user['email'],
        ];
    }
}
