import prisma from "../../config/prisma.js";
import { createInventoryForVariant } from "../../utils/inventoryHelpers.js";
import { getCurrentPrice } from "../../utils/priceHelpers.js";
import {
  getExistingProduct,
  getVariantWithOwnership,
  parsePositiveInt,
} from "./helpers.js";

// POST /api/product/:id/variants
export const createVariant = async (req, res, next) => {
  try {
    const pid = req.params.id;

    const product = await getExistingProduct(pid);
    if (!product)
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    const {
      name,
      sku,
      isActive = true,
      initialStock = 0,
      safetyStock = 0,
    } = req.body;
    if (!name)
      return res.status(400).json({ message: "Tên biến thể là bắt buộc" });

    const variant = await prisma.productVariant.create({
      data: {
        productId: pid,
        name,
        sku: sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        isActive,
      },
    });

    // Auto-create inventory for the new variant
    await createInventoryForVariant(variant.id, initialStock, safetyStock);

    return res.json({ success: true, id: variant.id });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/product/:id/variants/:variantId
export const updateVariant = async (req, res, next) => {
  try {
    const pid = req.params.id;
    const vid = req.params.variantId;

    const { variant } = await getVariantWithOwnership(vid, pid);
    if (!variant) {
      return res.status(404).json({ message: "Không tìm thấy biến thể" });
    }

    const { name, sku, isActive } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (sku !== undefined) data.sku = sku;
    if (isActive !== undefined) data.isActive = isActive;

    await prisma.productVariant.update({ where: { id: vid }, data });

    return res.json({ success: true, message: "Cập nhật biến thể thành công" });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/product/:id/variants/:variantId
export const deleteVariant = async (req, res, next) => {
  try {
    const pid = req.params.id;
    const vid = req.params.variantId;

    const { variant } = await getVariantWithOwnership(vid, pid);
    if (!variant) {
      return res.status(404).json({ message: "Không tìm thấy biến thể" });
    }

    // Check if it's the last variant
    const variantCount = await prisma.productVariant.count({
      where: { productId: pid },
    });
    if (variantCount <= 1) {
      return res
        .status(400)
        .json({ message: "Không thể xóa biến thể cuối cùng của sản phẩm" });
    }

    // Clean up cart items that reference this variant
    await prisma.cartItem.deleteMany({
      where: { variantId: vid },
    });

    await prisma.productVariant.delete({ where: { id: vid } });

    return res.json({ success: true, message: "Xóa biến thể thành công" });
  } catch (err) {
    return next(err);
  }
};

// GET /api/product/:id/variants
export const getProductVariants = async (req, res, next) => {
  try {
    const pid = req.params.id;

    const product = await getExistingProduct(pid);
    if (!product)
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    const variants = await prisma.productVariant.findMany({
      where: { productId: pid },
      include: {
        prices: {
          where: { isActive: true },
          orderBy: [{ startsAt: "desc" }, { id: "desc" }],
        },
        inventory: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Get current price for each variant
    const variantsWithCurrentPrice = await Promise.all(
      variants.map(async (v) => {
        const currentPrice = await getCurrentPrice(v.id);
        return {
          ...v,
          currentPrice: currentPrice?.amount || null,
        };
      }),
    );

    return res.json({ success: true, variants: variantsWithCurrentPrice });
  } catch (err) {
    return next(err);
  }
};

// GET /api/product/:id/variants/:variantId or /api/product/variant/:variantId
export const getVariant = async (req, res, next) => {
  try {
    const pid = req.params.id ? req.params.id : null;
    const vid = parsePositiveInt(req.params.variantId);

    const variantWithDetails = await prisma.productVariant.findUnique({
      where: { id: vid },
      include: {
        product: true,
        prices: {
          orderBy: { id: "desc" },
        },
        inventory: true,
      },
    });

    if (!variantWithDetails) {
      return res.status(404).json({ message: "Không tìm thấy biến thể" });
    }

    // Nếu có productId trong URL, kiểm tra match
    if (pid && variantWithDetails.productId !== pid) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy biến thể thuộc sản phẩm này" });
    }

    return res.json({ success: true, variant: variantWithDetails });
  } catch (err) {
    return next(err);
  }
};
