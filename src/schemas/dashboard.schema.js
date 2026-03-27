import { z } from "zod";

const currentYear = new Date().getUTCFullYear();

export const dashboardOverviewQuerySchema = z.object({
  year: z.coerce
    .number()
    .int("Year must be an integer")
    .positive("Year must be greater than 0")
    .default(currentYear),
  quarter: z.coerce
    .number()
    .int("Quarter must be an integer")
    .min(1, "Quarter must be between 1 and 4")
    .max(4, "Quarter must be between 1 and 4")
    .default(1),
});

export const dashboardDailyQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const dashboardTopProductsQuerySchema = z
  .object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    year: z.coerce
      .number()
      .int("Year must be an integer")
      .positive("Year must be greater than 0")
      .optional(),
    quarter: z.coerce
      .number()
      .int("Quarter must be an integer")
      .min(1, "Quarter must be between 1 and 4")
      .max(4, "Quarter must be between 1 and 4")
      .optional(),
    limit: z.coerce
      .number()
      .int("Limit must be an integer")
      .positive("Limit must be greater than 0")
      .max(100, "Limit cannot exceed 100")
      .default(5),
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
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .positive("Limit must be greater than 0")
    .max(100, "Limit cannot exceed 100")
    .default(10),
});
