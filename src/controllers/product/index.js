// Core CRUD operations
import {
  createProduct,
  listProducts,
  listFeaturedProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} from "./crud.js";

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
  getVariantPrices,
  updateVariantPrice,
  deleteVariantPrice,
} from "./price.js";

// Inventory management
import { getInventory, updateInventory } from "./inventory.js";

// Re-export all functions for named imports
export {
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
};

// Default export for backward compatibility
export default {
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
};
