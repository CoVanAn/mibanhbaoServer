# Mi Banh Bao - Modern Server Architecture

## 📁 Cấu Trúc Project

```
Server/
├── src/                          # Source code chính
│   ├── config/                   # Database, cloud services config
│   │   ├── db.js
│   │   ├── prisma.js
│   │   └── cloudinary.js
│   │
│   ├── constants/                # Constants, enums, error codes
│   │   └── index.js
│   │
│   ├── exceptions/               # Custom error classes
│   │   └── index.js
│   │
│   ├── middleware/               # Express middleware
│   │   ├── auth.js
│   │   ├── errorHandler.js      # Global error handler
│   │   ├── notFoundHandler.js
│   │   ├── requestLogger.js
│   │   ├── roles.js
│   │   ├── validate.js
│   │   ├── guestToken.js
│   │   └── googleAuth.js
│   │
│   ├── schemas/                  # Zod validation schemas
│   │   ├── product.schema.js
│   │   ├── category.schema.js
│   │   ├── cart.schema.js
│   │   ├── user.schema.js
│   │   └── index.js
│   │
│   ├── repositories/             # Database access layer
│   │   ├── base.repository.js   # Base CRUD operations
│   │   └── product.repository.js
│   │
│   ├── services/                 # Business logic layer
│   │   └── product.service.js
│   │
│   ├── controllers/              # Route handlers
│   │   ├── cart/
│   │   ├── category/
│   │   ├── product/
│   │   └── user/
│   │
│   ├── routes/                   # API routes
│   │   ├── productRoute.js
│   │   ├── categoryRoute.js
│   │   ├── cartRoute.js
│   │   ├── userRoute.js
│   │   └── authRoute.js
│   │
│   ├── utils/                    # Helper utilities
│   │   ├── helpers.js
│   │   ├── htmlSanitizer.js
│   │   ├── priceHelpers.js
│   │   └── inventoryHelpers.js
│   │
│   ├── app.js                    # Express app configuration
│   └── server.js                 # Server startup & graceful shutdown
│
├── prisma/                       # Prisma schema & migrations
│   ├── schema.prisma
│   └── migrations/
│
├── tests/                        # Test files
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   ├── e2e/                      # End-to-end tests
│   └── fixtures/                 # Test data
│
├── logs/                         # Application logs
├── .env                          # Environment variables
├── .gitignore
└── package.json
```

## 🏗️ Kiến Trúc Layers

### 1️⃣ **Routes Layer** (routes/)

- Định nghĩa các API endpoints
- Áp dụng middleware (auth, validation, role-based access)
- Gọi controllers

### 2️⃣ **Controllers Layer** (controllers/)

- Xử lý HTTP request/response
- Validation input
- Gọi services
- Format response

### 3️⃣ **Services Layer** (services/) ⭐ NEW

- **Business logic**
- Orchestrate các repositories
- Transaction management
- Business rules validation

### 4️⃣ **Repositories Layer** (repositories/) ⭐ NEW

- **Data access layer**
- Trực tiếp tương tác với database (Prisma)
- CRUD operations
- Complex queries

### 5️⃣ **Utils Layer** (utils/)

- Helper functions
- Common utilities

## 🔄 Request Flow

```
Client Request
    ↓
Route (productRoute.js)
    ↓
Middleware (auth, validate)
    ↓
Controller (productCrud.js)
    ↓
Service (product.service.js) ← Business Logic
    ↓
Repository (product.repository.js) ← Database
    ↓
Prisma ORM
    ↓
PostgreSQL Database
```

## ✨ Tính Năng Mới

### 1. **Global Error Handling**

```javascript
// src/middleware/errorHandler.js
- Xử lý tất cả errors tập trung
- Prisma errors
- JWT errors
- Validation errors
- Custom app errors
```

### 2. **Custom Exceptions**

```javascript
// src/exceptions/index.js
throw new NotFoundError("Product");
throw new ValidationError("Invalid input", errors);
throw new AuthenticationError();
```

### 3. **Constants Management**

```javascript
// src/constants/index.js
import { HTTP_STATUS, ERROR_CODES, USER_ROLES } from "./constants/index.js";
```

### 4. **Health Check Endpoint**

```bash
GET /health
```

### 5. **Graceful Shutdown**

- Handle SIGTERM, SIGINT
- Close database connections
- Cleanup resources

### 6. **Request Logging**

```
➡️  GET /api/product/list
✅ GET /api/product/list - 200 (45ms)
```

## 🚀 Running the Server

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

### Testing

```bash
npm test
```

## 📝 Environment Variables

```env
# Server
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your_secret_key

# Session
SESSION_SECRET=your_session_secret

# URLs
CLIENT_URL=http://localhost:3000
ADMIN_URL=http://localhost:5173

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## 🎯 Next Steps (Migration Plan)

### Phase 1: Core Setup ✅

- [x] Tạo src/ structure
- [x] Tách app.js và server.js
- [x] Constants & Exceptions
- [x] Error handling
- [x] Request logging

### Phase 2: Refactor Product Domain

- [ ] Migrate ProductController to use ProductService
- [ ] Create VariantService & Repository
- [ ] Create InventoryService & Repository
- [ ] Add unit tests

### Phase 3: Refactor Other Domains

- [ ] Category Service & Repository
- [ ] Cart Service & Repository
- [ ] User Service & Repository
- [ ] Order Service & Repository

### Phase 4: Testing

- [ ] Unit tests for services
- [ ] Integration tests for APIs
- [ ] E2E tests

### Phase 5: Advanced Features

- [ ] Rate limiting
- [ ] Caching (Redis)
- [ ] API documentation (Swagger)
- [ ] Winston logging
- [ ] Performance monitoring

## 📚 Coding Guidelines

### Service Example

```javascript
// src/services/product.service.js
export class ProductService {
  async getProductById(id) {
    // Business logic here
    const product = await productRepository.findById(id);

    if (!product) {
      throw new NotFoundError("Product");
    }

    return product;
  }
}
```

### Repository Example

```javascript
// src/repositories/product.repository.js
export class ProductRepository extends BaseRepository {
  async findBySlug(slug) {
    return await prisma.product.findUnique({
      where: { slug },
      include: { variants: true },
    });
  }
}
```

### Controller Example

```javascript
// src/controllers/product/productCrud.js
export const getProduct = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    res.json({ success: true, product });
  } catch (error) {
    next(error); // Global error handler will catch this
  }
};
```

## 🔐 Security

- JWT authentication
- Role-based access control
- Input validation (Zod)
- HTML sanitization
- CORS configured
- Secure session cookies

## 📖 Documentation

- API Documentation: Coming soon (Swagger)
- Database Schema: See `prisma/schema.prisma`
- Tests: See `tests/README.md`

---

**Version**: 1.0.0 - Modern Architecture  
**Last Updated**: February 2026
