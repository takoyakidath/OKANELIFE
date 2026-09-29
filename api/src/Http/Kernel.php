<?php

namespace Okanelife\Http;

use Okanelife\Domain\AuthException as DomainAuthException;
use Okanelife\Http\Controllers\AuthController;
use Okanelife\Http\Controllers\CompanyController;
use Okanelife\Http\Controllers\EventController;
use Okanelife\Http\Controllers\ExportController;
use Okanelife\Http\Controllers\ImportController;
use Okanelife\Http\Controllers\IncomeController;
use Okanelife\Http\Controllers\MeController;
use Okanelife\Http\Controllers\MilestoneController;
use Okanelife\Http\Controllers\RetrospectiveController;
use Okanelife\Http\Controllers\SourceController;
use Okanelife\Http\Controllers\StatsController;
use Okanelife\Http\Controllers\StatusController;
use Okanelife\Http\Controllers\TimelineController;
use Okanelife\Http\Middleware\AuthException as MiddlewareAuthException;
use Okanelife\Http\Middleware\AuthMiddleware;
use Okanelife\Support\RateLimiter;
use Okanelife\Support\Request;
use Okanelife\Support\Response;
use Okanelife\Support\Router;
use Okanelife\Support\ValidationException;

final class Kernel
{
    private Router $router;

    public function __construct()
    {
        $this->router = new Router();
        $this->registerRoutes();
    }

    public function handle(Request $request): Response
    {
        try {
            if (in_array($request->method, ['POST', 'PATCH', 'DELETE'], true)) {
                $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
                if (!RateLimiter::allow("write:{$ip}", 120, 60)) {
                    return $this->withSecurityHeaders(Response::error(429, 'リクエストが多すぎます'));
                }
            }

            $match = $this->router->match($request->method, $request->path);
            if ($match === null) {
                return $this->withSecurityHeaders(Response::error(404, 'Not found'));
            }
            [$handler, $params] = $match;
            if ($handler === '__method_not_allowed__') {
                return $this->withSecurityHeaders(Response::error(405, 'Method not allowed'));
            }

            $request->params = $params;
            return $this->withSecurityHeaders($handler($request));
        } catch (ValidationException $e) {
            return $this->withSecurityHeaders(Response::error(422, $e->getMessage()));
        } catch (MiddlewareAuthException $e) {
            error_log('auth: ' . $e->getMessage());
            return $this->withSecurityHeaders(Response::error(401, 'unauthenticated'));
        } catch (DomainAuthException $e) {
            return $this->withSecurityHeaders(Response::error($e->status, $e->getMessage()));
        } catch (\Throwable $e) {
            error_log($e->getMessage() . "\n" . $e->getTraceAsString());
            return $this->withSecurityHeaders(Response::error(500, 'サーバーエラーが発生しました'));
        }
    }

    private function withSecurityHeaders(Response $response): Response
    {
        $response->headers['X-Content-Type-Options'] = 'nosniff';
        $response->headers['X-Frame-Options'] = 'DENY';
        $response->headers['Referrer-Policy'] = 'no-referrer';
        // Intentionally no Access-Control-Allow-Origin: this API only
        // accepts server-to-server calls from the Next.js BFF, never
        // directly from a browser (see docs/DESIGN.md §2).
        return $response;
    }

    private function registerRoutes(): void
    {
        $r = $this->router;
        $auth = fn (callable $h) => AuthMiddleware::wrap($h);

        $status = new StatusController();
        $r->get('/status', [$status, 'show']);

        $authController = new AuthController();
        $r->post('/v1/auth/google', [$authController, 'googleLogin']);
        $r->post('/v1/auth/refresh', [$authController, 'refresh']);
        $r->post('/v1/auth/logout', [$authController, 'logout']);
        $r->get('/v1/auth/accounts', $auth([$authController, 'listAccounts']));
        $r->post('/v1/auth/accounts/link', $auth([$authController, 'linkAccount']));
        $r->delete('/v1/auth/accounts/{uuid}', $auth([$authController, 'unlinkAccount']));

        $me = new MeController();
        $r->get('/v1/me', $auth([$me, 'show']));
        $r->patch('/v1/me', $auth([$me, 'update']));
        $r->delete('/v1/me', $auth([$me, 'destroy']));

        $incomes = new IncomeController();
        $r->get('/v1/incomes', $auth([$incomes, 'index']));
        $r->post('/v1/incomes', $auth([$incomes, 'store']));
        $r->get('/v1/incomes/{uuid}', $auth([$incomes, 'show']));
        $r->patch('/v1/incomes/{uuid}', $auth([$incomes, 'update']));
        $r->delete('/v1/incomes/{uuid}', $auth([$incomes, 'destroy']));

        $companies = new CompanyController();
        $r->get('/v1/companies', $auth([$companies, 'index']));
        $r->post('/v1/companies', $auth([$companies, 'store']));
        $r->get('/v1/companies/{uuid}', $auth([$companies, 'show']));
        $r->patch('/v1/companies/{uuid}', $auth([$companies, 'update']));
        $r->delete('/v1/companies/{uuid}', $auth([$companies, 'destroy']));

        $sources = new SourceController();
        $r->get('/v1/sources', $auth([$sources, 'index']));
        $r->post('/v1/sources', $auth([$sources, 'store']));

        $events = new EventController();
        $r->get('/v1/events', $auth([$events, 'index']));
        $r->post('/v1/events', $auth([$events, 'store']));
        $r->patch('/v1/events/{uuid}', $auth([$events, 'update']));
        $r->delete('/v1/events/{uuid}', $auth([$events, 'destroy']));

        $timeline = new TimelineController();
        $r->get('/v1/timeline', $auth([$timeline, 'index']));

        $stats = new StatsController();
        $r->get('/v1/stats/summary', $auth([$stats, 'summary']));
        $r->get('/v1/stats/monthly', $auth([$stats, 'monthly']));
        $r->get('/v1/stats/yearly', $auth([$stats, 'yearly']));
        $r->get('/v1/stats/by-source', $auth([$stats, 'bySource']));
        $r->get('/v1/stats/by-company', $auth([$stats, 'byCompany']));
        $r->get('/v1/stats/by-age', $auth([$stats, 'byAge']));
        $r->get('/v1/stats/simulation', $auth([$stats, 'simulation']));
        $r->get('/v1/stats/compare-years', $auth([$stats, 'compareYears']));

        $retrospective = new RetrospectiveController();
        $r->get('/v1/retrospective/{year}', $auth([$retrospective, 'show']));

        $milestones = new MilestoneController();
        $r->get('/v1/milestones', $auth([$milestones, 'index']));

        $exports = new ExportController();
        $r->post('/v1/exports', $auth([$exports, 'store']));
        $r->get('/v1/exports', $auth([$exports, 'index']));
        $r->get('/v1/exports/{uuid}', $auth([$exports, 'show']));
        $r->get('/v1/exports/{uuid}/download', $auth([$exports, 'download']));

        $imports = new ImportController();
        $r->post('/v1/imports/preview', $auth([$imports, 'preview']));
        $r->post('/v1/imports', $auth([$imports, 'store']));
    }
}
