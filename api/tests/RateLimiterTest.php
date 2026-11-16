<?php

use Okanelife\Support\RateLimiter;

return [
    'RateLimiter allows up to the limit then rejects within a window' => function () {
        for ($i = 0; $i < 3; $i++) {
            assert_true(RateLimiter::allow('test:a', 3, 3600), "request {$i} should pass");
        }
        assert_true(!RateLimiter::allow('test:a', 3, 3600), 'fourth request should be rejected');
    },

    'RateLimiter keeps separate buckets per key' => function () {
        RateLimiter::allow('test:b1', 1, 3600);
        assert_true(!RateLimiter::allow('test:b1', 1, 3600));
        assert_true(RateLimiter::allow('test:b2', 1, 3600));
    },
];
