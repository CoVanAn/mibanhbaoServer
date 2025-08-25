import prisma from "../config/prisma.js";

/**
 * Auto-create inventory record for a variant
 */
export const createInventoryForVariant = async (variantId, initialQuantity = 0, safetyStock = 0) => {
  try {
    return await prisma.inventory.create({
      data: {
        variantId,
        quantity: initialQuantity,
        safetyStock
      }
    });
  } catch (error) {
    // If inventory already exists, return existing one
    if (error.code === 'P2002') {
      return await prisma.inventory.findUnique({
        where: { variantId }
      });
    }
    throw error;
  }
};

/**
 * Get inventory for a variant (with default if not exists)
 */
export const getVariantInventory = async (variantId) => {
  let inventory = await prisma.inventory.findUnique({
    where: { variantId }
  });

  // Auto-create if doesn't exist
  if (!inventory) {
    inventory = await createInventoryForVariant(variantId);
  }

  return inventory;
};

/**
 * Check if sufficient stock is available
 */
export const checkStockAvailability = async (variantId, requestedQuantity) => {
  const inventory = await getVariantInventory(variantId);
  
  return {
    available: inventory.quantity >= requestedQuantity,
    currentStock: inventory.quantity,
    requestedQuantity,
    shortfall: Math.max(0, requestedQuantity - inventory.quantity)
  };
};

/**
 * Reserve stock for an order (decrease quantity)
 */
export const reserveStock = async (variantId, quantity) => {
  const stockCheck = await checkStockAvailability(variantId, quantity);
  
  if (!stockCheck.available) {
    throw new Error(`Insufficient stock. Available: ${stockCheck.currentStock}, Requested: ${quantity}`);
  }

  return await prisma.inventory.update({
    where: { variantId },
    data: {
      quantity: {
        decrement: quantity
      }
    }
  });
};

/**
 * Release stock (increase quantity) - for order cancellations
 */
export const releaseStock = async (variantId, quantity) => {
  return await prisma.inventory.update({
    where: { variantId },
    data: {
      quantity: {
        increment: quantity
      }
    }
  });
};

/**
 * Update stock quantity (absolute value)
 */
export const updateStock = async (variantId, newQuantity, safetyStock = null) => {
  const updateData = { quantity: newQuantity };
  if (safetyStock !== null) {
    updateData.safetyStock = safetyStock;
  }

  return await prisma.inventory.upsert({
    where: { variantId },
    update: updateData,
    create: {
      variantId,
      quantity: newQuantity,
      safetyStock: safetyStock || 0
    }
  });
};

/**
 * Get low stock variants (below safety stock)
 */
export const getLowStockVariants = async () => {
  return await prisma.inventory.findMany({
    where: {
      quantity: {
        lte: prisma.inventory.fields.safetyStock
      }
    },
    include: {
      variant: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      }
    }
  });
};

/**
 * Bulk stock operations for multiple variants
 */
export const bulkStockUpdate = async (stockUpdates) => {
  const operations = stockUpdates.map(({ variantId, quantity, safetyStock }) => 
    prisma.inventory.upsert({
      where: { variantId },
      update: {
        quantity: quantity !== undefined ? quantity : undefined,
        safetyStock: safetyStock !== undefined ? safetyStock : undefined
      },
      create: {
        variantId,
        quantity: quantity || 0,
        safetyStock: safetyStock || 0
      }
    })
  );

  return await prisma.$transaction(operations);
};
