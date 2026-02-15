import productRepository from "../repositories/product.repository.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ValidationError,
} from "../exceptions/index.js";
import { slugify, uniqueSlug } from "../utils/helpers.js";
import {
  validateProductContent,
  sanitizeProductContent,
} from "../utils/htmlSanitizer.js";
import cloudinary from "../config/cloudinary.js";
import prisma from "../config/prisma.js";
import { setPermanentPrice } from "../utils/priceHelpers.js";
import { createInventoryForVariant } from "../utils/inventoryHelpers.js";

/**
 * Product Service
 * Handles business logic for product operations
 */
export class ProductService {
  /**
   * Get all products with pagination
   */
  async getProducts(options = {}) {
    const {
      page = 1,
      limit = 20,
      search = "",
      categoryId = null,
      isFeatured = null,
      isActive = true,
    } = options;

    const skip = (page - 1) * limit;
    const where = {};

    // Filter by search (only on name field, matching original logic)
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    // Filter by category
    if (categoryId) {
      where.categories = {
        some: { categoryId: parseInt(categoryId) },
      };
    }

    // Filter by featured
    if (isFeatured !== null) {
      where.isFeatured = isFeatured;
    }

    // Filter by active status
    if (isActive !== null) {
      where.isActive = isActive;
    }

    return await productRepository.findProductsWithDetails({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit = 100, includeInactive = false) {
    return await productRepository.findFeatured(limit, includeInactive);
  }

  /**
   * Get product by ID
   */
  async getProductById(id) {
    const product = await productRepository.findById(id, {
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
    });

    if (!product) {
      throw new NotFoundError("Product");
    }

    return product;
  }

  /**
   * Get product by slug
   */
  async getProductBySlug(slug) {
    const product = await productRepository.findBySlug(slug);

    if (!product) {
      throw new NotFoundError("Product");
    }

    return product;
  }

  /**
   * Create a new product
   */
  async createProduct(data, files = []) {
    const {
      name,
      price,
      description,
      content,
      categoryId,
      categoryIds,
      quantity,
      safetyStock,
      slug: customSlug,
      ...productData
    } = data;

    // === VALIDATION ===
    if (!name || !name.trim()) {
      throw new ValidationError("Product name is required");
    }

    if (price === undefined || price === null || String(price).trim() === "") {
      throw new ValidationError("Price is required");
    }

    const priceStr = String(price).trim();
    if (isNaN(Number(priceStr))) {
      throw new ValidationError("Price must be a valid number");
    }

    const priceAmount = Number(priceStr);
    if (priceAmount < 0) {
      throw new ValidationError("Price cannot be negative");
    }

    // === CONTENT VALIDATION & SANITIZATION ===
    let sanitizedContent = null;
    if (content && content.trim()) {
      const validation = validateProductContent(content);
      if (!validation.isValid) {
        throw new ValidationError(
          `Content validation failed: ${validation.errors.join(", ")}`,
        );
      }

      sanitizedContent = sanitizeProductContent(content);
      if (!sanitizedContent) {
        throw new ValidationError("Content sanitization failed");
      }
    }

    // === CATEGORY VALIDATION ===
    const finalCategoryIds = [];

    // Support both single categoryId and array categoryIds
    if (categoryIds && Array.isArray(categoryIds)) {
      finalCategoryIds.push(...categoryIds.map(Number));
    } else if (
      categoryId !== undefined &&
      categoryId !== null &&
      String(categoryId).trim() !== ""
    ) {
      const cid = Number(categoryId);
      if (Number.isNaN(cid)) {
        throw new ValidationError("categoryId must be a number");
      }
      finalCategoryIds.push(cid);
    }

    // Validate categories exist
    if (finalCategoryIds.length > 0) {
      for (const cid of finalCategoryIds) {
        const exists = await productRepository.categoryExists(cid);
        if (!exists) {
          throw new NotFoundError(`Category with ID ${cid}`);
        }
      }
    }

    // === SLUG GENERATION ===
    let slug = customSlug || slugify(name);

    // Ensure slug is unique
    const slugExists = await productRepository.slugExists(slug);
    if (slugExists) {
      slug = uniqueSlug(name);
    }

    // === BOOLEAN FIELD CONVERSION ===
    // Convert string boolean values from form data to actual booleans
    const isActiveBoolean =
      productData.isActive === true ||
      productData.isActive === "true" ||
      productData.isActive === "1";

    const isFeaturedBoolean =
      productData.isFeatured === true ||
      productData.isFeatured === "true" ||
      productData.isFeatured === "1";

    // === IMAGE UPLOAD ===
    const uploadedUrls = [];
    if (files && files.length > 0) {
      const folder = process.env.CLOUDINARY_FOLDER || "mibanhbao/products";

      for (const file of files) {
        try {
          const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder, resource_type: "image" },
              (err, result) => (err ? reject(err) : resolve(result)),
            );
            stream.end(file.buffer);
          });

          uploadedUrls.push(uploadResult.secure_url);
        } catch (error) {
          console.error("Cloudinary upload error:", error?.message || error);
          throw new BadRequestError("Image upload failed");
        }
      }
    }

    // === CREATE PRODUCT WITH TRANSACTION ===
    const product = await productRepository.createProductWithSetup(
      {
        name,
        slug,
        description: description || null,
        content: sanitizedContent,
        categoryIds: finalCategoryIds,
        isActive: isActiveBoolean,
        isFeatured: isFeaturedBoolean,
      },
      {
        name: "Default",
        sku: `${slug}-default`,
      },
      {
        amount: priceAmount,
      },
      {
        quantity: quantity !== undefined ? Number(quantity) : 0,
        safetyStock: safetyStock !== undefined ? Number(safetyStock) : 0,
      },
      uploadedUrls,
    );

    return await this.getProductById(product.id);
  }

  /**
   * Update product (comprehensive update with all fields)
   */
  async updateProduct(id, data, files = []) {
    const {
      name,
      description,
      content,
      isActive,
      isFeatured,
      price,
      categoryId,
      existingImageIds,
      imagePositions,
      slug: customSlug,
    } = data;

    // Check if product exists
    const existing = await this.getProductById(id);

    const updateData = {};

    // Handle name and slug update
    if (name && name !== existing.name) {
      updateData.name = name;
      updateData.slug = await uniqueSlug(name, "product");
    }

    // Handle description update
    if (description !== undefined) {
      updateData.description = description || null;
    }

    // Handle content update with validation
    if (content !== undefined) {
      if (content && content.trim()) {
        const validation = validateProductContent(content);
        if (!validation.isValid) {
          throw new ValidationError(
            `Content validation failed: ${validation.errors.join(", ")}`,
          );
        }

        const sanitizedContent = sanitizeProductContent(content);
        if (!sanitizedContent) {
          throw new ValidationError("Content sanitization failed");
        }
        updateData.content = sanitizedContent;
      } else {
        updateData.content = null;
      }
    }

    // Handle boolean fields
    if (isActive !== undefined) {
      updateData.isActive =
        typeof isActive === "boolean" ? isActive : String(isActive) === "true";
    }

    if (isFeatured !== undefined) {
      updateData.isFeatured =
        typeof isFeatured === "boolean"
          ? isFeatured
          : String(isFeatured) === "true";
    }

    // Update product basic info
    const updated = await productRepository.update(id, updateData);

    // Handle price update
    if (price !== undefined && price !== null && String(price).trim() !== "") {
      const priceValue = Number(String(price).trim());

      if (!isNaN(priceValue)) {
        // Get or create default variant
        let variant = await prisma.productVariant.findFirst({
          where: { productId: id, name: "Default" },
        });

        if (!variant) {
          variant = await prisma.productVariant.findFirst({
            where: { productId: id },
            orderBy: { createdAt: "asc" },
          });
        }

        if (!variant) {
          variant = await prisma.productVariant.create({
            data: {
              productId: id,
              name: "Default",
              sku: `${updated.slug}-default`,
              isActive: true,
            },
          });
          await createInventoryForVariant(variant.id, 0, 0);
        }

        // Get current price to check if update needed
        const { getCurrentPrice } = await import("../utils/priceHelpers.js");
        const currentPrice = await getCurrentPrice(variant.id);
        const currentAmount = currentPrice ? Number(currentPrice.amount) : null;

        // Only update if price changed
        if (currentAmount !== priceValue) {
          await setPermanentPrice(variant.id, priceValue);
        }
      }
    }

    // Handle category update
    if (categoryId !== undefined) {
      // Remove existing categories
      await prisma.productCategory.deleteMany({
        where: { productId: id },
      });

      // Add new category if provided
      if (
        categoryId &&
        categoryId !== null &&
        String(categoryId).trim() !== ""
      ) {
        const catId = Number(categoryId);
        if (!isNaN(catId)) {
          const categoryExists = await productRepository.categoryExists(catId);
          if (categoryExists) {
            await prisma.productCategory.create({
              data: { productId: id, categoryId: catId },
            });
          }
        }
      }
    }

    // Handle image positions update
    let parsedImagePositions = imagePositions;
    if (typeof imagePositions === "string") {
      try {
        parsedImagePositions = JSON.parse(imagePositions);
      } catch (e) {
        parsedImagePositions = [];
      }
    }

    if (
      Array.isArray(parsedImagePositions) &&
      parsedImagePositions.length > 0
    ) {
      for (const positionData of parsedImagePositions) {
        if (positionData.id && positionData.position !== undefined) {
          await prisma.productMedia.updateMany({
            where: {
              productId: id,
              id: Number(positionData.id),
            },
            data: {
              position: Number(positionData.position),
            },
          });
        }
      }
    }

    // Handle new image uploads
    if (files && files.length > 0) {
      const folder = process.env.CLOUDINARY_FOLDER || "mibanhbao/products";

      // Get current max position
      const maxPosition = await prisma.productMedia.findFirst({
        where: { productId: id },
        orderBy: { position: "desc" },
        select: { position: true },
      });

      let startPosition = (maxPosition?.position || -1) + 1;

      for (const file of files) {
        try {
          const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder, resource_type: "image" },
              (err, result) => (err ? reject(err) : resolve(result)),
            );
            stream.end(file.buffer);
          });

          await prisma.productMedia.create({
            data: {
              productId: id,
              url: uploadResult.secure_url,
              alt: `${updated.name} - Image ${startPosition + 1}`,
              position: startPosition++,
            },
          });
        } catch (uploadError) {
          console.error("Image upload error:", uploadError);
          throw new BadRequestError("Image upload failed");
        }
      }
    }

    // Remove images not in existingImageIds
    if (Array.isArray(existingImageIds)) {
      const numericImageIds = existingImageIds
        .map((id) => Number(id))
        .filter((id) => !isNaN(id));

      if (numericImageIds.length > 0) {
        await prisma.productMedia.deleteMany({
          where: {
            productId: id,
            id: { notIn: numericImageIds },
          },
        });
      } else {
        // If no existing images specified, remove all
        await prisma.productMedia.deleteMany({
          where: { productId: id },
        });
      }
    }

    // If product is deactivated, remove it from all carts
    if (updateData.isActive === false) {
      await prisma.cartItem.deleteMany({ where: { productId: id } });
    }

    return await this.getProductById(id);
  }

  /**
   * Delete product (soft delete by setting isActive to false)
   */
  async deleteProduct(id) {
    await this.getProductById(id);
    return await productRepository.update(id, { isActive: false });
  }

  /**
   * Permanently delete product
   */
  async permanentlyDeleteProduct(id) {
    await this.getProductById(id);
    return await productRepository.delete(id);
  }

  /**
   * Toggle product featured status
   */
  async toggleFeatured(id) {
    const product = await this.getProductById(id);
    return await productRepository.update(id, {
      isFeatured: !product.isFeatured,
    });
  }
}

export default new ProductService();
