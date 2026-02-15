// Import all functions first
import { addCategory, listCategory, getCategory } from "./categoryCrud.js";
import { updateCategory, removeCategory } from "./manager.js";
import { uniqueCategorySlug, validateNoCycle } from "./helpers.js";

// Re-export all functions
export { addCategory, listCategory, getCategory };
export { updateCategory, removeCategory };
export { uniqueCategorySlug, validateNoCycle };

// Default export for backward compatibility
export default {
  addCategory,
  listCategory,
  getCategory,
  updateCategory,
  removeCategory,
  uniqueCategorySlug,
  validateNoCycle,
};
