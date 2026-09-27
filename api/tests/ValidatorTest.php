<?php

use Okanelife\Support\ValidationException;
use Okanelife\Support\Validator;

return [
    'Validator::date accepts a valid ISO date' => function () {
        assert_equal('2024-02-29', Validator::date(['d' => '2024-02-29'], 'd'));
    },

    'Validator::date rejects an invalid calendar date' => function () {
        try {
            Validator::date(['d' => '2023-02-29'], 'd');
            throw new RuntimeException('expected ValidationException');
        } catch (ValidationException) {
            // expected
        }
    },

    'Validator::enum rejects a value outside the allow-list' => function () {
        try {
            Validator::enum(['p' => 'bogus'], 'p', ['exact', 'estimated', 'unknown']);
            throw new RuntimeException('expected ValidationException');
        } catch (ValidationException) {
            // expected
        }
    },

    'Validator::optionalInt returns null when absent' => function () {
        assert_null(Validator::optionalInt([], 'amount'));
    },
];
