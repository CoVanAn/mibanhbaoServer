# 🔄 Migration Guide - Refactoring to Modern Architecture

## Tổng Quan

Guide này hướng dẫn cách migrate từ controllers trực tiếp gọi Prisma sang kiến trúc Services + Repositories.

## Before vs After

### ❌ Before (Old Pattern)

```javascript
// controllers/product/productCrud.js
export const getProduct = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { variants: true },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### ✅ After (New Pattern)

```javascript
// repositories/product.repository.js
export class ProductRepository extends BaseRepository {
  async findById(id) {
    return await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });
  }
}

// services/product.service.js
export class ProductService {
  async getProductById(id) {
    const product = await productRepository.findById(id);

    if (!product) {
      throw new NotFoundError("Product");
    }

    return product;
  }
}

// controllers/product/productCrud.js
export const getProduct = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    res.json({ success: true, product });
  } catch (error) {
    next(error); // Global error handler
  }
};
```

## 📋 Migration Checklist

### Step 1: Create Repository

```javascript
// src/repositories/[domain].repository.js

import prisma from "../config/prisma.js";
import { BaseRepository } from "./base.repository.js";

export class [Domain]Repository extends BaseRepository {
  constructor() {
    super(prisma.[model]);
  }

  // Add custom query methods
  async findBySlug(slug) {
    return await this.model.findUnique({ where: { slug } });
  }
}

export default new [Domain]Repository();
```

### Step 2: Create Service

```javascript
// src/services/[domain].service.js

import [domain]Repository from "../repositories/[domain].repository.js";
import { NotFoundError } from "../exceptions/index.js";

export class [Domain]Service {
  async getById(id) {
    const item = await [domain]Repository.findById(id);

    if (!item) {
      throw new NotFoundError("[Domain]");
    }

    return item;
  }

  async create(data) {
    // Validate business rules
    // Call repository
    return await [domain]Repository.create(data);
  }
}

export default new [Domain]Service();
```

### Step 3: Update Controller

```javascript
// src/controllers/[domain]/[domain]Crud.js

import [domain]Service from "../../services/[domain].service.js";

export const get[Domain] = async (req, res, next) => {
  try {
    const item = await [domain]Service.getById(req.params.id);
    res.json({ success: true, data: item });
  } catch (error) {
    next(error); // Let global error handler manage it
  }
};
```

## 🎯 Example: Migrate Cart Module

### 1. Create CartRepository

```javascript
// src/repositories/cart.repository.js
import prisma from "../config/prisma.js";
import { BaseRepository } from "./base.repository.js";

export class CartRepository extends BaseRepository {
  constructor() {
    super(prisma.cart);
  }

  async findByUserId(userId) {
    return await prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                prices: { where: { isActive: true } },
              },
            },
          },
        },
        coupon: true,
      },
    });
  }

  async findByGuestToken(guestToken) {
    return await prisma.cart.findFirst({
      where: { guestToken },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                prices: { where: { isActive: true } },
              },
            },
          },
        },
      },
    });
  }
}

export default new CartRepository();
```

### 2. Create CartService

```javascript
// src/services/cart.service.js
import cartRepository from "../repositories/cart.repository.js";
import { NotFoundError, BadRequestError } from "../exceptions/index.js";

export class CartService {
  async getOrCreateCart(userId, guestToken) {
    if (userId) {
      let cart = await cartRepository.findByUserId(userId);
      if (!cart) {
        cart = await cartRepository.create({ userId });
      }
      return cart;
    }

    if (guestToken) {
      let cart = await cartRepository.findByGuestToken(guestToken);
      if (!cart) {
        cart = await cartRepository.create({ guestToken });
      }
      return cart;
    }

    throw new BadRequestError("User ID or guest token required");
  }

  async addItem(cartId, variantId, quantity) {
    // Business logic: validate quantity, check stock, etc.

    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId, variantId },
    });

    if (existingItem) {
      return await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    }

    return await prisma.cartItem.create({
      data: { cartId, variantId, quantity },
    });
  }
}

export default new CartService();
```

### 3. Update CartController

```javascript
// src/controllers/cart/cartCrud.js
import cartService from "../../services/cart.service.js";

export const getCart = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const guestToken = req.cookies.guestToken;

    const cart = await cartService.getOrCreateCart(userId, guestToken);

    res.json({ success: true, cart });
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req, res, next) => {
  try {
    const { variantId, quantity } = req.body;
    const userId = req.user?.id;
    const guestToken = req.cookies.guestToken;

    const cart = await cartService.getOrCreateCart(userId, guestToken);
    const item = await cartService.addItem(cart.id, variantId, quantity);

    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
};
```

## 🧪 Testing After Migration

### Unit Test for Service

```javascript
// tests/unit/services/cart.service.test.js
import CartService from "../../../src/services/cart.service.js";
import cartRepository from "../../../src/repositories/cart.repository.js";

jest.mock("../../../src/repositories/cart.repository.js");

describe("CartService", () => {
  it("should get or create cart for user", async () => {
    const mockCart = { id: 1, userId: 1 };
    cartRepository.findByUserId.mockResolvedValue(mockCart);

    const cart = await CartService.getOrCreateCart(1, null);

    expect(cart).toEqual(mockCart);
  });
});
```

### Integration Test for Controller

```javascript
// tests/integration/cart.test.js
import request from "supertest";
import app from "../../src/app.js";

describe("Cart API", () => {
  it("should get cart", async () => {
    const response = await request(app)
      .get("/api/cart")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.cart).toBeDefined();
  });
});
```

## ⚠️ Common Pitfalls

### 1. Don't Skip Error Handling

```javascript
// ❌ Bad
export const getProduct = async (req, res) => {
  const product = await productService.getById(req.params.id);
  res.json(product);
};

// ✅ Good
export const getProduct = async (req, res, next) => {
  try {
    const product = await productService.getById(req.params.id);
    res.json({ success: true, product });
  } catch (error) {
    next(error);
  }
};
```

### 2. Business Logic Belongs in Services

```javascript
// ❌ Bad - Business logic in controller
export const createProduct = async (req, res) => {
  const slug = slugify(req.body.name);
  const exists = await prisma.product.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now()}`;
  const product = await prisma.product.create({ data: { ...req.body, slug } });
  res.json(product);
};

// ✅ Good - Business logic in service
// Service
async createProduct(data) {
  let slug = slugify(data.name);

  const exists = await productRepository.slugExists(slug);
  if (exists) {
    slug = uniqueSlug(slug);
  }

  return await productRepository.create({ ...data, slug });
}

// Controller
export const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};
```

### 3. Use Custom Exceptions

```javascript
// ❌ Bad
if (!product) {
  return res.status(404).json({ error: "Not found" });
}

// ✅ Good
if (!product) {
  throw new NotFoundError("Product");
}
```

## 📊 Migration Priority

1. **High Priority** (Core business logic)
   - Product CRUD
   - Cart operations
   - Order processing

2. **Medium Priority** (Supporting features)
   - Category management
   - User profile
   - Inventory

3. **Low Priority** (Can wait)
   - Media upload helpers
   - Price calculations
   - Utility functions

## 🎓 Best Practices

1. **Keep Controllers Thin**
   - Only handle HTTP request/response
   - Delegate to services

2. **Services Own Business Logic**
   - Validation
   - Business rules
   - Orchestration

3. **Repositories Own Data Access**
   - Database queries
   - No business logic

4. **Use Transactions in Services**

   ```javascript
   async transferInventory(fromId, toId, quantity) {
     return await prisma.$transaction(async (tx) => {
       await tx.inventory.update({ where: { id: fromId }, data: { quantity: { decrement: quantity } } });
       await tx.inventory.update({ where: { id: toId }, data: { quantity: { increment: quantity } } });
     });
   }
   ```

5. **Always Use TypedErrors**
   - NotFoundError
   - ValidationError
   - AuthenticationError
   - etc.

---

**Questions?** Check `ARCHITECTURE.md` for complete structure overview.
