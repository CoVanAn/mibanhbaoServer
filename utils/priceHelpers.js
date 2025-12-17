import prisma from "../config/prisma.js";

/**
 * Get current active price for a variant
 * Handles temporal pricing logic properly
 */
export const getCurrentPrice = async (variantId) => {
  const now = new Date();

  // Bước 1: Tìm giá có lịch trình đang trong khoảng thời gian hiện tại
  const scheduledPrice = await prisma.price.findFirst({
    where: {
      variantId,
      isActive: true,
      // Phải có ít nhất một ngày được set (không phải giá vô thời hạn)
      NOT: {
        AND: [{ startsAt: null }, { endsAt: null }],
      },
      // Thời điểm hiện tại nằm trong khoảng
      AND: [
        {
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        },
        {
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
      ],
    },
    orderBy: [{ startsAt: "desc" }, { id: "desc" }],
  });

  if (scheduledPrice) {
    return scheduledPrice;
  }

  // Bước 2: Nếu không có giá lịch trình, tìm giá vô thời hạn
  const permanentPrice = await prisma.price.findFirst({
    where: {
      variantId,
      isActive: true,
      startsAt: null,
      endsAt: null,
    },
    orderBy: [{ id: "desc" }],
  });

  return permanentPrice;
};

/**
 * Get all prices for a variant with proper ordering
 */
export const getVariantPrices = async (variantId, includeInactive = false) => {
  const where = { variantId };
  if (!includeInactive) {
    where.isActive = true;
  }

  return await prisma.price.findMany({
    where,
    orderBy: [
      { isActive: "desc" }, // Active first
      { startsAt: "desc" }, // Newer dates first
      { id: "desc" }, // Recently created first (by ID)
    ],
  });
};

/**
 * Validate if a price period conflicts with existing prices
 */
export const validatePricePeriod = async (
  variantId,
  startsAt,
  endsAt,
  excludePriceId = null
) => {
  const where = {
    variantId,
    isActive: true,
    ...(excludePriceId && { id: { not: excludePriceId } }),
  };

  const isPermanent = !startsAt && !endsAt;

  // If trying to create a permanent price, check for other permanent prices only
  if (isPermanent) {
    const existingPermanent = await prisma.price.findFirst({
      where: {
        ...where,
        startsAt: null,
        endsAt: null,
      },
    });

    return {
      isValid: !existingPermanent,
      conflictingPrice: existingPermanent,
      message: existingPermanent
        ? "A permanent price already exists for this variant"
        : null,
    };
  }

  // If trying to create a scheduled price, only check against OTHER scheduled prices
  // (Permanent + scheduled can coexist; scheduled takes precedence during its range)
  const start = startsAt ? new Date(startsAt) : null;
  const end = endsAt ? new Date(endsAt) : null;

  if (!start || !end) {
    return {
      isValid: false,
      conflictingPrice: null,
      message: "Scheduled price must have both start and end dates",
    };
  }

  // Only check for overlaps with OTHER scheduled prices (not permanent)
  const overlapping = await prisma.price.findFirst({
    where: {
      ...where,
      // Exclude permanent prices
      NOT: {
        AND: [{ startsAt: null }, { endsAt: null }],
      },
      // Check for date range overlap
      AND: [
        {
          OR: [{ startsAt: { lte: end } }, { startsAt: null }],
        },
        {
          OR: [{ endsAt: { gte: start } }, { endsAt: null }],
        },
      ],
    },
  });

  return {
    isValid: !overlapping,
    conflictingPrice: overlapping,
    message: overlapping
      ? `Price period overlaps with another scheduled price (${new Date(
          overlapping.startsAt
        ).toLocaleDateString()} - ${
          overlapping.endsAt
            ? new Date(overlapping.endsAt).toLocaleDateString()
            : "no end"
        })`
      : null,
  };
};

/**
 * Create or update a permanent price (removes date restrictions)
 */
export const setPermanentPrice = async (variantId, amount) => {
  // Deactivate all existing prices for this variant
  await prisma.price.updateMany({
    where: { variantId },
    data: { isActive: false },
  });

  // Create new permanent price
  return await prisma.price.create({
    data: {
      variantId,
      amount: String(amount),
      isActive: true,
      startsAt: null,
      endsAt: null,
    },
  });
};

/**
 * Create a scheduled price (with date range)
 */
export const setScheduledPrice = async (
  variantId,
  amount,
  startsAt,
  endsAt
) => {
  // Validate period doesn't conflict
  const validation = await validatePricePeriod(variantId, startsAt, endsAt);
  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  return await prisma.price.create({
    data: {
      variantId,
      amount: String(amount),
      isActive: true,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  });
};
