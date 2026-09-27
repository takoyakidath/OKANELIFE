<?php

require __DIR__ . '/../bootstrap.php';

use Okanelife\Http\Kernel;
use Okanelife\Support\Request;

$response = (new Kernel())->handle(Request::fromGlobals());
$response->send();
