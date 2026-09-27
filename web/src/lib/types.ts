import { z } from "zod";

/**
 * Mirrors the JSON shapes returned by the PHP backend (api/src/...).
 * Field names stay snake_case to match the API 1:1 — see docs/DESIGN.md §5.
 */

export const AmountPrecision = z.enum(["exact", "estimated", "unknown"]);
export type AmountPrecision = z.infer<typeof AmountPrecision>;

export const DatePrecision = z.enum(["day", "month", "year", "unknown"]);
export type DatePrecision = z.infer<typeof DatePrecision>;

export const IncomeSourceSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  category: z.string(),
  is_system: z.boolean(),
});
export type IncomeSource = z.infer<typeof IncomeSourceSchema>;

export const CompanySchema = z.object({
  uuid: z.string(),
  name: z.string(),
  memo: z.string().nullable(),
  total_amount: z.number().optional(),
  first_income_date: z.string().nullable().optional(),
  last_income_date: z.string().nullable().optional(),
});
export type Company = z.infer<typeof CompanySchema>;

export const IncomeSchema = z.object({
  uuid: z.string(),
  amount: z.number().nullable(),
  amount_precision: AmountPrecision,
  currency: z.string(),
  income_date: z.string(),
  date_precision: DatePrecision,
  memo: z.string().nullable(),
  source: IncomeSourceSchema.nullable(),
  company: CompanySchema.nullable(),
  created_at: z.string(),
});
export type Income = z.infer<typeof IncomeSchema>;

export const EventSchema = z.object({
  uuid: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  event_date: z.string(),
  income: IncomeSchema.pick({ uuid: true, amount: true }).nullable(),
  company: CompanySchema.pick({ uuid: true, name: true }).nullable(),
});
export type IncomeEvent = z.infer<typeof EventSchema>;

export const MilestoneSchema = z.object({
  uuid: z.string(),
  type: z.string(),
  value: z.number().nullable(),
  achieved_at: z.string(),
  seen: z.boolean(),
});
export type Milestone = z.infer<typeof MilestoneSchema>;

export const StatsSummarySchema = z.object({
  lifetime_total: z.number(),
  this_month_total: z.number(),
  this_year_total: z.number(),
  last_month_total: z.number(),
  best_month_total: z.number(),
  best_year_total: z.number(),
  income_count: z.number(),
  unknown_amount_count: z.number(),
  first_income_date: z.string().nullable(),
});
export type StatsSummary = z.infer<typeof StatsSummarySchema>;

export const MonthlyPointSchema = z.object({
  year: z.number(),
  month: z.number(),
  total: z.number(),
});
export type MonthlyPoint = z.infer<typeof MonthlyPointSchema>;

export const YearlyPointSchema = z.object({
  year: z.number(),
  total: z.number(),
  count: z.number(),
});
export type YearlyPoint = z.infer<typeof YearlyPointSchema>;

export const AgePointSchema = z.object({
  age: z.number(),
  total: z.number(),
});
export type AgePoint = z.infer<typeof AgePointSchema>;

export const CategoryTotalSchema = z.object({
  key: z.string(),
  label: z.string(),
  total: z.number(),
});
export type CategoryTotal = z.infer<typeof CategoryTotalSchema>;

export const RetrospectiveSchema = z.object({
  year: z.number(),
  total: z.number(),
  best_month: z.object({ month: z.number(), total: z.number() }).nullable(),
  top_sources: z.array(CategoryTotalSchema),
  top_companies: z.array(CategoryTotalSchema),
  monthly: z.array(MonthlyPointSchema),
  notable_events: z.array(EventSchema),
  age: z.number().nullable(),
});
export type Retrospective = z.infer<typeof RetrospectiveSchema>;

export const TimelineItemSchema = z.discriminatedUnion("kind", [
  IncomeSchema.extend({ kind: z.literal("income") }),
  EventSchema.extend({ kind: z.literal("event") }),
]);
export type TimelineItem = z.infer<typeof TimelineItemSchema>;

export const PagedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), next_cursor: z.string().nullable() });

export const ExportJobSchema = z.object({
  uuid: z.string(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  created_at: z.string(),
  completed_at: z.string().nullable(),
  download_url: z.string().nullable(),
});
export type ExportJob = z.infer<typeof ExportJobSchema>;

export const AuthAccountSchema = z.object({
  id: z.string(),
  provider: z.string(),
  email: z.string().nullable(),
  created_at: z.string(),
});
export type AuthAccount = z.infer<typeof AuthAccountSchema>;

export const MeSchema = z.object({
  uuid: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  birth_date: z.string().nullable(),
  onboarding_completed_at: z.string().nullable(),
});
export type Me = z.infer<typeof MeSchema>;
