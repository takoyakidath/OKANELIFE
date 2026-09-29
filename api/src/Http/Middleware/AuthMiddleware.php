<?php

namespace Okanelife\Http\Middleware;

use Okanelife\Domain\AuthService;
use Okanelife\Support\Request;

final class AuthException extends \RuntimeException
{
}

final class AuthMiddleware
{
    public static function wrap(callable $handler): callable
    {
        return function (Request $request) use ($handler) {
            $token = $request->bearerToken();
            if ($token === null) {
                throw new AuthException('no bearer token');
            }
            $user = (new AuthService())->resolveAccessToken($token);
            if ($user === null) {
                throw new AuthException('unauthenticated');
            }
            $request->userId = (int) $user['id'];
            $request->userUuid = $user['uuid'];
            return $handler($request);
        };
    }
}
