<?php

namespace Okanelife\Http\Controllers;

use Okanelife\Domain\CompanyRepository;
use Okanelife\Domain\IncomeRepository;
use Okanelife\Domain\IncomeSourceRepository;
use Okanelife\Domain\MilestoneService;
use Okanelife\Support\Request;
use Okanelife\Support\Response;
use Okanelife\Support\Validator;

final class IncomeController
{
    public function __construct(
        private IncomeRepository $incomes = new IncomeRepository(),
        private CompanyRepository $companies = new CompanyRepository(),
        private IncomeSourceRepository $sources = new IncomeSourceRepository(),
    ) {
    }

    public function index(Request $request): Response
    {
        $filters = [];
        if ($companyUuid = $request->queryParam('company')) {
            $company = $this->companies->findByUuidForUser($companyUuid, $request->userId);
            if ($company !== null) {
                $filters['company_id'] = $company['id'];
            }
        }
        if ($sourceUuid = $request->queryParam('source')) {
            $source = $this->sources->findByUuidForUser($sourceUuid, $request->userId);
            if ($source !== null) {
                $filters['source_id'] = $source['id'];
            }
        }
        if ($year = $request->queryParam('year')) {
            $filters['year'] = (int) $year;
        }
        if ($limit = $request->queryParam('limit')) {
            $filters['limit'] = min((int) $limit, 100);
        }

        $result = $this->incomes->listForUser($request->userId, $filters, $request->queryParam('cursor'));
        return Response::json([
            'items' => array_map(fn ($row) => $this->hydrate($row), $result['items']),
            'next_cursor' => $result['next_cursor'],
        ]);
    }

    public function store(Request $request): Response
    {
        $body = $request->json();
        $fields = $this->parseFields($request->userId, $body);
        $income = $this->incomes->create($request->userId, $fields);
        (new MilestoneService())->evaluateForUser($request->userId);
        return Response::json($this->hydrate($income), 201);
    }

    public function show(Request $request): Response
    {
        $income = $this->incomes->findByUuidForUser($request->param('uuid'), $request->userId);
        if ($income === null) {
            return Response::error(404, 'Not found');
        }
        return Response::json($this->hydrate($income));
    }

    public function update(Request $request): Response
    {
        $income = $this->incomes->findByUuidForUser($request->param('uuid'), $request->userId);
        if ($income === null) {
            return Response::error(404, 'Not found');
        }

        $body = $request->json();
        $fields = [];
        if (array_key_exists('amount_precision', $body)) {
            $fields['amount_precision'] = Validator::enum($body, 'amount_precision', ['exact', 'estimated', 'unknown']);
        }
        if (array_key_exists('amount', $body)) {
            $fields['amount'] = $body['amount'] === null ? null : Validator::optionalInt($body, 'amount', 0);
        }
        if (array_key_exists('income_date', $body)) {
            $fields['income_date'] = Validator::date($body, 'income_date');
        }
        if (array_key_exists('date_precision', $body)) {
            $fields['date_precision'] = Validator::enum($body, 'date_precision', ['day', 'month', 'year', 'unknown']);
        }
        if (array_key_exists('memo', $body)) {
            $fields['memo'] = Validator::optionalString($body, 'memo', 1000);
        }
        if (array_key_exists('source_uuid', $body)) {
            $fields['source_id'] = $this->resolveSourceId($request->userId, $body['source_uuid']);
        }
        if (array_key_exists('company_name', $body)) {
            $fields['company_id'] = $this->resolveCompanyId($request->userId, $body['company_name']);
        }

        $this->incomes->update((int) $income['id'], $fields);
        (new MilestoneService())->evaluateForUser($request->userId);
        return Response::json($this->hydrate($this->incomes->findById((int) $income['id'])));
    }

    public function destroy(Request $request): Response
    {
        $income = $this->incomes->findByUuidForUser($request->param('uuid'), $request->userId);
        if ($income === null) {
            return Response::error(404, 'Not found');
        }
        $this->incomes->softDelete((int) $income['id']);
        return Response::noContent();
    }

    private function parseFields(int $userId, array $body): array
    {
        $amountPrecision = Validator::enum($body, 'amount_precision', ['exact', 'estimated', 'unknown'], 'exact');
        $amount = null;
        if ($amountPrecision !== 'unknown') {
            $amount = Validator::optionalInt($body, 'amount', 0) ?? Validator::fail('amount is required');
        }

        return [
            'amount' => $amount,
            'amount_precision' => $amountPrecision,
            'currency' => 'JPY',
            'income_date' => Validator::date($body, 'income_date'),
            'date_precision' => Validator::enum($body, 'date_precision', ['day', 'month', 'year', 'unknown'], 'day'),
            'source_id' => $this->resolveSourceId($userId, $body['source_uuid'] ?? null),
            'company_id' => $this->resolveCompanyId($userId, $body['company_name'] ?? null),
            'memo' => Validator::optionalString($body, 'memo', 1000),
        ];
    }

    private function resolveSourceId(int $userId, ?string $sourceUuid): ?int
    {
        if ($sourceUuid === null) {
            return $this->sources->defaultSystemSourceId();
        }
        $source = $this->sources->findByUuidForUser($sourceUuid, $userId);
        return $source !== null ? (int) $source['id'] : $this->sources->defaultSystemSourceId();
    }

    private function resolveCompanyId(int $userId, ?string $companyName): ?int
    {
        if ($companyName === null || trim($companyName) === '') {
            return null;
        }
        $company = $this->companies->findOrCreateByName($userId, trim($companyName));
        return (int) $company['id'];
    }

    private function hydrate(array $income): array
    {
        $source = $income['source_id'] ? $this->sources->findById((int) $income['source_id']) : null;
        $company = $income['company_id'] ? $this->companies->findById((int) $income['company_id']) : null;

        return [
            'uuid' => $income['uuid'],
            'amount' => $income['amount'] === null ? null : (int) $income['amount'],
            'amount_precision' => $income['amount_precision'],
            'currency' => $income['currency'],
            'income_date' => $income['income_date'],
            'date_precision' => $income['date_precision'],
            'memo' => $income['memo'],
            'created_at' => $income['created_at'],
            'source' => $source ? [
                'uuid' => $source['uuid'],
                'name' => $source['name'],
                'category' => $source['category'],
                'is_system' => (bool) $source['is_system'],
            ] : null,
            'company' => $company ? [
                'uuid' => $company['uuid'],
                'name' => $company['name'],
                'memo' => $company['memo'],
            ] : null,
        ];
    }
}
