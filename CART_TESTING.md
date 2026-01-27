# Cart API Testing Guide

## Prerequisites

1. **Server running**: `npm start` trong folder Server
2. **Database có data**: Cần có ít nhất:
   - 1-2 Products
   - 2-3 ProductVariants với Price và Inventory
   - (Optional) Coupon để test

## Cách Test

### Option 1: REST Client (VS Code Extension)

1. Install **REST Client** extension trong VS Code
2. Mở file [test/testCart.http](test/testCart.http)
3. Click "Send Request" ở trên mỗi request
4. Xem response ngay trong VS Code

**Ưu điểm**:

- Visual, dễ dùng
- Lưu history
- Syntax highlighting

### Option 2: Bash Script

```bash
# Cấp quyền execute
chmod +x test/testCartCurl.sh

# Chạy test
bash test/testCartCurl.sh
```

**Yêu cầu**:

- `curl` installed
- `jq` installed (để format JSON)

### Option 3: Manual cURL Commands

```bash
# 1. Get cart
curl http://localhost:4000/api/cart

# 2. Add item
curl -X POST http://localhost:4000/api/cart/items \
  -H "Content-Type: application/json" \
  -d '{"variantId": 1, "productId": 1, "quantity": 2}'

# 3. Update quantity
curl -X PUT http://localhost:4000/api/cart/items/1 \
  -H "Content-Type: application/json" \
  -d '{"quantity": 5}'

# 4. Delete item
curl -X DELETE http://localhost:4000/api/cart/items/1

# 5. Apply coupon
curl -X POST http://localhost:4000/api/cart/coupon \
  -H "Content-Type: application/json" \
  -d '{"couponCode": "SAVE10"}'
```

### Option 4: Postman/Thunder Client

Import collection từ file hoặc tạo requests thủ công theo docs ở [CART_API.md](CART_API.md)

## Test Scenarios

### ✅ Happy Path Tests

1. **Guest adds item to cart**
   - POST /api/cart/items với valid data
   - Expect: `success: true`, guestToken cookie được set

2. **Get cart with items**
   - GET /api/cart
   - Expect: Cart object với items array

3. **Update quantity**
   - PUT /api/cart/items/:itemId với quantity mới
   - Expect: Item quantity được update

4. **Apply coupon**
   - POST /api/cart/coupon với valid code
   - Expect: discount được áp dụng

5. **User login and merge cart**
   - POST /api/cart/merge với guestToken
   - Expect: Guest items được merge vào user cart

### ❌ Validation Error Tests

1. **Invalid variantId (string thay vì number)**

   ```json
   POST /api/cart/items
   {"variantId": "abc", "productId": 1, "quantity": 1}

   Expected: 400 Bad Request
   {
     "success": false,
     "message": "Validation failed",
     "errors": [{"field": "variantId", "message": "Expected number, received string"}]
   }
   ```

2. **Missing required fields**

   ```json
   POST /api/cart/items
   {"quantity": 1}

   Expected: 400 Bad Request with errors for variantId and productId
   ```

3. **Quantity out of range**

   ```json
   POST /api/cart/items
   {"variantId": 1, "productId": 1, "quantity": 1000}

   Expected: 400 "Quantity cannot exceed 999"
   ```

4. **Negative quantity**

   ```json
   {"quantity": -5}

   Expected: 400 "Quantity must be at least 1" (for add)
   Or: "Quantity must be at least 0" (for update)
   ```

5. **Coupon code too short**

   ```json
   POST /api/cart/coupon
   {"couponCode": "AB"}

   Expected: 400 "Coupon code must be at least 3 characters"
   ```

### 🔧 Edge Cases

1. **Add same variant twice**
   - Should update quantity, not create duplicate

2. **Update quantity to 0**
   - Should delete the item from cart

3. **Delete non-existent item**
   - Should return 404 or appropriate error

4. **Apply invalid coupon**
   - Should return error message

5. **Merge empty guest cart**
   - Should handle gracefully

## Expected Responses

### Success Response

```json
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "cart": {
      "id": 1,
      "userId": null,
      "guestToken": "guest_abc123...",
      "items": [...],
      "subtotal": 250000,
      "discount": 0,
      "total": 250000
    }
  }
}
```

### Validation Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "variantId",
      "message": "Variant ID must be positive"
    }
  ]
}
```

### Not Found Response

```json
{
  "success": false,
  "message": "Cart item not found"
}
```

## Debugging Tips

### Check cookies in browser

```javascript
// In browser console
document.cookie;
```

### Check guestToken

```bash
# In curl response headers
curl -i http://localhost:4000/api/cart
```

### Database queries

```javascript
// In Prisma Studio or direct SQL
SELECT * FROM "Cart";
SELECT * FROM "CartItem";
```

### Server logs

```bash
# Watch server console for errors
tail -f server.log
```

## Common Issues

### 1. "Cart is empty" even after adding items

**Cause**: guestToken cookie not being sent
**Fix**: Make sure cookies are enabled, check Set-Cookie header

### 2. "Product variant not found"

**Cause**: Database doesn't have the variantId
**Fix**: Create product variants first, or use existing IDs

### 3. "Insufficient stock"

**Cause**: Inventory quantity < requested quantity
**Fix**: Update Inventory table or reduce quantity

### 4. Validation errors not showing

**Cause**: Middleware order wrong
**Fix**: Ensure validate() comes BEFORE controller in route

### 5. Type coercion not working

**Cause**: Zod needs explicit `z.coerce.number()`
**Fix**: Use coerce for params, regular parsing for body

## Performance Testing

```bash
# Load test with Apache Bench
ab -n 1000 -c 10 http://localhost:4000/api/cart

# Stress test adding items
for i in {1..100}; do
  curl -X POST http://localhost:4000/api/cart/items \
    -H "Content-Type: application/json" \
    -d '{"variantId": 1, "productId": 1, "quantity": 1}'
done
```

## Checklist

Before deploying to production:

- [ ] All happy path tests pass
- [ ] All validation tests return correct errors
- [ ] Edge cases handled properly
- [ ] Authentication works (user cart vs guest cart)
- [ ] Cart merge works correctly
- [ ] Coupon validation works
- [ ] Stock validation prevents overselling
- [ ] Price snapshot is correct
- [ ] Total calculation is accurate
- [ ] Cookies are HttpOnly and Secure (in production)
- [ ] Rate limiting is in place
- [ ] Error messages don't leak sensitive info

## Next Steps

After cart testing:

1. Test with real frontend integration
2. Load testing for performance
3. Security testing (SQL injection, XSS, etc.)
4. End-to-end testing with checkout flow
5. Monitor cart abandonment rates
