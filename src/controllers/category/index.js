// Import all functions first
import { createCategory, listCategories, getCategory } from "./crud.js";
import { updateCategory, deleteCategory } from "./mutations.js";
import { uniqueCategorySlug, validateNoCycle } from "./helpers.js";

// Re-export all functions
export { createCategory, listCategories, getCategory };
export { updateCategory, deleteCategory };
export { uniqueCategorySlug, validateNoCycle };

// Default export for backward compatibility
export default {
  createCategory,
  listCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  uniqueCategorySlug,
  validateNoCycle,
};
