<?php

namespace Okanelife\Http\Controllers;

use Okanelife\Domain\IncomeSourceRepository;
use Okanelife\Support\Request;
use Okanelife\Support\Response;
use Okanelife\Support\Validator;

final class SourceController
{
    public function __construct(private IncomeSourceRepository $sources = new IncomeSourceRepository())
    {
    }

    public function index(Request $request): Response
    {
        $rows = $this->sources->listForUser($request->userId);
        return Response::json(array_map(fn ($s) => self::format($s), $rows));
    }

    public function store(Request $request): Response
    {
        $body = $request->json();
        $name = Validator::requireString($body, 'name', 100);
        $category = Validator::enum($body, 'category', IncomeSourceRepository::categories(), 'other');
        $source = $this->sources->create($request->userId, $name, $category);
        return Response::json(self::format($source), 201);
    }

    private static function format(array $source): array
    {
        return [
            'uuid' => $source['uuid'],
            'name' => $source['name'],
            'category' => $source['category'],
            'is_system' => (bool) $source['is_system'],
        ];
    }
}
