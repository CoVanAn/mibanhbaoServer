import express from "express";
import multer from "multer";
import {
  addProduct,
  listProducts,
  getProduct,
  updateProduct,
  removeProduct,
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
  setVariantPrice,
  getVariantPrices,
  getInventory,
  updateInventory,
} from "../controllers/product/productController.js";
import authMiddleware from "../middleware/auth.js";
import { requireRoles } from "../middleware/roles.js";

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
        .json({ success: false, message: err.message || "Upload error" });
    }
    return next();
  });

// New endpoints (accept multiple with any field name)
router.post(
  "/add",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  withUpload(upload.any()),
  addProduct
);
router.get("/list", listProducts);
router.get("/:idOrSlug", getProduct);
router.patch(
  "/:id",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  updateProduct
);
// Fallbacks for clients without PATCH
router.put(
  "/:id",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  updateProduct
);
router.post(
  "/update/:id",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  updateProduct
);
router.post(
  "/remove",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  removeProduct
);
router.delete(
  "/:id",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  deleteProduct
);

// Category links
router.put(
  "/:id/categories",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  setProductCategories
);
router.post(
  "/:id/categories/:categoryId",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  addProductCategory
);
router.delete(
  "/:id/categories/:categoryId",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  removeProductCategoryLink
);

// Media
router.post(
  "/:id/media",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  withUpload(upload.any()),
  addProductMedia
);
router.delete(
  "/:id/media/:mediaId",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  deleteProductMedia
);
router.patch(
  "/:id/media/reorder",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  reorderProductMedia
);
router.patch(
  "/:id/media/:mediaId",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  updateProductMedia
);

// Variants
router.post(
  "/:id/variants",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  createVariant
);
router.patch(
  "/variant/:variantId",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  updateVariant
);
router.delete(
  "/variant/:variantId",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  deleteVariant
);

// Price
router.post(
  "/variant/:variantId/price",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  setVariantPrice
);
router.get("/variant/:variantId/prices", getVariantPrices);

// Inventory
router.get("/variant/:variantId/inventory", getInventory);
router.patch(
  "/variant/:variantId/inventory",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  updateInventory
);

export default router;
