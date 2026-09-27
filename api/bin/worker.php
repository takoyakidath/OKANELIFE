<?php

/**
 * Intended to run from Lolipop's cron feature every 1–5 minutes:
 *   php /path/to/api/bin/worker.php
 *
 * Lolipop shared hosting has no persistent background worker process, so
 * export jobs (product.txt §19, docs/DESIGN.md §9) are processed here
 * instead of truly asynchronously in-request.
 */

require __DIR__ . '/../bootstrap.php';

use Okanelife\Domain\ExportService;

$count = (new ExportService())->processPendingJobs();
echo "Processed {$count} export job(s)\n";
