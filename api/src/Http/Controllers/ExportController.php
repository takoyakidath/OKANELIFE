<?php

namespace Okanelife\Http\Controllers;

use Okanelife\Domain\ExportJobRepository;
use Okanelife\Domain\ExportService;
use Okanelife\Support\RateLimiter;
use Okanelife\Support\Request;
use Okanelife\Support\Response;

final class ExportController
{
    public function __construct(private ExportJobRepository $jobs = new ExportJobRepository())
    {
    }

    public function store(Request $request): Response
    {
        if (!RateLimiter::allow("export:create:{$request->userId}", 10, 3600)) {
            return Response::error(429, 'エクスポートの作成が多すぎます。しばらくしてからお試しください。');
        }

        $job = $this->jobs->create($request->userId, 'manual');
        return Response::json(self::format($job), 201);
    }

    public function index(Request $request): Response
    {
        $jobs = $this->jobs->listForUser($request->userId);
        return Response::json(array_map(fn ($j) => self::format($j), $jobs));
    }

    public function show(Request $request): Response
    {
        $job = $this->jobs->findByUuidForUser($request->param('uuid'), $request->userId);
        if ($job === null) {
            return Response::error(404, 'Not found');
        }
        return Response::json(self::format($job));
    }

    public function download(Request $request): Response
    {
        $job = $this->jobs->findByUuidForUser($request->param('uuid'), $request->userId);
        if ($job === null || $job['status'] !== 'completed' || $job['file_path'] === null) {
            return Response::error(404, 'ファイルが見つかりません');
        }

        $token = $request->queryParam('token', '');
        if (!hash_equals((string) $job['download_token'], $token)) {
            return Response::error(403, 'アクセスできません');
        }
        if ($job['expires_at'] !== null && $job['expires_at'] < \Okanelife\Support\Database::now()) {
            return Response::error(410, 'このダウンロードリンクは期限切れです。もう一度エクスポートしてください。');
        }
        if (!is_file($job['file_path'])) {
            return Response::error(404, 'ファイルが見つかりません');
        }

        $filename = 'okanelife-export-' . substr($job['created_at'], 0, 10) . '.zip';
        return Response::file($job['file_path'], $filename);
    }

    private static function format(array $job): array
    {
        $downloadUrl = null;
        if ($job['status'] === 'completed' && $job['download_token'] !== null) {
            $downloadUrl = "/api/v1/exports/{$job['uuid']}/download?token={$job['download_token']}";
        }
        return [
            'uuid' => $job['uuid'],
            'status' => $job['status'],
            'created_at' => $job['created_at'],
            'completed_at' => $job['completed_at'],
            'download_url' => $downloadUrl,
        ];
    }
}
