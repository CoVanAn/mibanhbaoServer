import { z } from "zod";

const currentYear = new Date().getUTCFullYear();

export const dashboardOverviewQuerySchema = z.object({
  year: z.coerce
    .number()
    .int("Năm phải là số nguyên")
    .positive("Năm phải lớn hơn 0")
    .default(currentYear),
  quarter: z.coerce
    .number()
    .int("Quý phải là số nguyên")
    .min(1, "Quý phải nằm trong khoảng 1 đến 4")
    .max(4, "Quý phải nằm trong khoảng 1 đến 4")
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
      .int("Năm phải là số nguyên")
      .positive("Năm phải lớn hơn 0")
      .optional(),
    quarter: z.coerce
      .number()
      .int("Quý phải là số nguyên")
      .min(1, "Quý phải nằm trong khoảng 1 đến 4")
      .max(4, "Quý phải nằm trong khoảng 1 đến 4")
      .optional(),
    limit: z.coerce
      .number()
      .int("Giới hạn phải là số nguyên")
      .positive("Giới hạn phải lớn hơn 0")
      .max(100, "Limit cannot exceed 100")
      .default(5),
  })
  .superRefine((values, ctx) => {
    const hasRange = values.startDate && values.endDate;
    const hasQuarter = values.year && values.quarter;

    if (!hasRange && !hasQuarter) {
      ctx.addIssue({
        code: "custom",
        message: "Cung cấp startDate/endDate hoặc year/quarter",
      });
    }
  });

export const dashboardLowStockQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int("Giới hạn phải là số nguyên")
    .positive("Giới hạn phải lớn hơn 0")
    .max(100, "Limit cannot exceed 100")
    .default(10),
});
