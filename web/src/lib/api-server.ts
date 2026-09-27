import "server-only";

import { requireSession } from "./auth-server";
import { backendJson } from "./backend";
import {
  StatsSummarySchema,
  MonthlyPointSchema,
  YearlyPointSchema,
  AgePointSchema,
  RetrospectiveSchema,
  MilestoneSchema,
  CompanySchema,
  IncomeSourceSchema,
  MeSchema,
  PagedSchema,
  TimelineItemSchema,
  AuthAccountSchema,
  ExportJobSchema,
  IncomeSchema,
  z,
} from "./types-helpers";

/** Thin server-side data layer (DAL) — every function here checks the
 * session first, per the Next.js Authentication guide's DAL recommendation.
 * Server Components call these directly instead of round-tripping through
 * the same-origin /api/v1 BFF route (that hop exists for the browser). */

async function call<T>(schema: z.ZodType<T>, path: string): Promise<T> {
  const session = await requireSession();
  const data = await backendJson<unknown>(path, {
    accessToken: session.accessToken,
  });
  return schema.parse(data);
}

export const getMe = () => call(MeSchema, "/v1/me");
export const getStatsSummary = () => call(StatsSummarySchema, "/v1/stats/summary");
export const getMonthlyStats = (year: number) =>
  call(z.array(MonthlyPointSchema), `/v1/stats/monthly?year=${year}`);
export const getYearlyStats = () => call(z.array(YearlyPointSchema), "/v1/stats/yearly");
export const getAgeStats = () => call(z.array(AgePointSchema), "/v1/stats/by-age");
export const getBySource = () =>
  call(z.array(z.object({ key: z.string(), label: z.string(), total: z.number() })), "/v1/stats/by-source");
export const getByCompany = () =>
  call(z.array(z.object({ key: z.string(), label: z.string(), total: z.number() })), "/v1/stats/by-company");
export const getRetrospective = (year: number) =>
  call(RetrospectiveSchema, `/v1/retrospective/${year}`);
export const getMilestones = () => call(z.array(MilestoneSchema), "/v1/milestones");
export const getCompanies = () => call(z.array(CompanySchema), "/v1/companies");
export const getCompany = (uuid: string) => call(CompanySchema, `/v1/companies/${uuid}`);
export const getSources = () => call(z.array(IncomeSourceSchema), "/v1/sources");
export const getTimeline = (cursor?: string) =>
  call(
    PagedSchema(TimelineItemSchema),
    `/v1/timeline${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`
  );
export const getIncomes = (params: string = "") =>
  call(PagedSchema(IncomeSchema), `/v1/incomes${params}`);
export const getIncome = (uuid: string) => call(IncomeSchema, `/v1/incomes/${uuid}`);
export const getAuthAccounts = () => call(z.array(AuthAccountSchema), "/v1/auth/accounts");
export const getExportJobs = () => call(z.array(ExportJobSchema), "/v1/exports");
export const getSimulation = () =>
  call(
    z.object({
      current_annual_pace: z.number(),
      projections: z.array(z.object({ years: z.number(), total: z.number() })),
    }),
    "/v1/stats/simulation"
  );
export const getYearComparison = (a: number, b: number) =>
  call(
    z.object({
      a: z.object({ year: z.number(), monthly: z.array(MonthlyPointSchema) }),
      b: z.object({ year: z.number(), monthly: z.array(MonthlyPointSchema) }),
    }),
    `/v1/stats/compare-years?a=${a}&b=${b}`
  );
