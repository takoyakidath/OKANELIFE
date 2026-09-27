<?php

namespace Okanelife\Http\Controllers;

use Okanelife\Domain\TimelineService;
use Okanelife\Support\Request;
use Okanelife\Support\Response;

final class TimelineController
{
    public function __construct(private TimelineService $service = new TimelineService())
    {
    }

    public function index(Request $request): Response
    {
        return Response::json($this->service->forUser($request->userId, $request->queryParam('cursor')));
    }
}
