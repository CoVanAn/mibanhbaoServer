import express from "express";
import multer from "multer";
import {
  createProduct,
  listProducts,
  listFeaturedProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  setProductCategories,
  addProductCategory,
  removeProductCategoryLink,
  addProductMedia,
  deleteProductMedia,
  reorderProductMedia,
  updateProductMedia,
  createVariant,
  updateVariant,
  deleteVariant,
  getProductVariants,
  getVariant,
  setVariantPrice,
  getVariantPrices,
  updateVariantPrice,
  deleteVariantPrice,
  getInventory,
  updateInventory,
} from "../controllers/product/index.js";
import authMiddleware from "../middleware/auth.js";
import { requireRoles } from "../middleware/roles.js";
import { validate, validateParams } from "../middleware/validate.js";
import {
  createVariantSchema,
  updateVariantSchema,
  setPriceSchema,
  updateInventorySchema,
  productIdSchema,
  variantIdSchema,
  productVariantParamsSchema,
  productCategoryParamsSchema,
  productMediaParamsSchema,
  productVariantPriceParamsSchema,
} from "../schemas/product.schema.js";

const router = express.Router();

// Use memory storage so we can stream directly to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/webp",
  ];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  return cb(new Error("Unsupported file type. Only PNG, JPEG, WEBP allowed."));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 }, // 5MB per file, max 10 files
});

// Helper to catch Multer errors and send 400 instead of 500
const withUpload = (uploader) => (req, res, next) =>
  uploader(req, res, (err) => {
    if (err) {
      return res
        .status(400)
        .json({ success: false, message: err.message || "Lỗi tải tệp" });
    }
    return next();
  });

// New endpoints (accept multiple with any field name)
router.post(
  "/add",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  withUpload(upload.any()),
  createProduct,
);
router.get("/list", listProducts);
router.get("/featured", listFeaturedProducts);
router.get("/:idOrSlug", getProduct);
router.patch(
  "/:id",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(productIdSchema),
  withUpload(upload.any()),
  updateProduct,
);
router.delete(
  "/:id",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(productIdSchema),
  deleteProduct,
);

// Category links
router.put(
  "/:id/categories",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(productIdSchema),
  setProductCategories,
);
router.post(
  "/:id/categories/:categoryId",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(productCategoryParamsSchema),
  addProductCategory,
);
router.delete(
  "/:id/categories/:categoryId",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(productCategoryParamsSchema),
  removeProductCategoryLink,
);

// Media
router.post(
  "/:id/media",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(productIdSchema),
  withUpload(upload.any()),
  addProductMedia,
);
router.delete(
  "/:id/media/:mediaId",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(productMediaParamsSchema),
  deleteProductMedia,
);
router.patch(
  "/:id/media/reorder",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(productIdSchema),
  reorderProductMedia,
);
router.patch(
  "/:id/media/:mediaId",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(productMediaParamsSchema),
  updateProductMedia,
);

// Variants
router.get(
  "/:id/variants",
  validateParams(productIdSchema),
  getProductVariants,
);
router.get(
  "/:id/variants/:variantId",
  validateParams(productVariantParamsSchema),
  getVariant,
);
router.post(
  "/:id/variants",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(productIdSchema),
  validate(createVariantSchema),
  createVariant,
);
router.patch(
  "/:id/variants/:variantId",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(productVariantParamsSchema),
  validate(updateVariantSchema),
  updateVariant,
);
router.delete(
  "/:id/variants/:variantId",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(productVariantParamsSchema),
  deleteVariant,
);

// Price - with product ID validation
router.post(
  "/:id/variants/:variantId/price",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(productVariantParamsSchema),
  validate(setPriceSchema),
  setVariantPrice,
);
router.get(
  "/:id/variants/:variantId/prices",
  validateParams(productVariantParamsSchema),
  getVariantPrices,
);
router.patch(
  "/:id/variants/:variantId/price/:priceId",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(productVariantPriceParamsSchema),
  updateVariantPrice,
);
router.delete(
  "/:id/variants/:variantId/price/:priceId",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(productVariantPriceParamsSchema),
  deleteVariantPrice,
);

// Inventory
router.get(
  "/:id/variants/:variantId/inventory",
  validateParams(productVariantParamsSchema),
  getInventory,
);
router.patch(
  "/:id/variants/:variantId/inventory",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(productVariantParamsSchema),
  validate(updateInventorySchema),
  updateInventory,
);

// Inventory - shorthand
router.get("/variant/:variantId", validateParams(variantIdSchema), getVariant);
router.get(
  "/variant/:variantId/inventory",
  validateParams(variantIdSchema),
  getInventory,
);
router.patch(
  "/variant/:variantId/inventory",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(variantIdSchema),
  validate(updateInventorySchema),
  updateInventory,
);

export default router;
