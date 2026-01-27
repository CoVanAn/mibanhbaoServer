# Cart API Documentation

## Overview

The Cart API provides comprehensive shopping cart functionality with support for both authenticated users and guest shoppers. It includes features like:

- ✅ **Guest & User Support**: Works for both logged-in users and guests via guestToken
- ✅ **Auto-merge**: Automatically merges guest cart to user cart after login
- ✅ **Product Variants**: Full support for product variants with pricing
- ✅ **Stock Validation**: Real-time inventory checking
- ✅ **Coupon System**: Apply discount coupons to cart
- ✅ **Price Sync**: Automatically updates prices when they change

## Base URL

```
/api/cart
```

## Authentication

All cart endpoints support **optional authentication**:

- **Authenticated Users**: Pass `Authorization: Bearer <token>` header
- **Guest Users**: Automatically receive `guestToken` cookie on first request

## Endpoints

### 1. Get Cart

Get current cart with all items and totals.

**Endpoint**: `GET /api/cart`

**Authentication**: Optional

**Response**:

```json
{
  "success": true,
  "cart": {
    "id": 123,
    "items": [
      {
        "id": 1,
        "productId": 10,
        "productName": "Bánh Bao Thịt",
        "productSlug": "banh-bao-thit",
        "productImage": "https://...",
        "variantId": 25,
        "variantName": "Size L",
        "variantSku": "BB-THIT-L",
        "quantity": 3,
        "unitPrice": 25000,
        "subtotal": 75000,
        "inStock": 50,
        "isAvailable": true
      }
    ],
    "coupon": {
      "code": "DISCOUNT10",
      "type": "PERCENTAGE",
      "value": 10
    },
    "subtotal": 75000,
    "totalItems": 3,
    "currency": "VND",
    "updatedAt": "2026-01-26T10:30:00.000Z"
  }
}
```

---

### 2. Add Item to Cart

Add a product variant to cart or increase quantity if already exists.

**Endpoint**: `POST /api/cart/items`

**Authentication**: Optional

**Request Body**:

```json
{
  "productId": 10,
  "variantId": 25,
  "quantity": 2
}
```

**Response**:

```json
{
  "success": true,
  "message": "Item added to cart",
  "cart": { ... }
}
```

**Error Responses**:

```json
// Out of stock
{
  "success": false,
  "message": "Only 5 items available in stock"
}

// Product unavailable
{
  "success": false,
  "message": "Product is no longer available"
}
```

---

### 3. Update Cart Item

Update quantity of an existing cart item.

**Endpoint**: `PUT /api/cart/items/:itemId`

**Authentication**: Optional

**Request Body**:

```json
{
  "quantity": 5
}
```

**Note**: Setting `quantity: 0` will remove the item.

**Response**:

```json
{
  "success": true,
  "message": "Cart item updated",
  "cart": { ... }
}
```

---

### 4. Remove Cart Item

Remove a specific item from cart.

**Endpoint**: `DELETE /api/cart/items/:itemId`

**Authentication**: Optional

**Response**:

```json
{
  "success": true,
  "message": "Item removed from cart",
  "cart": { ... }
}
```

---

### 5. Clear Cart

Remove all items from cart.

**Endpoint**: `DELETE /api/cart/clear`

**Authentication**: Optional

**Response**:

```json
{
  "success": true,
  "message": "Cart cleared",
  "cart": {
    "items": [],
    "subtotal": 0,
    "totalItems": 0
  }
}
```

---

### 6. Apply Coupon

Apply a discount coupon to the cart.

**Endpoint**: `POST /api/cart/coupon`

**Authentication**: Optional

**Request Body**:

```json
{
  "couponCode": "DISCOUNT10"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Coupon applied successfully",
  "cart": { ... }
}
```

**Error Responses**:

```json
// Invalid coupon
{
  "success": false,
  "message": "Invalid coupon code"
}

// Expired
{
  "success": false,
  "message": "Coupon has expired"
}

// Minimum not met
{
  "success": false,
  "message": "Minimum order amount of 100000 VND required"
}

// Redemption limit
{
  "success": false,
  "message": "You have reached the redemption limit for this coupon"
}
```

---

### 7. Remove Coupon

Remove applied coupon from cart.

**Endpoint**: `DELETE /api/cart/coupon`

**Authentication**: Optional

**Response**:

```json
{
  "success": true,
  "message": "Coupon removed",
  "cart": { ... }
}
```

---

### 8. Merge Guest Cart to User Cart

After login, merge guest cart into user's cart.

**Endpoint**: `POST /api/cart/merge`

**Authentication**: **Required** (user must be logged in)

**Request Body**:

```json
{
  "guestToken": "guest_abc123..."
}
```

**Response**:

```json
{
  "success": true,
  "message": "Carts merged successfully",
  "cart": { ... }
}
```

**Notes**:

- Automatically combines quantities for duplicate items
- Deletes the guest cart after merge
- Call this endpoint immediately after successful login

---

## Workflow Examples

### Guest Shopping Flow

```javascript
// 1. User browses and adds items (no login)
POST /api/cart/items
{
  "productId": 10,
  "variantId": 25,
  "quantity": 2
}
// guestToken cookie is automatically set

// 2. Get cart
GET /api/cart
// Uses guestToken from cookie

// 3. Update quantity
PUT /api/cart/items/1
{
  "quantity": 3
}
```

---

### User Login & Merge Flow

```javascript
// 1. Guest has items in cart (guestToken: "guest_abc123")
// 2. User logs in
POST / auth / login;
// Receives accessToken

// 3. Merge guest cart to user cart
POST / api / cart / merge;
Authorization: Bearer <
  accessToken >
  {
    guestToken: "guest_abc123",
  };

// 4. Continue shopping as authenticated user
POST / api / cart / items;
Authorization: Bearer <
  accessToken >
  {
    productId: 15,
    variantId: 30,
    quantity: 1,
  };
```

---

## Database Schema

### Cart Model

```prisma
model Cart {
  id         Int       @id @default(autoincrement())
  userId     Int?      // Null for guest carts
  guestToken String?   @unique // Unique token for guest users
  couponId   Int?
  currency   String    @default("VND")
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  user       User?     @relation(...)
  coupon     Coupon?   @relation(...)
  items      CartItem[]
}
```

### CartItem Model

```prisma
model CartItem {
  id        Int      @id @default(autoincrement())
  cartId    Int
  productId Int
  variantId Int
  quantity  Int
  unitPrice Decimal? @db.Decimal(10, 2) // Snapshot of price when added
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  cart      Cart           @relation(...)
  product   Product        @relation(...)
  variant   ProductVariant @relation(...)

  @@unique([cartId, variantId]) // One variant per cart
}
```

---

## Features

### 1. Automatic Price Updates

When items are added or updated, the current variant price is automatically saved:

```javascript
// Price is fetched from latest active Price record
const validation = await validateCartItem(variantId, quantity);
unitPrice: validation.currentPrice;
```

### 2. Stock Validation

Every add/update operation checks inventory:

```javascript
if (variant.inventory && variant.inventory.quantity < quantity) {
  return {
    valid: false,
    error: `Only ${variant.inventory.quantity} items available in stock`,
  };
}
```

### 3. Guest Token Security

- Generated using `crypto.randomBytes(32)` for security
- Stored in HttpOnly cookie (not accessible via JavaScript)
- 30-day expiration
- Prefix: `guest_` for easy identification

### 4. Coupon Validation

Comprehensive validation for:

- Active status
- Start/end dates
- Minimum order amount
- Maximum redemptions (global)
- Per-user redemption limits

---

## Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details (development only)"
}
```

**Common HTTP Status Codes**:

- `200` - Success
- `400` - Bad request (validation error)
- `401` - Unauthorized (authentication required)
- `404` - Resource not found
- `500` - Server error

---

## Frontend Integration Notes

### For Client Project

```typescript
// Use apiClient with automatic token injection
import { apiClient } from "@/lib/api";

// Get cart
const { data } = await apiClient.get("/api/cart");

// Add item
await apiClient.post("/api/cart/items", {
  productId: 10,
  variantId: 25,
  quantity: 2,
});

// Merge after login
await apiClient.post("/api/cart/merge", {
  guestToken: localStorage.getItem("guestToken"),
});
```

### React Query Integration

```typescript
// queries/cart.ts
export const useCart = () => {
  return useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/cart");
      return data.cart;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useAddToCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, variantId, quantity }) => {
      const { data } = await apiClient.post("/api/cart/items", {
        productId,
        variantId,
        quantity,
      });
      return data.cart;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
};
```

---

## Testing

### Manual Testing with curl

```bash
# Get cart (guest)
curl http://localhost:4000/api/cart

# Add item
curl -X POST http://localhost:4000/api/cart/items \
  -H "Content-Type: application/json" \
  -d '{"productId": 1, "variantId": 1, "quantity": 2}'

# Add item (authenticated)
curl -X POST http://localhost:4000/api/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"productId": 1, "variantId": 1, "quantity": 2}'

# Update quantity
curl -X PUT http://localhost:4000/api/cart/items/1 \
  -H "Content-Type: application/json" \
  -d '{"quantity": 5}'

# Apply coupon
curl -X POST http://localhost:4000/api/cart/coupon \
  -H "Content-Type: application/json" \
  -d '{"couponCode": "DISCOUNT10"}'

# Clear cart
curl -X DELETE http://localhost:4000/api/cart/clear
```

---

## Next Steps

To complete cart functionality:

1. **Frontend Integration**:
   - Create cart queries using React Query
   - Build cart components (CartContext, CartItem, CartSummary)
   - Implement merge on login

2. **Order Integration**:
   - Create order from cart endpoint
   - Clear cart after successful order
   - Stock reservation during checkout

3. **Admin Features**:
   - View abandoned carts
   - Cart analytics
   - Coupon management UI

---

## Migration from Old Cart

**Old Implementation** (MongoDB-style):

```javascript
// ❌ Old: cartData as object
cartData: {
  productId: quantity;
}

// ❌ Old: No variant support
// ❌ Old: No price snapshot
// ❌ Old: No guest support
```

**New Implementation** (Prisma):

```javascript
// ✅ New: Relational CartItem model
// ✅ New: Full variant support
// ✅ New: Price snapshot (unitPrice)
// ✅ New: Guest + user support
// ✅ New: Stock validation
// ✅ New: Coupon system
```

**To migrate**:

1. ✅ Backend controllers rewritten
2. ✅ Routes updated
3. ✅ server.js enabled
4. ⏳ Frontend store needs update
5. ⏳ Frontend components need creation

---

## Support

For issues or questions:

- Check error messages in response
- Review validation requirements
- Ensure Prisma migrations are up to date
- Check server logs for detailed errors
