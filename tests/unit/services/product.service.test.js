import { describe, it, expect } from "@jest/globals";
import productService from "../../../src/services/product.service.js";

describe("ProductService (minimal)", () => {
  it("exposes expected public methods", () => {
    expect(typeof productService.getProducts).toBe("function");
    expect(typeof productService.getProductById).toBe("function");
    expect(typeof productService.createProduct).toBe("function");
    expect(typeof productService.updateProduct).toBe("function");
    expect(typeof productService.deleteProduct).toBe("function");
  });
});
