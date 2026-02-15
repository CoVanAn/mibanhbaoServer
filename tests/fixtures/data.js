/**
 * Test Fixtures - Sample Data
 */

export const mockProducts = [
  {
    id: 1,
    name: "Banh Bao Thit",
    slug: "banh-bao-thit",
    description: "Traditional pork bun",
    isActive: true,
    isFeatured: true,
  },
  {
    id: 2,
    name: "Banh Bao Chay",
    slug: "banh-bao-chay",
    description: "Vegetarian bun",
    isActive: true,
    isFeatured: false,
  },
];

export const mockUsers = [
  {
    id: 1,
    email: "admin@test.com",
    role: "ADMIN",
    name: "Admin User",
  },
  {
    id: 2,
    email: "customer@test.com",
    role: "CUSTOMER",
    name: "Test Customer",
  },
];

export const mockCategories = [
  {
    id: 1,
    name: "Banh Bao",
    slug: "banh-bao",
    isActive: true,
  },
  {
    id: 2,
    name: "Drinks",
    slug: "drinks",
    isActive: true,
  },
];
