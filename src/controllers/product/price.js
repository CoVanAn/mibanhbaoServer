import prisma from "../../config/prisma.js";
import {
  getCurrentPrice,
  getVariantPrices as getVariantPricesData,
  validatePricePeriod,
  setPermanentPrice,
  setScheduledPrice,
} from "../../utils/priceHelpers.js";
import { getVariantWithOwnership } from "./helpers.js";

// POST /api/product/:id/variants/:variantId/price
export const setVariantPrice = async (req, res, next) => {
  try {
    const pid = req.params.id;
    const vid = req.params.variantId;

    const { variant } = await getVariantWithOwnership(vid, pid);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    const { amount, startsAt, endsAt } = req.body;
    if (amount === undefined || amount === null) {
      return res.status(400).json({ message: "amount required" });
    }

    const amountStr = String(amount).trim();
    if (isNaN(Number(amountStr))) {
      return res.status(400).json({ message: "amount must be a number" });
    }

    try {
      let result;

      // If no date restrictions, set as permanent price
      if (!startsAt && !endsAt) {
        result = await setPermanentPrice(vid, amountStr);
      } else {
        // Set as scheduled price with validation
        result = await setScheduledPrice(vid, amountStr, startsAt, endsAt);
      }

      return res.json({ success: true, price: result });
    } catch (error) {
      console.error("setVariantPrice error:", error);
      return res.status(400).json({ message: error.message });
    }
  } catch (err) {
    return next(err);
  }
};

// GET /api/product/:id/variants/:variantId/prices
export const getVariantPrices = async (req, res, next) => {
  try {
    const pid = req.params.id;
    const vid = req.params.variantId;
    const { includeInactive } = req.query;

    const { variant } = await getVariantWithOwnership(vid, pid);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    // Use helper function for better price ordering
    const prices = await getVariantPricesData(vid, includeInactive === "true");
    const currentPrice = await getCurrentPrice(vid);

    return res.json({
      prices,
      currentPrice,
      total: prices.length,
    });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/product/:id/variants/:variantId/price/:priceId
export const updateVariantPrice = async (req, res, next) => {
  try {
    const pid = req.params.id;
    const vid = req.params.variantId;
    const priceId = req.params.priceId;

    const { variant } = await getVariantWithOwnership(vid, pid);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    const existingPrice = await prisma.price.findUnique({
      where: { id: priceId },
    });

    if (!existingPrice || existingPrice.variantId !== vid) {
      return res
        .status(404)
        .json({ message: "Price not found for this variant" });
    }

    const { amount, startsAt, endsAt, isActive } = req.body;
    const updateData = {};

    // Update amount if provided
    if (amount !== undefined && amount !== null) {
      const amountStr = String(amount).trim();
      if (isNaN(Number(amountStr))) {
        return res.status(400).json({ message: "amount must be a number" });
      }
      updateData.amount = amountStr;
    }

    // Update datetime fields if provided
    if (startsAt !== undefined) {
      updateData.startsAt = startsAt ? new Date(startsAt) : null;
    }
    if (endsAt !== undefined) {
      updateData.endsAt = endsAt ? new Date(endsAt) : null;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // Validate period if dates are being changed
    if (
      (startsAt !== undefined || endsAt !== undefined) &&
      updateData.isActive !== false
    ) {
      const validation = await validatePricePeriod(
        vid,
        updateData.startsAt ?? existingPrice.startsAt,
        updateData.endsAt ?? existingPrice.endsAt,
        priceId,
      );

      if (!validation.isValid) {
        return res.status(400).json({ message: validation.message });
      }
    }

    // Update the price
    const updatedPrice = await prisma.price.update({
      where: { id: priceId },
      data: updateData,
    });

    return res.json({ success: true, price: updatedPrice });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/product/:id/variants/:variantId/price/:priceId
export const deleteVariantPrice = async (req, res, next) => {
  try {
    const pid = req.params.id;
    const vid = req.params.variantId;
    const priceId = req.params.priceId;

    // Kiểm tra variant tồn tại
    const { variant } = await getVariantWithOwnership(vid, pid);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    // Kiểm tra price tồn tại
    const existingPrice = await prisma.price.findUnique({
      where: { id: priceId },
    });

    if (!existingPrice || existingPrice.variantId !== vid) {
      return res
        .status(404)
        .json({ message: "Price not found for this variant" });
    }

    // Kiểm tra không xóa giá cuối cùng nếu nó là giá active duy nhất
    const activePriceCount = await prisma.price.count({
      where: {
        variantId: vid,
        isActive: true,
      },
    });

    if (activePriceCount <= 1 && existingPrice.isActive) {
      return res.status(400).json({
        message:
          "Cannot delete the last active price. Please add a new price first.",
      });
    }

    // XÓA PRICE (hard delete)
    const deletedPrice = await prisma.price.delete({
      where: { id: priceId },
    });

    return res.json({
      success: true,
      message: "Price deleted successfully",
      price: deletedPrice,
    });
  } catch (err) {
    return next(err);
  }
};
