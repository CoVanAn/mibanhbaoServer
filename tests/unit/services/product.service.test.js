/**
 * Example Unit Test for Product Service
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import ProductService from "../../../src/services/product.service.js";
import productRepository from "../../../src/repositories/product.repository.js";

// Mock the repository
jest.mock("../../../src/repositories/product.repository.js");

describe("ProductService", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe("getProductById", () => {
    it("should return a product when found", async () => {
      const mockProduct = {
        id: 1,
        name: "Test Product",
        slug: "test-product",
        isActive: true,
      };

      productRepository.findById.mockResolvedValue(mockProduct);

      const result = await ProductService.getProductById(1);

      expect(result).toEqual(mockProduct);
      expect(productRepository.findById).toHaveBeenCalledWith(
        1,
        expect.any(Object),
      );
    });

    it("should throw NotFoundError when product not found", async () => {
      productRepository.findById.mockResolvedValue(null);

      await expect(ProductService.getProductById(999)).rejects.toThrow(
        "Product not found",
      );
    });
  });

  describe("createProduct", () => {
    it("should create a product with generated slug", async () => {
      const mockProduct = {
        id: 1,
        name: "New Product",
        slug: "new-product",
      };

      productRepository.slugExists.mockResolvedValue(false);
      productRepository.create.mockResolvedValue(mockProduct);
      productRepository.findById.mockResolvedValue(mockProduct);

      const result = await ProductService.createProduct({
        name: "New Product",
      });

      expect(result.name).toBe("New Product");
      expect(productRepository.create).toHaveBeenCalled();
    });
  });
});
