<?php

namespace Okanelife\Http\Controllers;

use Okanelife\Domain\ImportException;
use Okanelife\Domain\ImportService;
use Okanelife\Support\Request;
use Okanelife\Support\Response;
use Okanelife\Support\Validator;

final class ImportController
{
    public function __construct(private ImportService $service = new ImportService())
    {
    }

    public function preview(Request $request): Response
    {
        if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            return Response::error(400, 'ZIPファイルをアップロードしてください');
        }
        if ($_FILES['file']['size'] > 50 * 1024 * 1024) {
            return Response::error(413, 'ファイルサイズが大きすぎます');
        }

        try {
            $result = $this->service->preview($request->userId, $_FILES['file']['tmp_name']);
        } catch (ImportException $e) {
            return Response::error(422, $e->getMessage());
        }

        return Response::json($result);
    }

    public function store(Request $request): Response
    {
        $body = $request->json();
        $token = Validator::requireString($body, 'preview_token', 64);
        $policy = Validator::enum($body, 'policy', ['skip', 'overwrite'], 'skip');

        try {
            $result = $this->service->apply($request->userId, $token, $policy);
        } catch (ImportException $e) {
            return Response::error(422, $e->getMessage());
        }

        return Response::json($result);
    }
}
