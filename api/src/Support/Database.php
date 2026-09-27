<?php

namespace Okanelife\Support;

final class Database
{
    private static ?\PDO $pdo = null;
    private static string $driver = 'mysql';

    public static function pdo(): \PDO
    {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $driver = Env::get('DB_DRIVER', 'mysql');
        self::$driver = $driver;

        if ($driver === 'sqlite') {
            $path = Env::get('DB_PATH', ':memory:');
            $pdo = new \PDO("sqlite:{$path}");
            $pdo->exec('PRAGMA foreign_keys = ON');
        } else {
            $host = Env::required('DB_HOST');
            $name = Env::required('DB_NAME');
            $port = Env::get('DB_PORT', '3306');
            $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
            $pdo = new \PDO($dsn, Env::required('DB_USER'), Env::required('DB_PASS'), [
                \PDO::ATTR_PERSISTENT => false,
            ]);
        }

        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(\PDO::ATTR_DEFAULT_FETCH_MODE, \PDO::FETCH_ASSOC);
        self::$pdo = $pdo;
        return $pdo;
    }

    public static function driver(): string
    {
        return self::$driver;
    }

    /** Allows the test runner to swap in a fresh in-memory SQLite handle. */
    public static function setPdo(\PDO $pdo, string $driver = 'sqlite'): void
    {
        self::$pdo = $pdo;
        self::$driver = $driver;
    }

    public static function now(): string
    {
        return gmdate('Y-m-d H:i:s');
    }
}
