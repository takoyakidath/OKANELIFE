<?php

namespace Okanelife\Support;

final class ValidationException extends \RuntimeException
{
}

final class Validator
{
    public static function fail(string $message): never
    {
        throw new ValidationException($message);
    }

    public static function requireString(array $data, string $key, int $maxLength = 500): string
    {
        $value = $data[$key] ?? null;
        if (!is_string($value) || trim($value) === '') {
            self::fail("{$key} is required");
        }
        if (mb_strlen($value) > $maxLength) {
            self::fail("{$key} is too long");
        }
        return $value;
    }

    public static function optionalString(array $data, string $key, int $maxLength = 1000): ?string
    {
        $value = $data[$key] ?? null;
        if ($value === null) {
            return null;
        }
        if (!is_string($value)) {
            self::fail("{$key} must be a string");
        }
        if (mb_strlen($value) > $maxLength) {
            self::fail("{$key} is too long");
        }
        $trimmed = trim($value);
        return $trimmed === '' ? null : $trimmed;
    }

    public static function optionalInt(array $data, string $key, int $min = PHP_INT_MIN, int $max = PHP_INT_MAX): ?int
    {
        $value = $data[$key] ?? null;
        if ($value === null) {
            return null;
        }
        if (!is_int($value) && !is_float($value) && !is_numeric($value)) {
            self::fail("{$key} must be a number");
        }
        $intValue = (int) $value;
        if ($intValue < $min || $intValue > $max) {
            self::fail("{$key} is out of range");
        }
        return $intValue;
    }

    public static function enum(array $data, string $key, array $allowed, ?string $default = null): string
    {
        $value = $data[$key] ?? $default;
        if (!is_string($value) || !in_array($value, $allowed, true)) {
            self::fail("{$key} must be one of: " . implode(', ', $allowed));
        }
        return $value;
    }

    public static function date(array $data, string $key): string
    {
        $value = self::requireString($data, $key, 20);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            self::fail("{$key} must be an ISO date (YYYY-MM-DD)");
        }
        [$y, $m, $d] = array_map('intval', explode('-', $value));
        if (!checkdate($m, $d, $y)) {
            self::fail("{$key} is not a valid date");
        }
        return $value;
    }
}
