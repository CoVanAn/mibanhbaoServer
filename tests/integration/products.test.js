import { describe, it, expect, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import prisma from "../../src/config/prisma.js";

describe("API integration", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("GET /health", () => {
    it("returns health payload", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body).toHaveProperty("status", "healthy");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("uptime");
    });
  });

  describe("GET /", () => {
    it("returns API metadata", async () => {
      const response = await request(app).get("/").expect(200);

      expect(response.body).toHaveProperty("message", "Mi Banh Bao API");
      expect(response.body).toHaveProperty("version");
      expect(response.body).toHaveProperty("endpoints");
      expect(response.body.endpoints).toHaveProperty(
        "products",
        "/api/product",
      );
    });
  });

  describe("POST /api/product/add", () => {
    it("rejects unauthenticated request", async () => {
      const response = await request(app)
        .post("/api/product/add")
        .send({ name: "Test" })
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
    });
  });

  describe("Unknown route", () => {
    it("returns not found payload from global middleware", async () => {
      const response = await request(app)
        .get("/api/does-not-exist")
        .expect(404);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("code");
      expect(response.body).toHaveProperty("error");
    });
  });
});
