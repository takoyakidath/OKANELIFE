<?php

namespace Okanelife\Http\Controllers;

use Okanelife\Domain\MilestoneRepository;
use Okanelife\Support\Request;
use Okanelife\Support\Response;

final class MilestoneController
{
    public function __construct(private MilestoneRepository $milestones = new MilestoneRepository())
    {
    }

    public function index(Request $request): Response
    {
        $rows = $this->milestones->listForUser($request->userId);
        return Response::json(array_map(fn ($m) => [
            'uuid' => $m['uuid'],
            'type' => $m['type'],
            'value' => $m['value'] === null ? null : (int) $m['value'],
            'achieved_at' => $m['achieved_at'],
            'seen' => (bool) $m['seen'],
        ], $rows));
    }
}
