<?php

function assert_true(bool $condition, string $message = 'expected true'): void
{
    if (!$condition) {
        throw new \RuntimeException($message);
    }
}

function assert_equal(mixed $expected, mixed $actual, string $message = ''): void
{
    if ($expected !== $actual) {
        $expectedStr = var_export($expected, true);
        $actualStr = var_export($actual, true);
        throw new \RuntimeException("{$message} — expected {$expectedStr}, got {$actualStr}");
    }
}

function assert_null(mixed $value, string $message = 'expected null'): void
{
    if ($value !== null) {
        throw new \RuntimeException($message);
    }
}

function test_create_user(): array
{
    return (new \Okanelife\Domain\UserRepository())->create('テスト太郎', 'test@example.com');
}
