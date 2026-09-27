<?php

use Okanelife\Support\Router;

return [
    'Router matches a parameterized path' => function () {
        $router = new Router();
        $router->get('/v1/incomes/{uuid}', fn () => 'matched');
        [$handler, $params] = $router->match('GET', '/v1/incomes/abc-123');
        assert_equal('matched', $handler());
        assert_equal('abc-123', $params['uuid']);
    },

    'Router reports method-not-allowed when only the path matches' => function () {
        $router = new Router();
        $router->get('/v1/incomes', fn () => 'ok');
        [$handler] = $router->match('POST', '/v1/incomes');
        assert_equal('__method_not_allowed__', $handler);
    },

    'Router returns null for an unmatched path' => function () {
        $router = new Router();
        $router->get('/v1/incomes', fn () => 'ok');
        assert_null($router->match('GET', '/v1/nope'));
    },
];
