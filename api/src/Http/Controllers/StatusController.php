<?php

namespace Okanelife\Http\Controllers;

use Okanelife\Support\Database;
use Okanelife\Support\Response;

final class StatusController
{
    public function show(): Response
    {
        $dbOk = true;
        try {
            Database::pdo()->query('SELECT 1');
        } catch (\Throwable $e) {
            error_log('status: db check failed: ' . $e->getMessage());
            $dbOk = false;
        }

        return Response::json([
            'status' => $dbOk ? 'ok' : 'degraded',
            'db' => $dbOk ? 'ok' : 'error',
            'time' => gmdate('c'),
        ], $dbOk ? 200 : 503);
    }
}
