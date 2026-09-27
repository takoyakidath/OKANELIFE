<?php

declare(strict_types=1);

spl_autoload_register(function (string $class) {
    $prefix = 'Okanelife\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $path = __DIR__ . '/src/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($path)) {
        require $path;
    }
});

\Okanelife\Support\Env::load(__DIR__ . '/.env');

date_default_timezone_set('UTC');
