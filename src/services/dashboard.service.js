import prisma from "../config/prisma.js";

const NON_REVENUE_STATUSES = ["CANCELED", "REFUNDED"];

const toNumber = (value) => Number.parseFloat(value || 0);

function getQuarterDateRange(year, quarter) {
  const q = Number(quarter);
  const y = Number(year);

  const startMonth = (q - 1) * 3;
  const start = new Date(Date.UTC(y, startMonth, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, startMonth + 3, 0, 23, 59, 59, 999));

  return { start, end };
}

function getDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function buildDateSeries(startDate, endDate) {
  const dates = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    dates.push(getDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

class DashboardService {
  async getOverview({ year, quarter }) {
    const { start, end } = getQuarterDateRange(year, quarter);

    const [ordersInQuarter, paidPayments, totalOrders, canceledOrders] =
      await Promise.all([
        prisma.order.findMany({
          where: {
            createdAt: { gte: start, lte: end },
            status: { notIn: NON_REVENUE_STATUSES },
          },
          select: { total: true, createdAt: true },
        }),
        prisma.payment.findMany({
          where: {
            status: "PAID",
            paidAt: { gte: start, lte: end },
          },
          select: { amount: true, paidAt: true },
        }),
        prisma.order.count({
          where: { createdAt: { gte: start, lte: end } },
        }),
        prisma.order.count({
          where: {
            createdAt: { gte: start, lte: end },
            status: "CANCELED",
          },
        }),
      ]);

    const totalRevenue = ordersInQuarter.reduce(
      (sum, order) => sum + toNumber(order.total),
      0,
    );

    const totalCollected = paidPayments.reduce(
      (sum, payment) => sum + toNumber(payment.amount),
      0,
    );

    const validOrderCount = ordersInQuarter.length;
    const aov = validOrderCount > 0 ? totalRevenue / validOrderCount : 0;
    const cancelRate = totalOrders > 0 ? (canceledOrders / totalOrders) * 100 : 0;

    const monthlyMap = new Map();
    for (const order of ordersInQuarter) {
      const monthKey = getMonthKey(order.createdAt);
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + toNumber(order.total));
    }

    const trend = [];
    const quarterStartMonth = (Number(quarter) - 1) * 3;
    for (let i = 0; i < 3; i += 1) {
      const month = new Date(Date.UTC(Number(year), quarterStartMonth + i, 1));
      const key = getMonthKey(month);
      trend.push({
        month: key,
        revenue: monthlyMap.get(key) || 0,
      });
    }

    return {
      range: {
        type: "quarter",
        year: Number(year),
        quarter: Number(quarter),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      metrics: {
        totalRevenue,
        totalCollected,
        totalOrders,
        averageOrderValue: aov,
        canceledOrders,
        cancelRate,
      },
      monthlyRevenueTrend: trend,
    };
  }

  async getDaily({ startDate, endDate }) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    const [orders, paidPayments] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          status: { notIn: NON_REVENUE_STATUSES },
        },
        select: { createdAt: true, total: true },
      }),
      prisma.payment.findMany({
        where: {
          status: "PAID",
          paidAt: { gte: start, lte: end },
        },
        select: { paidAt: true, amount: true },
      }),
    ]);

    const revenueByDate = new Map();
    const orderCountByDate = new Map();
    const collectedByDate = new Map();

    for (const order of orders) {
      const key = getDateKey(order.createdAt);
      revenueByDate.set(key, (revenueByDate.get(key) || 0) + toNumber(order.total));
      orderCountByDate.set(key, (orderCountByDate.get(key) || 0) + 1);
    }

    for (const payment of paidPayments) {
      if (!payment.paidAt) continue;
      const key = getDateKey(payment.paidAt);
      collectedByDate.set(
        key,
        (collectedByDate.get(key) || 0) + toNumber(payment.amount),
      );
    }

    const days = buildDateSeries(start, end).map((date) => ({
      date,
      revenue: revenueByDate.get(date) || 0,
      collected: collectedByDate.get(date) || 0,
      orders: orderCountByDate.get(date) || 0,
    }));

    return {
      range: {
        type: "date-range",
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      daily: days,
    };
  }

  async getTopProducts({
    startDate,
    endDate,
    year,
    quarter,
    limit = 5,
  }) {
    let start = null;
    let end = null;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
    } else if (year && quarter) {
      const range = getQuarterDateRange(year, quarter);
      start = range.start;
      end = range.end;
    }

    const orderDateFilter =
      start && end
        ? {
            createdAt: { gte: start, lte: end },
            status: { notIn: NON_REVENUE_STATUSES },
          }
        : { status: { notIn: NON_REVENUE_STATUSES } };

    const items = await prisma.orderItem.findMany({
      where: {
        order: orderDateFilter,
      },
      select: {
        productId: true,
        nameSnapshot: true,
        quantity: true,
        lineTotal: true,
      },
    });

    const grouped = new Map();

    for (const item of items) {
      const key = String(item.productId || item.nameSnapshot);
      const existing = grouped.get(key) || {
        productId: item.productId,
        name: item.nameSnapshot,
        sold: 0,
        revenue: 0,
      };

      existing.sold += item.quantity;
      existing.revenue += toNumber(item.lineTotal);

      grouped.set(key, existing);
    }

    const data = Array.from(grouped.values())
      .sort((a, b) => b.sold - a.sold)
      .slice(0, Number(limit));

    return {
      filters: {
        startDate: start ? start.toISOString() : null,
        endDate: end ? end.toISOString() : null,
        year: year ? Number(year) : null,
        quarter: quarter ? Number(quarter) : null,
      },
      topProducts: data,
    };
  }

  async getLowStock({ limit = 10 }) {
    const inventories = await prisma.inventory.findMany({
      where: {
        quantity: {
          lte: prisma.inventory.fields.safetyStock,
        },
      },
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ quantity: "asc" }, { updatedAt: "desc" }],
      take: Number(limit),
    });

    return {
      lowStock: inventories.map((item) => ({
        variantId: item.variantId,
        productId: item.variant?.product?.id || null,
        productName: item.variant?.product?.name || "Unknown product",
        variantName: item.variant?.name || null,
        quantity: item.quantity,
        safetyStock: item.safetyStock,
      })),
    };
  }
}

export default new DashboardService();
