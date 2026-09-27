<?php

namespace Okanelife\Support;

final class Response
{
    public int $status;
    /** @var array<string,string> */
    public array $headers;
    public string $body;
    /** @var resource|null */
    public $stream = null;

    private function __construct(int $status, array $headers, string $body)
    {
        $this->status = $status;
        $this->headers = $headers;
        $this->body = $body;
    }

    public static function json(mixed $data, int $status = 200): self
    {
        return new self($status, ['Content-Type' => 'application/json; charset=utf-8'], json_encode(
            $data,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
        ));
    }

    public static function noContent(): self
    {
        return new self(204, [], '');
    }

    public static function error(int $status, string $message, ?string $code = null): self
    {
        $payload = ['message' => $message];
        if ($code !== null) {
            $payload['code'] = $code;
        }
        return self::json($payload, $status);
    }

    public static function file(string $path, string $filename, string $contentType = 'application/zip'): self
    {
        $response = new self(200, [
            'Content-Type' => $contentType,
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Content-Length' => (string) filesize($path),
            'Cache-Control' => 'no-store',
        ], '');
        $response->stream = fopen($path, 'rb');
        return $response;
    }

    public function send(): void
    {
        http_response_code($this->status);
        foreach ($this->headers as $name => $value) {
            header("{$name}: {$value}");
        }
        if ($this->stream !== null) {
            fpassthru($this->stream);
            fclose($this->stream);
            return;
        }
        echo $this->body;
    }
}
