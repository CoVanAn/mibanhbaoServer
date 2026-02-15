/**
 * Example Integration Test for Products API
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../../../src/app.js";
import prisma from "../../../src/config/prisma.js";

describe("Products API", () => {
  let authToken;
  let productId;

  beforeAll(async () => {
    // Setup: Login and get auth token
    // authToken = await getAuthToken();
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    await prisma.$disconnect();
  });

  describe("GET /api/product/list", () => {
    it("should return list of products", async () => {
      const response = await request(app).get("/api/product/list").expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("products");
      expect(Array.isArray(response.body.products)).toBe(true);
    });
  });

  describe("POST /api/product/add", () => {
    it("should create a new product (admin only)", async () => {
      const newProduct = {
        name: "Test Product",
        description: "Test description",
        isActive: true,
      };

      const response = await request(app)
        .post("/api/product/add")
        .set("Authorization", `Bearer ${authToken}`)
        .send(newProduct)
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.product).toHaveProperty("id");
      expect(response.body.product.name).toBe(newProduct.name);

      productId = response.body.product.id;
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app)
        .post("/api/product/add")
        .send({ name: "Test" })
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
    });
  });
});
