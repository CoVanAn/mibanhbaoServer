/**
 * Quick test to validate dashboard endpoints
 * Run in isolation with a running backend
 */
import axios from "axios";

const API_BASE = "http://localhost:4000/api/dashboard";

const mockToken =
  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsInJvbGUiOiJBRE1JTiJ9.test";

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    Authorization: mockToken,
  },
});

async function testDashboardAPIs() {
  try {
    console.log("🔧 Testing Dashboard APIs...\n");

    const currentYear = new Date().getFullYear();

    // Test 1: Overview (Q1 2026)
    console.log("1️⃣  Testing /overview?year=2026&quarter=1");
    try {
      const response = await client.get("/overview", {
        params: { year: 2026, quarter: 1 },
      });
      console.log("✓ Overview success");
      console.log(`   Metrics:`, response.data.metrics);
    } catch (error) {
      console.error(
        "✗ Overview failed:",
        error.response?.data || error.message,
      );
    }

    // Test 2: Daily (last 7 days)
    console.log("\n2️⃣  Testing /daily with date range");
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      const response = await client.get("/daily", {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      console.log("✓ Daily success");
      console.log(`   Days returned: ${response.data.daily.length}`);
      if (response.data.daily.length > 0) {
        console.log(`   First day:`, response.data.daily[0]);
      }
    } catch (error) {
      console.error("✗ Daily failed:", error.response?.data || error.message);
    }

    // Test 3: Top Products
    console.log("\n3️⃣  Testing /top-products?year=2026&quarter=1");
    try {
      const response = await client.get("/top-products", {
        params: { year: 2026, quarter: 1, limit: 5 },
      });
      console.log("✓ Top products success");
      console.log(`   Products returned: ${response.data.topProducts.length}`);
      if (response.data.topProducts.length > 0) {
        console.log(`   Top product:`, response.data.topProducts[0]);
      }
    } catch (error) {
      console.error(
        "✗ Top products failed:",
        error.response?.data || error.message,
      );
    }

    // Test 4: Low Stock
    console.log("\n4️⃣  Testing /low-stock?limit=10");
    try {
      const response = await client.get("/low-stock", {
        params: { limit: 10 },
      });
      console.log("✓ Low stock success");
      console.log(
        `   Items below safety stock: ${response.data.lowStock.length}`,
      );
      if (response.data.lowStock.length > 0) {
        console.log(`   First low stock:`, response.data.lowStock[0]);
      }
    } catch (error) {
      console.error(
        "✗ Low stock failed:",
        error.response?.data || error.message,
      );
    }

    console.log("\n✅ Dashboard API tests complete!");
  } catch (error) {
    console.error("❌ Test suite failed:", error);
  }
}

testDashboardAPIs();
