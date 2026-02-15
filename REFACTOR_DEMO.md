## 🎯 DEMO: Services vs Controllers - Trước và Sau Refactor

### ✅ **ĐÃ REFACTOR: addProduct Controller**

---

## ❌ **TRƯỚC** (164 dòng code trong Controller)

```javascript
// controllers/product/productCrud.js
export const addProduct = async (req, res) => {
  try {
    // ❌ Parse & validation trong controller
    const {
      name,
      price,
      description,
      content,
      categoryId,
      quantity,
      safetyStock,
    } = req.body;

    if (
      !name ||
      price === undefined ||
      price === null ||
      String(price).trim() === ""
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Name and price are required" });
    }

    const priceStr = String(price).trim();
    if (isNaN(Number(priceStr))) {
      return res
        .status(400)
        .json({ success: false, message: "Price must be a number" });
    }

    // ❌ Content sanitization trong controller
    let sanitizedContent = null;
    if (content && content.trim()) {
      const validation = validateProductContent(content);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: `Content validation failed: ${validation.errors.join(", ")}`,
        });
      }
      sanitizedContent = sanitizeProductContent(content);
      // ... more validation
    }

    // ❌ Slug generation trong controller
    const slug = await uniqueSlug(name, "product");

    // ❌ Image upload logic trong controller
    const uploads = [];
    const files = Array.isArray(req.files)
      ? req.files
      : [...(req.files?.images || [])];
    if (files.length > 0) {
      const folder = process.env.CLOUDINARY_FOLDER || "mibanhbao/products";
      for (const f of files) {
        const up = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: "image" },
            (err, result) => (err ? reject(err) : resolve(result)),
          );
          stream.end(f.buffer);
        });
        uploads.push({ url: up.secure_url });
      }
    }

    // ❌ Category validation trong controller
    let connectCategory = undefined;
    if (
      categoryId !== undefined &&
      categoryId !== null &&
      String(categoryId).trim() !== ""
    ) {
      const cid = Number(categoryId);
      if (Number.isNaN(cid)) {
        return res
          .status(400)
          .json({ success: false, message: "categoryId must be a number" });
      }
      const exists = await prisma.category.findUnique({ where: { id: cid } });
      if (!exists) {
        return res
          .status(400)
          .json({ success: false, message: "Category not found" });
      }
      connectCategory = {
        create: [{ category: { connect: { id: cid } } }],
      };
    }

    // ❌ Database operations trực tiếp trong controller
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description || null,
        content: sanitizedContent,
        isActive: true,
        categories: connectCategory,
      },
    });

    // ❌ Create variant trong controller
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: "Default",
        sku: `${product.slug}-default`,
        isActive: true,
      },
    });

    // ❌ Create price trong controller
    await setPermanentPrice(variant.id, priceStr);

    // ❌ Create inventory trong controller
    const initialQuantity =
      quantity !== undefined && quantity !== null ? Number(quantity) : 0;
    const initialSafetyStock =
      safetyStock !== undefined && safetyStock !== null
        ? Number(safetyStock)
        : 0;
    await createInventoryForVariant(
      variant.id,
      initialQuantity,
      initialSafetyStock,
    );

    // ❌ Create media trong controller
    if (uploads.length > 0) {
      await prisma.productMedia.createMany({
        data: uploads.map((u, idx) => ({
          productId: product.id,
          url: u.url,
          position: idx,
        })),
      });
    }

    return res.json({ success: true, id: product.id });
  } catch (err) {
    console.error("addProduct error:", err);
    return res.status(500).json({ success: false, message: "Error" });
  }
};
```

**Vấn đề:**

- ❌ Controller quá dài (164 dòng)
- ❌ Business logic lẫn với HTTP handling
- ❌ Khó test (phải mock HTTP request/response)
- ❌ Không thể tái sử dụng logic này cho GraphQL, CLI, hoặc background jobs
- ❌ Error handling thủ công, không nhất quán
- ❌ Database transaction không được quản lý tốt

---

## ✅ **SAU** (Tách thành 3 layers)

### **1️⃣ REPOSITORY** (Data Access)

```javascript
// repositories/product.repository.js
export class ProductRepository extends BaseRepository {
  async createProductWithSetup(
    productData,
    variantData,
    priceData,
    inventoryData,
    mediaUrls = [],
  ) {
    return await prisma.$transaction(async (tx) => {
      // 1. Create product
      const product = await tx.product.create({ data: productData });

      // 2. Create categories
      if (productData.categoryIds && productData.categoryIds.length > 0) {
        await tx.productCategory.createMany({
          data: productData.categoryIds.map((id) => ({
            productId: product.id,
            categoryId: id,
          })),
        });
      }

      // 3. Create variant
      const variant = await tx.productVariant.create({
        data: { productId: product.id, ...variantData },
      });

      // 4. Create price
      await tx.variantPrice.create({
        data: { variantId: variant.id, ...priceData },
      });

      // 5. Create inventory
      await tx.inventory.create({
        data: { variantId: variant.id, ...inventoryData },
      });

      // 6. Create media
      if (mediaUrls.length > 0) {
        await tx.productMedia.createMany({
          data: mediaUrls.map((url, idx) => ({
            productId: product.id,
            url,
            position: idx,
          })),
        });
      }

      return product;
    });
  }

  async categoryExists(categoryId) {
    const count = await prisma.category.count({ where: { id: categoryId } });
    return count > 0;
  }
}
```

### **2️⃣ SERVICE** (Business Logic)

```javascript
// services/product.service.js
export class ProductService {
  async createProduct(data, files = []) {
    // === VALIDATION ===
    if (!name || !name.trim()) {
      throw new ValidationError("Product name is required");
    }

    if (!price || isNaN(Number(price))) {
      throw new ValidationError("Price must be a valid number");
    }

    // === CONTENT SANITIZATION ===
    let sanitizedContent = null;
    if (content && content.trim()) {
      const validation = validateProductContent(content);
      if (!validation.isValid) {
        throw new ValidationError(`Content validation failed: ${validation.errors.join(", ")}`);
      }
      sanitizedContent = sanitizeProductContent(content);
    }

    // === CATEGORY VALIDATION ===
    const finalCategoryIds = categoryIds || (categoryId ? [categoryId] : []);
    for (const cid of finalCategoryIds) {
      const exists = await productRepository.categoryExists(cid);
      if (!exists) {
        throw new NotFoundError(`Category with ID ${cid}`);
      }
    }

    // === SLUG GENERATION ===
    let slug = customSlug || slugify(name);
    const slugExists = await productRepository.slugExists(slug);
    if (slugExists) {
      slug = uniqueSlug(name);
    }

    // === IMAGE UPLOAD ===
    const uploadedUrls = [];
    for (const file of files) {
      const uploadResult = await cloudinary.uploader.upload_stream(...);
      uploadedUrls.push(uploadResult.secure_url);
    }

    // === CREATE PRODUCT ===
    const product = await productRepository.createProductWithSetup(
      { name, slug, description, content: sanitizedContent, categoryIds: finalCategoryIds },
      { name: "Default", sku: `${slug}-default` },
      { amount: Number(price), currency: "VND" },
      { quantity: Number(quantity) || 0, safetyStock: Number(safetyStock) || 0 },
      uploadedUrls
    );

    return await this.getProductById(product.id);
  }
}
```

### **3️⃣ CONTROLLER** (HTTP Handler - CHỈ 17 DÒNG!)

```javascript
// controllers/product/productCrud.js
import productService from "../../services/product.service.js";

export const addProduct = async (req, res, next) => {
  try {
    // 1. Extract files from request
    const files = Array.isArray(req.files)
      ? req.files
      : [...(req.files?.images || []), ...(req.files?.image || [])];

    // 2. Call service (all business logic handled here)
    const product = await productService.createProduct(req.body, files);

    // 3. Return HTTP response
    return res.status(201).json({
      success: true,
      id: product.id,
      product,
    });
  } catch (error) {
    // 4. Forward to global error handler
    next(error);
  }
};
```

---

## 📊 **SO SÁNH**

| Metric             | Trước                                | Sau (Controller)                | Improvement               |
| ------------------ | ------------------------------------ | ------------------------------- | ------------------------- |
| **Lines of code**  | 164                                  | 17                              | **90% giảm**              |
| **Concerns**       | 7+ (HTTP, validation, DB, upload...) | 1 (HTTP only)                   | **Single responsibility** |
| **Testability**    | Phải mock HTTP + DB                  | Chỉ mock service                | **Dễ test hơn**           |
| **Reusability**    | Không thể tái sử dụng                | Service có thể dùng ở nhiều nơi | **✅ Reusable**           |
| **Error handling** | Manual try-catch mỗi case            | Global error handler            | **✅ Consistent**         |
| **Transaction**    | Không có                             | Prisma transaction trong repo   | **✅ ACID**               |

---

## 🎯 **LỢI ÍCH CỤ THỂ**

### **1. Reusability**

Service có thể dùng ở nhiều nơi:

```javascript
// ✅ REST API
app.post("/api/product/add", async (req, res, next) => {
  const product = await productService.createProduct(req.body, req.files);
  res.json(product);
});

// ✅ GraphQL
const resolvers = {
  Mutation: {
    createProduct: async (_, args) => {
      return await productService.createProduct(args);
    },
  },
};

// ✅ CLI Command
async function seedProducts() {
  for (const data of seedData) {
    await productService.createProduct(data);
  }
}

// ✅ Background Job
async function importFromCSV(csvData) {
  for (const row of csvData) {
    await productService.createProduct(row);
  }
}
```

### **2. Easy Testing**

```javascript
// ✅ Test Service (Pure logic, no HTTP)
describe("ProductService", () => {
  it("should validate name is required", async () => {
    await expect(productService.createProduct({})).rejects.toThrow(
      "Product name is required",
    );
  });

  it("should generate unique slug", async () => {
    productRepository.slugExists = jest.fn().resolvedValue(true);

    const result = await productService.createProduct({ name: "Bánh Bao" });

    expect(result.slug).toMatch(/^banh-bao-\d+$/);
  });
});

// ✅ Test Controller (Integration only)
describe("POST /api/product/add", () => {
  it("should return 201 on success", async () => {
    const response = await request(app)
      .post("/api/product/add")
      .send({ name: "Test", price: 10000 })
      .expect(201);

    expect(response.body.success).toBe(true);
  });
});
```

### **3. Better Error Messages**

```javascript
// ❌ Trước: Generic errors
{ "success": false, "message": "Error" }

// ✅ Sau: Typed errors with codes
{
  "success": false,
  "error": "Product name is required",
  "code": "VALIDATION_ERROR"
}

{
  "success": false,
  "error": "Category with ID 999 not found",
  "code": "NOT_FOUND"
}
```

---

## 🚀 **KẾT LUẬN**

### **Controller SAU khi refactor:**

- ✅ Chỉ 17 dòng (giảm 90%)
- ✅ Chỉ lo HTTP (parse request, return response)
- ✅ Không chứa business logic
- ✅ Error handling tự động qua middleware

### **Service (MỚI):**

- ✅ Chứa toàn bộ business logic
- ✅ Có thể tái sử dụng ở nhiều nơi
- ✅ Dễ test (không cần HTTP mock)
- ✅ Throw typed errors

### **Repository (MỚI):**

- ✅ Quản lý database operations
- ✅ Transaction support
- ✅ Query optimization
- ✅ Database-agnostic (dễ đổi DB sau này)

---

**Đây là lý do tại sao Services layer quan trọng!** 🎉
