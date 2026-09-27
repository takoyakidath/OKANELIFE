<?php

namespace Okanelife\Http\Controllers;

use Okanelife\Domain\CompanyRepository;
use Okanelife\Support\Request;
use Okanelife\Support\Response;
use Okanelife\Support\Validator;

final class CompanyController
{
    public function __construct(private CompanyRepository $companies = new CompanyRepository())
    {
    }

    public function index(Request $request): Response
    {
        $recent = $request->queryParam('recent') === '1';
        $rows = $this->companies->listForUser($request->userId, $recent);
        return Response::json(array_map(fn ($c) => self::format($c), $rows));
    }

    public function store(Request $request): Response
    {
        $body = $request->json();
        $name = Validator::requireString($body, 'name', 255);
        $company = $this->companies->findOrCreateByName($request->userId, $name);
        if (array_key_exists('memo', $body)) {
            $this->companies->update((int) $company['id'], ['memo' => Validator::optionalString($body, 'memo', 1000)]);
            $company = $this->companies->findById((int) $company['id']);
        }
        return Response::json(self::format($this->companies->withStats($company)), 201);
    }

    public function show(Request $request): Response
    {
        $company = $this->companies->findByUuidForUser($request->param('uuid'), $request->userId);
        if ($company === null) {
            return Response::error(404, 'Not found');
        }
        return Response::json(self::format($this->companies->withStats($company)));
    }

    public function update(Request $request): Response
    {
        $company = $this->companies->findByUuidForUser($request->param('uuid'), $request->userId);
        if ($company === null) {
            return Response::error(404, 'Not found');
        }
        $body = $request->json();
        $fields = [];
        if (array_key_exists('name', $body)) {
            $fields['name'] = Validator::requireString($body, 'name', 255);
        }
        if (array_key_exists('memo', $body)) {
            $fields['memo'] = Validator::optionalString($body, 'memo', 1000);
        }
        $this->companies->update((int) $company['id'], $fields);
        return Response::json(self::format($this->companies->withStats($this->companies->findById((int) $company['id']))));
    }

    public function destroy(Request $request): Response
    {
        $company = $this->companies->findByUuidForUser($request->param('uuid'), $request->userId);
        if ($company === null) {
            return Response::error(404, 'Not found');
        }
        $this->companies->softDelete((int) $company['id']);
        return Response::noContent();
    }

    private static function format(array $company): array
    {
        return [
            'uuid' => $company['uuid'],
            'name' => $company['name'],
            'memo' => $company['memo'],
            'total_amount' => isset($company['total_amount']) ? (int) $company['total_amount'] : 0,
            'first_income_date' => $company['first_income_date'] ?? null,
            'last_income_date' => $company['last_income_date'] ?? null,
        ];
    }
}
