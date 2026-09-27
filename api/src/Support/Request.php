<?php

namespace Okanelife\Support;

final class Request
{
    public string $method;
    public string $path;
    /** @var array<string,string> */
    public array $query;
    /** @var array<string,string> */
    public array $params = [];
    public ?int $userId = null;
    public ?string $userUuid = null;
    private ?array $jsonCache = null;
    private string $rawBody;

    /** @var array<string,string> */
    private array $headers;

    public function __construct(string $method, string $path, array $query, array $headers, string $rawBody)
    {
        $this->method = strtoupper($method);
        $this->path = $path;
        $this->query = $query;
        $this->headers = array_change_key_case($headers, CASE_LOWER);
        $this->rawBody = $rawBody;
    }

    public static function fromGlobals(): self
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = rtrim((string) parse_url($uri, PHP_URL_PATH), '/');
        if ($path === '') {
            $path = '/';
        }
        // Strip a mounted base path (e.g. /api) so routes stay written as /v1/...
        $basePath = rtrim((string) Env::get('API_BASE_PATH', ''), '/');
        if ($basePath !== '' && str_starts_with($path, $basePath)) {
            $path = substr($path, strlen($basePath));
            if ($path === '') {
                $path = '/';
            }
        }

        parse_str((string) parse_url($uri, PHP_URL_QUERY), $query);

        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $name = str_replace('_', '-', substr($key, 5));
                $headers[$name] = $value;
            }
        }
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers['CONTENT-TYPE'] = $_SERVER['CONTENT_TYPE'];
        }

        $rawBody = file_get_contents('php://input') ?: '';

        return new self($method, $path, $query, $headers, $rawBody);
    }

    public function header(string $name, ?string $default = null): ?string
    {
        return $this->headers[strtolower($name)] ?? $default;
    }

    public function bearerToken(): ?string
    {
        $auth = $this->header('authorization');
        if ($auth !== null && str_starts_with($auth, 'Bearer ')) {
            return substr($auth, 7);
        }
        return null;
    }

    public function json(): array
    {
        if ($this->jsonCache !== null) {
            return $this->jsonCache;
        }
        if (trim($this->rawBody) === '') {
            return $this->jsonCache = [];
        }
        $decoded = json_decode($this->rawBody, true);
        return $this->jsonCache = is_array($decoded) ? $decoded : [];
    }

    public function rawBody(): string
    {
        return $this->rawBody;
    }

    public function queryParam(string $key, ?string $default = null): ?string
    {
        return $this->query[$key] ?? $default;
    }

    public function param(string $key): string
    {
        return $this->params[$key];
    }
}
