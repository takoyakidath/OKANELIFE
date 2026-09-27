<?php

namespace Okanelife\Http\Controllers;

use Okanelife\Domain\CompanyRepository;
use Okanelife\Domain\EventRepository;
use Okanelife\Domain\IncomeRepository;
use Okanelife\Support\Request;
use Okanelife\Support\Response;
use Okanelife\Support\Validator;

final class EventController
{
    public function __construct(
        private EventRepository $events = new EventRepository(),
        private IncomeRepository $incomes = new IncomeRepository(),
        private CompanyRepository $companies = new CompanyRepository(),
    ) {
    }

    public function index(Request $request): Response
    {
        $year = $request->queryParam('year') ? (int) $request->queryParam('year') : null;
        $rows = $this->events->listForUser($request->userId, $year);
        return Response::json(array_map(fn ($e) => $this->hydrate($e), $rows));
    }

    public function store(Request $request): Response
    {
        $body = $request->json();
        $incomeId = null;
        if (!empty($body['income_uuid'])) {
            $income = $this->incomes->findByUuidForUser($body['income_uuid'], $request->userId);
            $incomeId = $income ? (int) $income['id'] : null;
        }
        $companyId = null;
        if (!empty($body['company_uuid'])) {
            $company = $this->companies->findByUuidForUser($body['company_uuid'], $request->userId);
            $companyId = $company ? (int) $company['id'] : null;
        }

        $event = $this->events->create($request->userId, [
            'title' => Validator::requireString($body, 'title', 255),
            'description' => Validator::optionalString($body, 'description', 2000),
            'event_date' => Validator::date($body, 'event_date'),
            'income_id' => $incomeId,
            'company_id' => $companyId,
        ]);
        return Response::json($this->hydrate($event), 201);
    }

    public function update(Request $request): Response
    {
        $event = $this->events->findByUuidForUser($request->param('uuid'), $request->userId);
        if ($event === null) {
            return Response::error(404, 'Not found');
        }
        $body = $request->json();
        $fields = [];
        if (array_key_exists('title', $body)) {
            $fields['title'] = Validator::requireString($body, 'title', 255);
        }
        if (array_key_exists('description', $body)) {
            $fields['description'] = Validator::optionalString($body, 'description', 2000);
        }
        if (array_key_exists('event_date', $body)) {
            $fields['event_date'] = Validator::date($body, 'event_date');
        }
        $this->events->update((int) $event['id'], $fields);
        return Response::json($this->hydrate($this->events->findById((int) $event['id'])));
    }

    public function destroy(Request $request): Response
    {
        $event = $this->events->findByUuidForUser($request->param('uuid'), $request->userId);
        if ($event === null) {
            return Response::error(404, 'Not found');
        }
        $this->events->softDelete((int) $event['id']);
        return Response::noContent();
    }

    private function hydrate(array $event): array
    {
        $income = $event['income_id'] ? $this->incomes->findById((int) $event['income_id']) : null;
        $company = $event['company_id'] ? $this->companies->findById((int) $event['company_id']) : null;

        return [
            'uuid' => $event['uuid'],
            'title' => $event['title'],
            'description' => $event['description'],
            'event_date' => $event['event_date'],
            'income' => $income ? ['uuid' => $income['uuid'], 'amount' => $income['amount']] : null,
            'company' => $company ? ['uuid' => $company['uuid'], 'name' => $company['name']] : null,
        ];
    }
}
