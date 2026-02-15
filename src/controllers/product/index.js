// Core CRUD operations
import {
  addProduct,
  listProducts,
  listFeaturedProducts,
  getProduct,
  updateProduct,
  removeProduct,
  deleteProduct,
} from "./productCrud.js";

// Category management
import {
  setProductCategories,
  addProductCategory,
  removeProductCategoryLink,
} from "./category.js";

// Media management
import {
  addProductMedia,
  deleteProductMedia,
  reorderProductMedia,
  updateProductMedia,
} from "./media.js";

// Variant management
import {
  createVariant,
  updateVariant,
  deleteVariant,
  getProductVariants,
  getVariant,
} from "./variant.js";

// Pricing management
import {
  setVariantPrice,
  getVariantPricesController,
  updateVariantPrice,
  deleteVariantPrice,
} from "./price.js";

// Inventory management
import { getInventory, updateInventory } from "./inventory.js";

// Utility functions
import { slugify, uniqueSlug } from "../../utils/helpers.js";

// Re-export all functions for named imports
export {
  addProduct,
  removeProduct,
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
  getVariantPricesController,
  updateVariantPrice,
  deleteVariantPrice,
  getInventory,
  updateInventory,
  slugify,
  uniqueSlug,
};

// Default export for backward compatibility
export default {
  addProduct,
  removeProduct,
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
  getVariantPricesController,
  updateVariantPrice,
  deleteVariantPrice,
  getInventory,
  updateInventory,
  slugify,
  uniqueSlug,
};
