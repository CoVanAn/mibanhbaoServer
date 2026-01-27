# Validation Schemas Documentation

## Overview

This project uses **Joi** for input validation on all API endpoints. Validation schemas are organized by domain (cart, user, product, category) and applied via middleware.

## Benefits

✅ **Security**: Prevent injection attacks and invalid data  
✅ **Consistency**: Same validation rules across all endpoints  
✅ **Better UX**: Clear, structured error messages  
✅ **Type Safety**: Auto-convert and validate types  
✅ **Maintenance**: Centralized validation logic

## Schema Files

```
Server/schemas/
├── cart.schema.js      # Cart & checkout validation
├── user.schema.js      # Auth & profile validation
├── product.schema.js   # Product & inventory validation
├── category.schema.js  # Category validation
└── index.js            # Re-exports all schemas
```

## Middleware

```
Server/middleware/
└── validate.js
    ├── validate(schema)        # Validate request body
    ├── validateParams(schema)  # Validate URL params
    └── validateQuery(schema)   # Validate query string
```

## Usage Examples

### In Routes

```javascript
import { validate, validateParams } from "../middleware/validate.js";
import { addToCartSchema, cartItemIdSchema } from "../schemas/cart.schema.js";

// Validate body
router.post("/items", validate(addToCartSchema), addItemToCart);

// Validate params
router.put(
  "/items/:itemId",
  validateParams(cartItemIdSchema),
  validate(updateCartItemSchema),
  updateCartItem,
);
```

### Error Response Format

When validation fails, returns structured errors:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    },
    {
      "field": "password",
      "message": "Password must be at least 6 characters"
    }
  ]
}
```

## Cart Schemas

### `addToCartSchema`

**Endpoint**: `POST /api/cart/items`

```javascript
{
  variantId: number (required, positive),
  productId: number (required, positive),
  quantity: number (1-999, default: 1),
  guestToken: string (optional)
}
```

### `updateCartItemSchema`

**Endpoint**: `PUT /api/cart/items/:itemId`

```javascript
{
  quantity: number(0 - 999, required); // 0 = remove item
}
```

### `applyCouponSchema`

**Endpoint**: `POST /api/cart/coupon`

```javascript
{
  couponCode: string (3-50 chars, uppercase, required)
}
```

### `mergeCartSchema`

**Endpoint**: `POST /api/cart/merge`

```javascript
{
  guestToken: string(required);
}
```

## User Schemas

### `registerUserSchema`

**Endpoint**: `POST /api/user/register`

```javascript
{
  name: string (2-100 chars, required),
  email: string (valid email, lowercase, required),
  phone: string (10-11 digits, optional),
  password: string (6-128 chars, required)
}
```

### `loginUserSchema`

**Endpoint**: `POST /api/user/login`

```javascript
{
  email: string (valid email, lowercase, required),
  password: string (required)
}
```

### `updateProfileSchema`

**Endpoint**: `PATCH /api/user/profile`

```javascript
{
  name: string (2-100 chars, optional),
  phone: string (10-11 digits, optional),
  avatar: string (valid URL, optional)
}
```

### `changePasswordSchema`

**Endpoint**: `POST /api/user/change-password`

```javascript
{
  currentPassword: string (required),
  newPassword: string (6-128 chars, required)
}
```

### `addressSchema`

**Endpoint**: `POST /api/user/addresses`, `PATCH /api/user/addresses/:id`

```javascript
{
  recipientName: string (2-100 chars, required),
  phone: string (10-11 digits, required),
  street: string (5-200 chars, required),
  ward: string (optional),
  district: string (required),
  city: string (required),
  country: string (default: "Vietnam"),
  postalCode: string (optional),
  isDefault: boolean (default: false)
}
```

## Product Schemas

### `createProductSchema`

**Endpoint**: `POST /api/product/add`

```javascript
{
  name: string (2-200 chars, required),
  slug: string (lowercase, a-z0-9-, optional),
  description: string (max 500 chars, optional),
  content: string (HTML, optional),
  isActive: boolean (default: true),
  isFeatured: boolean (default: false),
  categoryIds: array of numbers (min 1, optional)
}
```

### `createVariantSchema`

**Endpoint**: `POST /api/product/:id/variants`

```javascript
{
  productId: number (required),
  name: string (1-100 chars, required),
  sku: string (uppercase, A-Z0-9-, required),
  barcode: string (optional),
  weightGram: number (min 0, optional),
  isActive: boolean (default: true)
}
```

### `setPriceSchema`

**Endpoint**: `POST /api/product/:id/variants/:variantId/price`

```javascript
{
  variantId: number (required),
  amount: number (positive, 2 decimals, required),
  startsAt: date (ISO, optional),
  endsAt: date (ISO, must be after startsAt, optional),
  isActive: boolean (default: true)
}
```

### `updateInventorySchema`

**Endpoint**: `PATCH /api/product/:id/variants/:variantId/inventory`

```javascript
{
  quantity: number (min 0, required),
  safetyStock: number (min 0, default: 0)
}
```

## Category Schemas

### `createCategorySchema`

**Endpoint**: `POST /api/category/add`

```javascript
{
  name: string (2-100 chars, required),
  slug: string (lowercase, a-z0-9-, optional),
  description: string (max 500 chars, optional),
  parentId: number (positive, optional),
  position: number (min 0, default: 0),
  isActive: boolean (default: true),
  isFeatured: boolean (default: false)
}
```

### `updateCategorySchema`

**Endpoint**: `PATCH /api/category/:id`

```javascript
{
  name: string (2-100 chars, optional),
  slug: string (lowercase, a-z0-9-, optional),
  description: string (max 500 chars, optional),
  parentId: number (positive, optional),
  position: number (min 0, optional),
  isActive: boolean (optional),
  isFeatured: boolean (optional)
}
```

## Validation Features

### Auto Type Conversion

```javascript
// Input: { quantity: "5" }
// After validation: { quantity: 5 }
```

### Strip Unknown Fields

```javascript
// Input: { variantId: 1, hackField: "evil" }
// After validation: { variantId: 1 }
```

### Custom Error Messages

Each field has specific, user-friendly error messages:

```javascript
variantId: Joi.number().positive().required().messages({
  "number.base": "Variant ID must be a number",
  "number.positive": "Variant ID must be positive",
  "any.required": "Variant ID is required",
});
```

### Conditional Validation

```javascript
endsAt: Joi.date().min(Joi.ref("startsAt")); // Must be after startsAt
```

## Adding New Schemas

1. **Create schema in appropriate file**:

```javascript
// schemas/order.schema.js
export const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        variantId: Joi.number().required(),
        quantity: Joi.number().min(1).required(),
      }),
    )
    .min(1)
    .required(),
  paymentMethod: Joi.string().valid("COD", "CARD").required(),
});
```

2. **Apply in route**:

```javascript
import { validate } from "../middleware/validate.js";
import { createOrderSchema } from "../schemas/order.schema.js";

router.post(
  "/orders",
  authMiddleware,
  validate(createOrderSchema),
  createOrder,
);
```

## Testing Validation

### Valid Request

```bash
curl -X POST http://localhost:4000/api/cart/items \
  -H "Content-Type: application/json" \
  -d '{"variantId": 1, "productId": 1, "quantity": 2}'
```

### Invalid Request (Triggers Validation)

```bash
curl -X POST http://localhost:4000/api/cart/items \
  -H "Content-Type: application/json" \
  -d '{"variantId": "abc", "quantity": -5}'
```

**Response**:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "variantId",
      "message": "Variant ID must be a number"
    },
    {
      "field": "productId",
      "message": "Product ID is required"
    },
    {
      "field": "quantity",
      "message": "Quantity must be at least 1"
    }
  ]
}
```

## Best Practices

1. ✅ **Always validate user input** - Never trust client data
2. ✅ **Use specific error messages** - Help users fix their mistakes
3. ✅ **Validate params too** - Not just body, also URL params
4. ✅ **Set sensible defaults** - Reduce required fields
5. ✅ **Strip unknown fields** - Prevent extra data from passing through
6. ✅ **Convert types** - Let Joi handle "123" → 123 conversion
7. ✅ **Add field constraints** - min/max, pattern, valid values

## Common Patterns

### Email Validation

```javascript
email: Joi.string().trim().lowercase().email().required();
```

### Phone Validation (Vietnam)

```javascript
phone: Joi.string().pattern(/^[0-9]{10,11}$/);
```

### Slug Validation

```javascript
slug: Joi.string().pattern(/^[a-z0-9-]+$/);
```

### SKU Validation

```javascript
sku: Joi.string()
  .uppercase()
  .pattern(/^[A-Z0-9-]+$/);
```

### Price Validation

```javascript
amount: Joi.number().positive().precision(2).required();
```

### Array with Min Items

```javascript
categoryIds: Joi.array().items(Joi.number()).min(1);
```

## Migration Guide

If you have existing controllers with manual validation:

**Before**:

```javascript
export async function addItemToCart(req, res) {
  const { variantId, productId, quantity } = req.body;

  if (!variantId || !productId) {
    return res.status(400).json({ message: "Missing fields" });
  }

  if (quantity < 1) {
    return res.status(400).json({ message: "Invalid quantity" });
  }

  // ... rest of logic
}
```

**After**:

```javascript
// In route:
router.post("/items", validate(addToCartSchema), addItemToCart);

// In controller:
export async function addItemToCart(req, res) {
  // req.body is already validated and sanitized
  const { variantId, productId, quantity } = req.body;

  // ... business logic only
}
```

## Resources

- [Joi Documentation](https://joi.dev/api/)
- [Joi GitHub](https://github.com/hapijs/joi)
- Custom error messages: `schema.messages({ ... })`
- Conditional validation: `Joi.when()`, `Joi.ref()`
- Custom validators: `schema.custom((value, helpers) => { ... })`
