<?php

namespace Okanelife\Http\Controllers;

use Okanelife\Domain\RetrospectiveService;
use Okanelife\Support\Request;
use Okanelife\Support\Response;

final class RetrospectiveController
{
    public function __construct(private RetrospectiveService $service = new RetrospectiveService())
    {
    }

    public function show(Request $request): Response
    {
        $year = (int) $request->param('year');
        return Response::json($this->service->forYear($request->userId, $year));
    }
}
