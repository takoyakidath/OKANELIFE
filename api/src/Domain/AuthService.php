<?php

namespace Okanelife\Domain;

use Okanelife\Support\Env;
use Okanelife\Support\GoogleIdTokenVerifier;
use Okanelife\Support\Jwt;

final class AuthException extends \RuntimeException
{
    public function __construct(string $message, public int $status = 401)
    {
        parent::__construct($message);
    }
}

final class AuthService
{
    private const ACCESS_TOKEN_TTL_SECONDS = 900; // 15 minutes
    private const REFRESH_TOKEN_TTL_DAYS = 180;

    public function __construct(
        private UserRepository $users = new UserRepository(),
        private AuthAccountRepository $authAccounts = new AuthAccountRepository(),
        private RefreshTokenRepository $refreshTokens = new RefreshTokenRepository(),
    ) {
    }

    /** @return array{user:array,is_new_user:bool,access_token:string,refresh_token:string} */
    public function loginWithGoogle(string $idToken): array
    {
        $payload = GoogleIdTokenVerifier::verify($idToken, Env::required('GOOGLE_CLIENT_ID'));
        if ($payload === null) {
            throw new AuthException('Google のログイン情報を確認できませんでした');
        }

        $googleSub = (string) $payload['sub'];
        $email = $payload['email'] ?? null;
        $name = $payload['name'] ?? null;

        $existing = $this->authAccounts->findByProviderAccountId('google', $googleSub);
        $isNewUser = false;

        if ($existing !== null) {
            $user = $this->users->findById((int) $existing['user_id']);
        } else {
            $user = $this->users->create($name, $email);
            $this->authAccounts->create((int) $user['id'], 'google', $googleSub, $email);
            $isNewUser = true;
        }

        return [
            'user' => $user,
            'is_new_user' => $isNewUser,
            'access_token' => $this->issueAccessToken($user['uuid']),
            'refresh_token' => $this->refreshTokens->issue((int) $user['id'], self::REFRESH_TOKEN_TTL_DAYS),
        ];
    }

    public function linkGoogleAccount(int $userId, string $idToken): void
    {
        $payload = GoogleIdTokenVerifier::verify($idToken, Env::required('GOOGLE_CLIENT_ID'));
        if ($payload === null) {
            throw new AuthException('Google のログイン情報を確認できませんでした');
        }

        $googleSub = (string) $payload['sub'];
        $existing = $this->authAccounts->findByProviderAccountId('google', $googleSub);
        if ($existing !== null) {
            if ((int) $existing['user_id'] !== $userId) {
                throw new AuthException('このGoogleアカウントは別のOKANELIFEユーザーに接続されています', 409);
            }
            return; // already linked to this same user, nothing to do
        }

        $this->authAccounts->create($userId, 'google', $googleSub, $payload['email'] ?? null);
    }

    public function unlinkAccount(int $userId, string $accountUuid): void
    {
        if ($this->authAccounts->countForUser($userId) <= 1) {
            throw new AuthException('最後のログイン方法は解除できません', 422);
        }
        $account = $this->authAccounts->findByUuidForUser($accountUuid, $userId);
        if ($account === null) {
            throw new AuthException('アカウントが見つかりません', 404);
        }
        $this->authAccounts->delete((int) $account['id']);
    }

    /** @return array{user:array,access_token:string,refresh_token:string} */
    public function refresh(string $plainRefreshToken): array
    {
        $stored = $this->refreshTokens->findValidByPlainToken($plainRefreshToken);
        if ($stored === null) {
            // A token that was already explicitly revoked (as opposed to
            // merely expired) means someone replayed a refresh token that
            // was already rotated away — a signal it was stolen. Cut off
            // every session for this user, not just this one request. A
            // naturally expired-but-never-used token is not suspicious on
            // its own, so it doesn't trigger this.
            $existing = $this->refreshTokens->findByPlainTokenIncludingRevoked($plainRefreshToken);
            if ($existing !== null && $existing['revoked_at'] !== null) {
                $this->refreshTokens->revokeAllForUser((int) $existing['user_id']);
            }
            throw new AuthException('セッションの有効期限が切れました');
        }

        $user = $this->users->findById((int) $stored['user_id']);
        if ($user === null) {
            throw new AuthException('ユーザーが見つかりません');
        }

        // Rotate: issue a new refresh token and revoke the old one, so a
        // stolen (and reused) refresh token is detectable and cut off.
        $this->refreshTokens->revoke((int) $stored['id']);
        $newRefreshToken = $this->refreshTokens->issue((int) $user['id'], self::REFRESH_TOKEN_TTL_DAYS);

        return [
            'user' => $user,
            'access_token' => $this->issueAccessToken($user['uuid']),
            'refresh_token' => $newRefreshToken,
        ];
    }

    public function logout(string $plainRefreshToken): void
    {
        $this->refreshTokens->revokeByPlainToken($plainRefreshToken);
    }

    public function resolveAccessToken(string $accessToken): ?array
    {
        $payload = Jwt::decode($accessToken, Env::required('JWT_SECRET'));
        if ($payload === null || ($payload['typ'] ?? null) !== 'access' || empty($payload['sub'])) {
            return null;
        }
        return $this->users->findByUuid((string) $payload['sub']);
    }

    private function issueAccessToken(string $userUuid): string
    {
        return Jwt::encode(
            ['sub' => $userUuid, 'typ' => 'access'],
            Env::required('JWT_SECRET'),
            self::ACCESS_TOKEN_TTL_SECONDS
        );
    }
}
