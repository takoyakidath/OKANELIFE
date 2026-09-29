<?php

use Okanelife\Http\Controllers\StatusController;

return [
    'StatusController reports db ok when the database is reachable' => function () {
        $response = (new StatusController())->show();
        assert_equal(200, $response->status);
        $body = json_decode($response->body, true);
        assert_equal('ok', $body['status']);
        assert_equal('ok', $body['db']);
    },
];
