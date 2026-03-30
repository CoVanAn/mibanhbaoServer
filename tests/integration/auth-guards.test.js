import { afterAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import prisma from "../../src/config/prisma.js";

describe("Auth guard integration", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects unauthenticated coupon management list", async () => {
    const response = await request(app).get("/api/coupon").expect(401);

    expect(response.body).toHaveProperty("success", false);
  });

  it("rejects unauthenticated user order listing", async () => {
    const response = await request(app).get("/api/order/my").expect(401);

    expect(response.body).toHaveProperty("success", false);
  });

  it("rejects unauthenticated customer admin listing", async () => {
    const response = await request(app).get("/api/admin/customers").expect(401);

    expect(response.body).toHaveProperty("success", false);
  });

  it("rejects unauthenticated employee admin listing", async () => {
    const response = await request(app).get("/api/admin/employees").expect(401);

    expect(response.body).toHaveProperty("success", false);
  });

  it("rejects unauthenticated category write endpoint", async () => {
    const response = await request(app)
      .post("/api/category/add")
      .send({ name: "Buns" })
      .expect(401);

    expect(response.body).toHaveProperty("success", false);
  });
});
