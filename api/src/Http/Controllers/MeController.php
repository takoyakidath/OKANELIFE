<?php

namespace Okanelife\Http\Controllers;

use Okanelife\Domain\RefreshTokenRepository;
use Okanelife\Domain\UserRepository;
use Okanelife\Support\Request;
use Okanelife\Support\Response;
use Okanelife\Support\Validator;

final class MeController
{
    public function __construct(private UserRepository $users = new UserRepository())
    {
    }

    public function show(Request $request): Response
    {
        $user = $this->users->findById($request->userId);
        return Response::json(self::format($user));
    }

    public function update(Request $request): Response
    {
        $body = $request->json();
        $fields = [];

        if (array_key_exists('birth_date', $body)) {
            $fields['birth_date'] = $body['birth_date'] === null
                ? null
                : Validator::date($body, 'birth_date');
        }
        if (array_key_exists('onboarding_completed', $body) && $body['onboarding_completed'] === true) {
            $fields['onboarding_completed_at'] = \Okanelife\Support\Database::now();
        }
        if (array_key_exists('history_start_choice', $body)) {
            $fields['history_start_choice'] = Validator::optionalString($body, 'history_start_choice', 32);
        }
        if (array_key_exists('name', $body)) {
            $fields['name'] = Validator::optionalString($body, 'name', 255);
        }

        $this->users->update($request->userId, $fields);
        return Response::json(self::format($this->users->findById($request->userId)));
    }

    public function destroy(Request $request): Response
    {
        $this->users->softDelete($request->userId);
        (new RefreshTokenRepository())->revokeAllForUser($request->userId);
        return Response::noContent();
    }

    private static function format(array $user): array
    {
        return [
            'uuid' => $user['uuid'],
            'name' => $user['name'],
            'email' => $user['email'],
            'birth_date' => $user['birth_date'],
            'onboarding_completed_at' => $user['onboarding_completed_at'],
        ];
    }
}
