import prisma from "../config/prisma.js";

/**
 * Get current active price for a variant
 * Handles temporal pricing logic properly
 */
export const getCurrentPrice = async (variantId) => {
  const now = new Date();
  
  const price = await prisma.price.findFirst({
    where: {
      variantId,
      isActive: true,
      OR: [
        // Permanent prices (no date restrictions)
        { startsAt: null, endsAt: null },
        // Current date within range
        { 
          startsAt: { lte: now }, 
          endsAt: { gte: now } 
        },
        // Started but no end date
        { 
          startsAt: { lte: now }, 
          endsAt: null 
        },
      ]
    },
    orderBy: [
      // Prioritize specific date ranges over permanent
      { startsAt: 'desc' },
      { id: 'desc' } // Use id as proxy for creation order
    ]
  });

  return price;
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
      { isActive: 'desc' }, // Active first
      { startsAt: 'desc' },  // Newer dates first
      { id: 'desc' }         // Recently created first (by ID)
    ]
  });
};

/**
 * Validate if a price period conflicts with existing prices
 */
export const validatePricePeriod = async (variantId, startsAt, endsAt, excludePriceId = null) => {
  const where = {
    variantId,
    isActive: true,
    ...(excludePriceId && { id: { not: excludePriceId } })
  };

  // If permanent price (no dates), check for other permanent prices
  if (!startsAt && !endsAt) {
    const existingPermanent = await prisma.price.findFirst({
      where: {
        ...where,
        startsAt: null,
        endsAt: null
      }
    });
    
    return {
      isValid: !existingPermanent,
      conflictingPrice: existingPermanent,
      message: existingPermanent ? "A permanent price already exists for this variant" : null
    };
  }

  // Check for overlapping date ranges
  const start = startsAt ? new Date(startsAt) : new Date('1900-01-01');
  const end = endsAt ? new Date(endsAt) : new Date('2100-12-31');

  const overlapping = await prisma.price.findFirst({
    where: {
      ...where,
      OR: [
        // Permanent prices conflict with any dated price
        { startsAt: null, endsAt: null },
        // Date range overlaps
        {
          AND: [
            {
              OR: [
                { startsAt: null },
                { startsAt: { lte: end } }
              ]
            },
            {
              OR: [
                { endsAt: null },
                { endsAt: { gte: start } }
              ]
            }
          ]
        }
      ]
    }
  });

  return {
    isValid: !overlapping,
    conflictingPrice: overlapping,
    message: overlapping ? "Price period conflicts with existing price" : null
  };
};

/**
 * Create or update a permanent price (removes date restrictions)
 */
export const setPermanentPrice = async (variantId, amount) => {
  // Deactivate all existing prices for this variant
  await prisma.price.updateMany({
    where: { variantId },
    data: { isActive: false }
  });

  // Create new permanent price
  return await prisma.price.create({
    data: {
      variantId,
      amount: String(amount),
      isActive: true,
      startsAt: null,
      endsAt: null
    }
  });
};

/**
 * Create a scheduled price (with date range)
 */
export const setScheduledPrice = async (variantId, amount, startsAt, endsAt) => {
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
      endsAt: endsAt ? new Date(endsAt) : null
    }
  });
};
