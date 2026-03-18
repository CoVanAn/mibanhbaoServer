import { z } from "zod";

const currentYear = new Date().getUTCFullYear();

export const dashboardOverviewQuerySchema = z.object({
  year: z
    .string()
    .optional()
    .default(String(currentYear))
    .transform((value) => Number.parseInt(value, 10)),
  quarter: z
    .enum(["1", "2", "3", "4"])
    .optional()
    .default("1")
    .transform((value) => Number.parseInt(value, 10)),
});

export const dashboardDailyQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const dashboardTopProductsQuerySchema = z
  .object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    year: z
      .string()
      .optional()
      .transform((value) => (value ? Number.parseInt(value, 10) : undefined)),
    quarter: z
      .enum(["1", "2", "3", "4"])
      .optional()
      .transform((value) => (value ? Number.parseInt(value, 10) : undefined)),
    limit: z
      .string()
      .optional()
      .default("5")
      .transform((value) => Number.parseInt(value, 10)),
  })
  .superRefine((values, ctx) => {
    const hasRange = values.startDate && values.endDate;
    const hasQuarter = values.year && values.quarter;

    if (!hasRange && !hasQuarter) {
      ctx.addIssue({
        code: "custom",
        message: "Provide either startDate/endDate or year/quarter",
      });
    }
  });

export const dashboardLowStockQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .default("10")
    .transform((value) => Number.parseInt(value, 10)),
});
