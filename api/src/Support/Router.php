<?php

namespace Okanelife\Support;

final class Router
{
    /** @var array<int,array{method:string,pattern:string,regex:string,paramNames:string[],handler:callable}> */
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler): void
    {
        $paramNames = [];
        $regex = preg_replace_callback('#\{([a-zA-Z_]+)\}#', function ($m) use (&$paramNames) {
            $paramNames[] = $m[1];
            return '([^/]+)';
        }, $pattern);
        $regex = '#^' . $regex . '$#';

        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $pattern,
            'regex' => $regex,
            'paramNames' => $paramNames,
            'handler' => $handler,
        ];
    }

    public function get(string $pattern, callable $handler): void
    {
        $this->add('GET', $pattern, $handler);
    }
    public function post(string $pattern, callable $handler): void
    {
        $this->add('POST', $pattern, $handler);
    }
    public function patch(string $pattern, callable $handler): void
    {
        $this->add('PATCH', $pattern, $handler);
    }
    public function delete(string $pattern, callable $handler): void
    {
        $this->add('DELETE', $pattern, $handler);
    }

    /** @return array{0:callable,1:array<string,string>}|null */
    public function match(string $method, string $path): ?array
    {
        $matchedPath = false;
        foreach ($this->routes as $route) {
            if (!preg_match($route['regex'], $path, $matches)) {
                continue;
            }
            $matchedPath = true;
            if ($route['method'] !== $method) {
                continue;
            }
            array_shift($matches);
            $params = array_combine($route['paramNames'], $matches);
            return [$route['handler'], $params];
        }
        return $matchedPath ? ['__method_not_allowed__', []] : null;
    }
}
