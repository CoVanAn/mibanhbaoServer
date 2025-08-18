// Core CRUD operations
import {
  addProduct,
  listProducts,
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
} from "./productCategories.js";

// Media management
import {
  addProductMedia,
  deleteProductMedia,
  reorderProductMedia,
  updateProductMedia,
} from "./productMedia.js";

// Variant management
import {
  createVariant,
  updateVariant,
  deleteVariant,
  getProductVariants,
  getVariant,
} from "./productVariants.js";

// Pricing management
import { setVariantPrice, getVariantPrices, updateVariantPrice } from "./productPricing.js";

// Inventory management
import { getInventory, updateInventory } from "./productInventory.js";

// Utility functions
import { slugify, uniqueSlug } from "./helpers.js";

// Re-export all functions for named imports
export {
  addProduct,
  removeProduct,
  listProducts,
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
  getInventory,
  updateInventory,
  slugify,
  uniqueSlug,
};
