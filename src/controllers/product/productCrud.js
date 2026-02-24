import prisma from "../../config/prisma.js";
import cloudinary from "../../config/cloudinary.js";
// Import service
import productService from "../../services/product.service.js";
// Import formatters
import {
  buildProductSummary,
  buildProductDetail,
} from "../../utils/productFormatters.js";

// Helper functions moved to utils/productFormatters.js

// POST /api/products (or /api/product/add)
export const addProduct = async (req, res, next) => {
  try {
    // Extract files from request
    const files = Array.isArray(req.files)
      ? req.files
      : [...(req.files?.images || []), ...(req.files?.image || [])];

    // Call service to handle business logic
    const product = await productService.createProduct(req.body, files);

    // Return success response
    return res.status(201).json({
      success: true,
      id: product.id,
      product,
    });
  } catch (error) {
    // Forward to global error handler
    next(error);
  }
};

// GET /api/products/list
export const listProducts = async (req, res, next) => {
  try {
    const {
      search,
      categoryId,
      page = 1,
      limit = 100,
      includeInactive,
    } = req.query;

    const take = Math.min(Number(limit) || 100, 200);
    const isActive = String(includeInactive || "") === "1" ? null : true;

    // Call service to get products
    const result = await productService.getProducts({
      page: Number(page),
      limit: take,
      search: search ? String(search) : "",
      categoryId: categoryId ? Number(categoryId) : null,
      isActive,
    });

    // Format products using helper
    const data = result.data.map(buildProductSummary);

    return res.json({
      data,
      pagination: {
        page: result.page,
        limit: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listFeaturedProducts = async (req, res, next) => {
  try {
    const includeInactive = String(req.query.includeInactive || "") === "1";
    const limit = Math.min(Number(req.query.limit) || 12, 200);

    // Call service to get featured products
    const items = await productService.getFeaturedProducts(
      limit,
      includeInactive,
    );

    // Format products using helper
    const data = items.map(buildProductSummary);

    // Return consistent format with pagination info
    return res.json({
      data,
      pagination: {
        page: 1,
        limit: data.length,
        total: data.length,
        totalPages: 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/product/:idOrSlug
export const getProduct = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;

    // Call service to get product by ID or slug
    const product = /^\d+$/.test(idOrSlug)
      ? await productService.getProductById(Number(idOrSlug))
      : await productService.getProductBySlug(String(idOrSlug));

    // Format product using helper
    const data = buildProductDetail(product);
    return res.json(data);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/product/:id
export const updateProduct = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "invalid id" });
    }

    // Extract files from request
    const files = Array.isArray(req.files)
      ? req.files
      : [...(req.files?.newImages || []), ...(req.files?.images || [])];

    // Call service to handle business logic
    const product = await productService.updateProduct(id, req.body, files);

    return res.json({
      success: true,
      id: product.id,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/products/remove
export const removeProduct = async (req, res, next) => {
  try {
    const { id } = req.body;
    const pid = Number(id);
    if (!pid)
      return res.status(400).json({ success: false, message: "id required" });

    await prisma.product.delete({ where: { id: pid } });

    return res.json({ success: true, message: "Product removed" });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/product/:id
export const deleteProduct = async (req, res, next) => {
  try {
    const pid = Number(req.params.id);
    if (!pid)
      return res.status(400).json({ success: false, message: "invalid id" });

    // Remove from carts so customers can't buy it
    await prisma.cartItem.deleteMany({ where: { productId: pid } });

    // Cloudinary cleanup for all media
    const medias = await prisma.productMedia.findMany({
      where: { productId: pid },
    });
    for (const m of medias) {
      if (m.url) {
        try {
          const match = m.url.match(/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/);
          const publicId = match ? match[1] : null;
          if (publicId) await cloudinary.uploader.destroy(publicId);
        } catch (e) {
          console.warn("Cloudinary destroy failed:", e?.message || e);
        }
      }
    }

    await prisma.product.delete({ where: { id: pid } });
    return res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    next(error);
  }
};
