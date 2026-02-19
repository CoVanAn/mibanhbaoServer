/**
 * Validation Schemas Index
 * Central export point for all Zod validation schemas
 */

// Cart schemas
export * from "./cart.schema.js";

// User schemas
export * from "./user.schema.js";

// Product schemas
export * from "./product.schema.js";

// Category schemas
export * from "./category.schema.js";

// Order schemas
export * from "./order.schema.js";

// Re-export for convenience
import * as cartSchemas from "./cart.schema.js";
import * as userSchemas from "./user.schema.js";
import * as productSchemas from "./product.schema.js";
import * as categorySchemas from "./category.schema.js";
import * as orderSchemas from "./order.schema.js";

export default {
  cart: cartSchemas,
  user: userSchemas,
  product: productSchemas,
  category: categorySchemas,
  order: orderSchemas,
};
