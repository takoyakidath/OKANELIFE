<?php

require __DIR__ . '/../bootstrap.php';

use Okanelife\Support\Migrator;

try {
    $ran = Migrator::run();
} catch (\RuntimeException $e) {
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
}

foreach ($ran as $filename) {
    echo "Applied {$filename}\n";
}
echo $ran ? "Migrations complete.\n" : "Already up to date.\n";
