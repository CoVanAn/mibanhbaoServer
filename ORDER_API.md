# Order API Documentation

## 📋 Tổng Quan

Order API cung cấp đầy đủ chức năng quản lý đơn hàng cho hệ thống Mi Banh Bao, bao gồm:

- Tạo đơn hàng từ giỏ hàng
- Quản lý trạng thái đơn hàng
- Theo dõi lịch sử đơn hàng
- Xử lý thanh toán và hoàn tiền
- Quản lý giao hàng

## 🏗️ Kiến Trúc

```
Server/
├── src/
│   ├── schemas/
│   │   └── order.schema.js          # Validation schemas
│   ├── controllers/
│   │   └── order/
│   │       ├── orderCrud.js         # CRUD operations
│   │       ├── orderStatus.js       # Status management
│   │       ├── orderPayment.js      # Payment handling
│   │       ├── orderHelpers.js      # Helper functions
│   │       └── index.js             # Export all
│   └── routes/
│       └── orderRoute.js            # API routes
```

## 🔐 Authentication

- **Customer Routes**: Require user authentication (JWT token)
- **Admin Routes**: Require ADMIN or STAFF role
- **Optional Auth**: `/create` endpoint hỗ trợ cả guest và authenticated users

## 📡 API Endpoints

### Customer Endpoints

#### 1. Tạo Order từ Cart

```http
POST /api/order/create
Authorization: Bearer {token} (optional)
Content-Type: application/json

Body:
{
  "method": "DELIVERY" | "PICKUP",
  "addressId": number,           // Required for DELIVERY
  "customerNote": string?,       // Optional
  "pickupAt": string?,           // ISO datetime, for PICKUP
  "scheduledAt": string?         // ISO datetime
}

Response:
{
  "success": true,
  "message": "Order created successfully",
  "order": {
    "id": 1,
    "code": "ORD-20260218-0001",
    "status": "PENDING",
    "method": "DELIVERY",
    "currency": "VND",
    "itemsSubtotal": 150000,
    "shippingFee": 30000,
    "discount": 0,
    "total": 180000,
    "items": [...],
    "address": {...},
    "user": {...}
  }
}
```

**Process Flow:**

1. Validate cart có items không rỗng
2. Validate inventory đủ hàng
3. Validate address (nếu DELIVERY)
4. Calculate totals (items + shipping - discount)
5. Snapshot product/variant data
6. Generate unique order code
7. Create order + order items
8. Reserve inventory
9. Create payment record (COD)
10. Clear cart

#### 2. Lấy Danh Sách Orders Của User

```http
GET /api/order/my?page=1&limit=20&status=PENDING
Authorization: Bearer {token}

Response:
{
  "success": true,
  "orders": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### 3. Xem Chi Tiết Order

```http
GET /api/order/:id
Authorization: Bearer {token}

Response:
{
  "success": true,
  "order": {
    "id": 1,
    "code": "ORD-20260218-0001",
    "status": "PREPARING",
    "items": [...],
    "statusHistory": [
      {
        "fromStatus": "PENDING",
        "toStatus": "CONFIRMED",
        "reason": "Order confirmed",
        "changedBy": { "id": 1, "name": "Admin" },
        "createdAt": "2026-02-18T10:00:00Z"
      }
    ],
    "payments": [...],
    "shipment": {...}
  }
}
```

#### 4. Hủy Order

```http
POST /api/order/:id/cancel
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "reason": "Changed my mind" // Required, min 10 chars
}

Response:
{
  "success": true,
  "message": "Order canceled successfully",
  "order": {...}
}
```

**Quy tắc hủy order:**

- User chỉ có thể hủy order của mình
- Chỉ hủy được ở trạng thái `PENDING` hoặc `CONFIRMED`
- Admin/Staff có thể hủy ở nhiều trạng thái hơn
- Khi hủy: inventory sẽ được release lại

#### 5. Xem Lịch Sử Trạng Thái

```http
GET /api/order/:id/history
Authorization: Bearer {token}

Response:
{
  "success": true,
  "history": [
    {
      "fromStatus": null,
      "toStatus": "PENDING",
      "reason": "Order created",
      "changedBy": {...},
      "createdAt": "2026-02-18T09:00:00Z"
    },
    {
      "fromStatus": "PENDING",
      "toStatus": "CONFIRMED",
      "reason": "Order confirmed by admin",
      "changedBy": {...},
      "createdAt": "2026-02-18T10:00:00Z"
    }
  ]
}
```

### Admin Endpoints

#### 6. Lấy Tất Cả Orders (Admin/Staff)

```http
GET /api/order/list?page=1&limit=20&status=PENDING&method=DELIVERY
Authorization: Bearer {admin_token}

Query Parameters:
- page: number (default: 1)
- limit: number (default: 20)
- status: OrderStatus enum
- method: "DELIVERY" | "PICKUP"
- userId: number
- startDate: ISO datetime
- endDate: ISO datetime
- search: string (search by code, name, email, phone)

Response:
{
  "success": true,
  "orders": [...],
  "pagination": {...}
}
```

#### 7. Cập Nhật Trạng Thái Order (Admin/Staff)

```http
PATCH /api/order/:id/status
Authorization: Bearer {admin_token}
Content-Type: application/json

Body:
{
  "status": "CONFIRMED",
  "reason": "Order confirmed by admin" // Optional
}

Response:
{
  "success": true,
  "message": "Order status updated to CONFIRMED",
  "order": {...}
}
```

**Trạng thái và luồng chuyển đổi:**

```
PENDING → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → COMPLETED
   ↓          ↓           ↓          ↓            ↓
CANCELED   CANCELED   CANCELED   CANCELED      CANCELED

COMPLETED → REFUNDED
```

**Status Transitions Matrix:**

- `PENDING`: → CONFIRMED, CANCELED
- `CONFIRMED`: → PREPARING, CANCELED
- `PREPARING`: → READY, CANCELED
- `READY`: → OUT_FOR_DELIVERY (delivery) or COMPLETED (pickup), CANCELED
- `OUT_FOR_DELIVERY`: → COMPLETED, CANCELED
- `COMPLETED`: → REFUNDED
- `CANCELED`: (final state)
- `REFUNDED`: (final state)

#### 8. Cập Nhật Ghi Chú Order

```http
PATCH /api/order/:id/note
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "customerNote": "Please deliver after 5pm", // User can update
  "internalNote": "VIP customer"              // Admin only
}

Response:
{
  "success": true,
  "message": "Order note updated",
  "order": {...}
}
```

#### 9. Xóa Order (Admin Only)

```http
DELETE /api/order/:id
Authorization: Bearer {admin_token}

Response:
{
  "success": true,
  "message": "Order is canceled and can be archived"
}
```

**Note:** Chỉ có thể "xóa" order đã CANCELED

### Payment Endpoints (Admin/Staff)

#### 10. Xem Payments của Order

```http
GET /api/order/:id/payments
Authorization: Bearer {admin_token}

Response:
{
  "success": true,
  "payments": [
    {
      "id": 1,
      "provider": "COD",
      "providerRef": null,
      "amount": 180000,
      "status": "UNPAID",
      "paidAt": null,
      "events": [...]
    }
  ]
}
```

#### 11. Tạo Payment Mới

```http
POST /api/order/:id/payment
Authorization: Bearer {admin_token}
Content-Type: application/json

Body:
{
  "provider": "VNPAY" | "MOMO" | "COD" | "BANKING",
  "amount": 180000,
  "providerRef": "VNPAY123456" // Optional
}

Response:
{
  "success": true,
  "message": "Payment created",
  "payment": {...}
}
```

#### 12. Cập Nhật Trạng Thái Payment

```http
PATCH /api/order/:id/payment/:paymentId
Authorization: Bearer {admin_token}
Content-Type: application/json

Body:
{
  "status": "PAID",
  "paidAt": "2026-02-18T11:00:00Z" // Optional
}

Response:
{
  "success": true,
  "message": "Payment status updated",
  "payment": {...}
}
```

#### 13. Xử Lý Hoàn Tiền

```http
POST /api/order/:id/refund
Authorization: Bearer {admin_token}
Content-Type: application/json

Body:
{
  "reason": "Customer request",
  "amount": 180000 // Optional, defaults to order total
}

Response:
{
  "success": true,
  "message": "Refund processed successfully",
  "payment": {...}
}
```

**Điều kiện refund:**

- Order phải ở trạng thái `CANCELED` hoặc `COMPLETED`
- Phải có payment với status `PAID`
- Sau khi refund: order status → `REFUNDED`

## 📊 Database Schema

### Order Table

```prisma
model Order {
  id            Int
  code          String @unique
  userId        Int?
  couponId      Int?
  method        FulfillmentMethod // DELIVERY | PICKUP
  status        OrderStatus       // PENDING | CONFIRMED | etc.
  currency      String
  itemsSubtotal Decimal
  shippingFee   Decimal
  discount      Decimal
  total         Decimal
  customerNote  String?
  internalNote  String?
  addressId     Int?
  pickupAt      DateTime?
  scheduledAt   DateTime?
  createdAt     DateTime
  updatedAt     DateTime
}
```

### OrderItem Table (Snapshot)

```prisma
model OrderItem {
  id                Int
  orderId           Int
  productId         Int?
  variantId         Int?
  nameSnapshot      String     // Product name at order time
  variantSnapshot   String?    // Variant name at order time
  skuSnapshot       String?
  imageUrlSnapshot  String?
  unitPrice         Decimal
  quantity          Int
  lineTotal         Decimal
}
```

**Tại sao dùng snapshot?**

- Product/variant có thể thay đổi giá, tên sau khi order
- Order items lưu data tại thời điểm đặt hàng
- Đảm bảo tính nhất quán của order history

## 🔧 Helper Functions

### Order Code Generation

```javascript
// Format: ORD-YYYYMMDD-XXXX
// Example: ORD-20260218-0001
generateOrderCode();
```

### Shipping Fee Calculation

```javascript
calculateShippingFee(method, address);
// PICKUP: 0 VND
// DELIVERY: 30,000 VND (flat rate, can be customized)
```

### Inventory Management

```javascript
reserveInventory(orderItems); // Giảm inventory khi tạo order
releaseInventory(orderItems); // Tăng lại khi cancel
```

### Order Totals Calculation

```javascript
calculateOrderTotals(cartItems, coupon, shippingFee);
// Returns: { itemsSubtotal, shippingFee, discount, total }
```

## ⚠️ Error Handling

### Common Errors

**Cart Empty:**

```json
{
  "success": false,
  "message": "Cart is empty"
}
```

**Insufficient Stock:**

```json
{
  "success": false,
  "message": "Order validation failed",
  "errors": [
    "Insufficient stock for Bánh Bao Thịt - Size M. Available: 5, Requested: 10"
  ]
}
```

**Invalid Status Transition:**

```json
{
  "success": false,
  "message": "Cannot transition from COMPLETED to PENDING",
  "allowedTransitions": ["REFUNDED"]
}
```

**Unauthorized:**

```json
{
  "success": false,
  "error": "Not Authorized. Login again.",
  "code": "NO_TOKEN"
}
```

**Forbidden:**

```json
{
  "success": false,
  "message": "Forbidden"
}
```

## 🧪 Testing

### Run Test Script

```bash
cd Server
chmod +x test-order-api.sh
./test-order-api.sh
```

### Manual Testing Flow

1. **Login/Register User:**

```bash
curl -X POST http://localhost:4000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "phone": "0123456789"
  }'
```

2. **Add Items to Cart:**

```bash
curl -X POST http://localhost:4000/api/cart/items \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "productId": 1,
    "variantId": 1,
    "quantity": 2
  }'
```

3. **Create Address:**

```bash
curl -X POST http://localhost:4000/api/user/address \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "name": "Test User",
    "phone": "0123456789",
    "addressLine": "123 Test St",
    "province": "Hà Nội",
    "district": "Đống Đa",
    "ward": "Láng Hạ"
  }'
```

4. **Create Order:**

```bash
curl -X POST http://localhost:4000/api/order/create \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "method": "DELIVERY",
    "addressId": 1,
    "customerNote": "Deliver after 5pm"
  }'
```

5. **Check Order Status:**

```bash
curl http://localhost:4000/api/order/1 \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

6. **Cancel Order:**

```bash
curl -X POST http://localhost:4000/api/order/1/cancel \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "reason": "Changed my mind, will order later"
  }'
```

## 🚀 Next Steps

### Immediate TODOs

- [ ] Implement email notifications (order confirmation, status updates)
- [ ] Add shipment tracking integration (GHN, GHTK)
- [ ] Implement payment gateway (VNPay, MoMo)
- [ ] Add real-time updates via WebSocket
- [ ] Create admin dashboard for order management
- [ ] Add order analytics and reporting

### Frontend Integration

- [ ] Create checkout page in Client app
- [ ] Add order history page
- [ ] Implement order tracking
- [ ] Add order management UI in Admin app

### Performance Optimization

- [ ] Add caching for order lists
- [ ] Implement pagination with cursor-based approach
- [ ] Add database indexes for common queries
- [ ] Optimize order creation transaction

## 📝 Notes

- Order code format: `ORD-YYYYMMDD-XXXX` (auto-increment per day)
- Shipping fee: Currently flat rate 30,000 VND for delivery
- Payment: Default COD, can extend to other methods
- Inventory: Auto reserve on order create, release on cancel
- Status History: All status changes are tracked with reason and user
- Snapshots: Product/variant data frozen at order time

## ✅ Implementation Status

✅ Order validation schemas (Zod)
✅ Order CRUD operations
✅ Status management với transition rules
✅ Payment handling
✅ Inventory reservation/release
✅ Order snapshots
✅ Status history tracking
✅ API routes với authentication
✅ Error handling
✅ Basic testing

## 🔗 Related Documentation

- [Server Architecture](./ARCHITECTURE.md)
- [Cart System](./CART_FIX_SUMMARY.md)
- [Authentication](./AUTHENTICATION_TESTING.md)
- [Database Schema](./prisma/schema.prisma)
