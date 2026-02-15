import prisma from "../config/prisma.js";
import { BaseRepository } from "./base.repository.js";
import { DatabaseError } from "../exceptions/index.js";
import { setPermanentPrice } from "../utils/priceHelpers.js";
import { createInventoryForVariant } from "../utils/inventoryHelpers.js";

/**
 * Product Repository
 * Handles all database operations related to products
 */
export class ProductRepository extends BaseRepository {
  constructor() {
    super(prisma.product);
  }

  /**
   * Find products with variants and prices
   */
  async findProductsWithDetails(options = {}) {
    const {
      where = {},
      skip = 0,
      take = 20,
      orderBy = { createdAt: "desc" },
    } = options;

    try {
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            media: {
              orderBy: { position: "asc" },
            },
            variants: {
              include: {
                prices: true,
                inventory: true,
              },
            },
            categories: {
              include: {
                category: true,
              },
            },
          },
        }),
        prisma.product.count({ where }),
      ]);

      return {
        data: products,
        total,
        page: Math.floor(skip / take) + 1,
        pageSize: take,
        totalPages: Math.ceil(total / take),
      };
    } catch (error) {
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Find product by slug with all details
   */
  async findBySlug(slug) {
    try {
      return await prisma.product.findUnique({
        where: { slug },
        include: {
          media: {
            orderBy: { position: "asc" },
          },
          variants: {
            include: {
              prices: {
                where: { isActive: true },
              },
              inventory: true,
            },
          },
          categories: {
            include: {
              category: true,
            },
          },
        },
      });
    } catch (error) {
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Find featured products
   */
  async findFeatured(limit = 100, includeInactive = false) {
    try {
      const where = {
        isFeatured: true,
      };

      // Only filter by isActive if includeInactive is false
      if (!includeInactive) {
        where.isActive = true;
      }

      return await prisma.product.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          media: {
            orderBy: { position: "asc" },
          },
          variants: {
            include: {
              prices: true,
              inventory: true,
            },
          },
          categories: {
            include: {
              category: true,
            },
          },
        },
      });
    } catch (error) {
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Check if slug exists
   */
  async slugExists(slug, excludeId = null) {
    try {
      const where = { slug };
      if (excludeId) {
        where.id = { not: excludeId };
      }

      return await this.exists(where);
    } catch (error) {
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Update product categories
   */
  async updateCategories(productId, categoryIds) {
    try {
      await prisma.$transaction([
        // Remove existing categories
        prisma.productCategory.deleteMany({
          where: { productId },
        }),
        // Add new categories
        prisma.productCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            productId,
            categoryId,
          })),
        }),
      ]);
    } catch (error) {
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Create product with full setup (variant, price, inventory, media)
   * This is a complex operation that creates product + variant + price + inventory + media
   */
  async createProductWithSetup(
    productData,
    variantData,
    priceData,
    inventoryData,
    mediaUrls = [],
  ) {
    try {
      // 1. Create product first
      const product = await prisma.product.create({
        data: {
          name: productData.name,
          slug: productData.slug,
          description: productData.description || null,
          content: productData.content || null,
          isActive: productData.isActive ?? true,
          isFeatured: productData.isFeatured ?? false,
        },
      });

      // 2. Create product categories if provided
      if (productData.categoryIds && productData.categoryIds.length > 0) {
        await prisma.productCategory.createMany({
          data: productData.categoryIds.map((categoryId) => ({
            productId: product.id,
            categoryId,
          })),
        });
      }

      // 3. Create default variant
      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          name: variantData.name || "Default",
          sku: variantData.sku || `${product.slug}-default`,
          barcode: variantData.barcode || null,
          weightGram: variantData.weightGram || null,
          isActive: variantData.isActive ?? true,
        },
      });

      // 4. Create permanent price using helper (deactivates old prices)
      await setPermanentPrice(variant.id, priceData.amount);

      // 5. Create inventory using helper (handles duplicates)
      await createInventoryForVariant(
        variant.id,
        inventoryData.quantity ?? 0,
        inventoryData.safetyStock ?? 0,
      );

      // 6. Create media if provided
      if (mediaUrls.length > 0) {
        await prisma.productMedia.createMany({
          data: mediaUrls.map((url, idx) => ({
            productId: product.id,
            url,
            position: idx,
          })),
        });
      }

      return product;
    } catch (error) {
      console.error("Create product with setup error:", error);
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Check if category exists
   */
  async categoryExists(categoryId) {
    try {
      const count = await prisma.category.count({
        where: { id: categoryId },
      });
      return count > 0;
    } catch (error) {
      throw new DatabaseError(error.message);
    }
  }
}

export default new ProductRepository();
