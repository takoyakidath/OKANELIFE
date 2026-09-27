<?php

namespace Okanelife\Http\Controllers;

use Okanelife\Domain\StatsService;
use Okanelife\Domain\UserRepository;
use Okanelife\Support\Request;
use Okanelife\Support\Response;

final class StatsController
{
    public function __construct(private StatsService $stats = new StatsService())
    {
    }

    public function summary(Request $request): Response
    {
        return Response::json($this->stats->summary($request->userId));
    }

    public function monthly(Request $request): Response
    {
        $year = (int) ($request->queryParam('year') ?? gmdate('Y'));
        return Response::json($this->stats->monthly($request->userId, $year));
    }

    public function yearly(Request $request): Response
    {
        return Response::json($this->stats->yearly($request->userId));
    }

    public function bySource(Request $request): Response
    {
        return Response::json($this->stats->bySource($request->userId));
    }

    public function byCompany(Request $request): Response
    {
        return Response::json($this->stats->byCompany($request->userId));
    }

    public function byAge(Request $request): Response
    {
        $user = (new UserRepository())->findById($request->userId);
        if (empty($user['birth_date'])) {
            return Response::json([]);
        }
        return Response::json($this->stats->byAge($request->userId, $user['birth_date']));
    }

    public function simulation(Request $request): Response
    {
        return Response::json($this->stats->simulation($request->userId));
    }

    public function compareYears(Request $request): Response
    {
        $a = (int) ($request->queryParam('a') ?? gmdate('Y') - 1);
        $b = (int) ($request->queryParam('b') ?? gmdate('Y'));
        return Response::json($this->stats->compareYears($request->userId, $a, $b));
    }
}
