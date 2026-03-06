# AI_CONTEXT.md

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL (via Prisma ORM)
- **ORM:** Prisma
- **Cloud Storage:** Cloudinary
- **Testing:** Jest, Supertest
- **Other:** Shell scripts for testing/verification

## Architecture Overview

- **Monolithic Node.js application**
- **Layered structure:**
  - Controllers (business logic)
  - Services (domain logic)
  - Repositories (data access)
  - Middleware (auth, error handling, logging)
  - Schemas (validation)
- **API-first:** RESTful endpoints
- **Prisma** for DB access and migrations
- **Cloudinary** for media management

## Data Flow

1. **Request** → Express route → Middleware (auth, validation, logging)
2. **Controller** processes request, calls Service
3. **Service** applies business/domain logic
4. **Repository** interacts with DB via Prisma
5. **Response** returned to client

## API Summary

- **Auth:** Login, register, profile, avatar, Google OAuth
- **User:** Profile, address management
- **Product:** CRUD, inventory, media, pricing, variants
- **Category:** CRUD, management
- **Cart:** CRUD, item management
- **Order:** CRUD, payment, status, helpers

## State Strategy

- **Server-side:** Stateless REST API
- **Session/Auth:** JWT-based authentication, role-based access
- **Cart:** Guest token support for unauthenticated users
- **Error Handling:** Centralized middleware

## Business Rules

- **Role-based access control** for protected routes
- **Input validation** via schemas
- **Order processing** with payment and status management
- **Inventory management** for products/variants
- **Media uploads** handled via Cloudinary
- **Sanitization** of HTML inputs

### Order State Machine (Backend)

```
pending → confirmed → shipping → completed
pending → cancelled
```

- Trạng thái order được kiểm soát qua controller/service.
- Khi chuyển sang "confirmed": kiểm tra và trừ kho (atomic, trong transaction).
- Khi chuyển sang "cancelled": hoàn kho nếu đã trừ trước đó.
- Chỉ cho phép chuyển trạng thái hợp lệ (validate trong service).

### Permission Matrix (API)

| Role   | Orders              | Products   | Categories | Promotion |
| ------ | ------------------- | ---------- | ---------- | --------- |
| Admin  | CRUD                | CRUD       | CRUD       | CRUD      |
| Staff  | View, update status | View, edit | View       | View      |
| Viewer | View                | View       | View       | -         |

### Data Model Relationships

```
User        1—N Order
Order       1—N OrderItem
OrderItem   1—1 Product/Variant
Product     1—N Variant
Category    1—N Product
Cart        1—N CartItem
```

### API Contract Example

// Order API (POST /api/orders)
Request:
{
"userId": "string",
"items": [
{ "productId": "string", "variantId": "string", "qty": number }
],
"addressId": "string",
"paymentMethod": "cod" | "online"
}
Response:
{
"id": "string",
"status": "pending",
"items": [ ... ],
"total": number
}

// Order Status Update (PATCH /api/orders/:id)
Request:
{
"status": "confirmed" | "shipping" | "completed" | "cancelled"
}

### Transaction & Consistency

- Sử dụng Prisma transaction cho các thao tác: tạo order, trừ kho, cập nhật thanh toán.
- Nếu bất kỳ bước nào lỗi (ví dụ: hết hàng, payment fail), rollback toàn bộ transaction.
- Đảm bảo inventory và order luôn nhất quán.

### Payment Flow (Backend)

- Hỗ trợ COD và Online Payment.
- Nếu online: nhận webhook từ cổng thanh toán, cập nhật trạng thái order.
- Nếu COD: xác nhận khi giao hàng thành công.
- Payment status ảnh hưởng trực tiếp đến order status.

## Current Modules

- **Controllers:** cart, category, order, product, user
- **Middleware:** auth, error handler, Google auth, guest token, logger, roles, validation
- **Repositories:** base, product
- **Schemas:** cart, category, order, product, user
- **Services:** product
- **Utils:** helpers, HTML sanitizer, inventory, price, formatters
- **Routes:** auth, cart, category, order, product, user
- **Prisma:** schema, migrations
- **Tests:** fixtures, integration, unit

## Planned Features

- Promotion system (discounts, coupons, campaign rules, API cho admin/frontend)
- Point accumulation / loyalty system (tích điểm, redeem, API)
- Advanced analytics dashboard (thống kê doanh thu, trạng thái, sản phẩm)
- Coupon validation rules (logic kiểm tra, áp dụng, giới hạn, API)
- Webhook/payment integration (mở rộng cổng thanh toán, event-driven)
- Inventory audit/history (log thay đổi kho, API truy vết)
