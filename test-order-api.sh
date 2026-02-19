#!/bin/bash
# Test Order API Endpoints
# Usage: ./test-order-api.sh

BASE_URL="http://localhost:4000"
CONTENT_TYPE="Content-Type: application/json"

echo "🧪 Testing Order API Endpoints"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${BLUE}1. Testing Health Check${NC}"
curl -s "$BASE_URL/health" | jq
echo ""

# Test 2: Get Root Endpoint (Check if order endpoint exists)
echo -e "${BLUE}2. Checking Order Endpoint Registration${NC}"
curl -s "$BASE_URL/" | jq '.endpoints.orders'
echo ""

# Test 3: Try to get orders without authentication (should succeed but return empty for guest)
echo -e "${BLUE}3. Get User Orders (No Auth - Should Fail)${NC}"
curl -s "$BASE_URL/api/order/my" | jq
echo ""

# Test 4: Try to create order without cart (should fail)
echo -e "${BLUE}4. Create Order Without Cart (Should Fail)${NC}"
curl -s -X POST "$BASE_URL/api/order/create" \
  -H "$CONTENT_TYPE" \
  -d '{
    "method": "DELIVERY",
    "addressId": 1,
    "customerNote": "Test order"
  }' | jq
echo ""

# Test 5: Get all orders as admin (need token)
echo -e "${BLUE}5. Get All Orders (Admin - Need Token)${NC}"
echo "Skipping - requires admin authentication"
echo ""

# Instructions for manual testing
echo -e "${GREEN}Manual Testing Instructions:${NC}"
echo "================================"
echo ""
echo "To fully test the order API, you need to:"
echo ""
echo "1. Create or login as a user:"
echo "   curl -X POST $BASE_URL/auth/login \\"
echo "     -H '$CONTENT_TYPE' \\"
echo "     -d '{\"email\":\"user@example.com\",\"password\":\"password\"}'"
echo ""
echo "2. Add items to cart:"
echo "   curl -X POST $BASE_URL/api/cart/items \\"
echo "     -H '$CONTENT_TYPE' \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "     -d '{\"productId\":1,\"variantId\":1,\"quantity\":2}'"
echo ""
echo "3. Create an order:"
echo "   curl -X POST $BASE_URL/api/order/create \\"
echo "     -H '$CONTENT_TYPE' \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "     -d '{\"method\":\"DELIVERY\",\"addressId\":1,\"customerNote\":\"Test order\"}'"
echo ""
echo "4. Get your orders:"
echo "   curl $BASE_URL/api/order/my \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN'"
echo ""
echo "5. Cancel an order:"
echo "   curl -X POST $BASE_URL/api/order/1/cancel \\"
echo "     -H '$CONTENT_TYPE' \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "     -d '{\"reason\":\"Changed my mind\"}'"
echo ""
echo "6. Admin: Get all orders:"
echo "   curl '$BASE_URL/api/order/list?page=1&limit=10' \\"
echo "     -H 'Authorization: Bearer ADMIN_TOKEN'"
echo ""
echo "7. Admin: Update order status:"
echo "   curl -X PATCH $BASE_URL/api/order/1/status \\"
echo "     -H '$CONTENT_TYPE' \\"
echo "     -H 'Authorization: Bearer ADMIN_TOKEN' \\"
echo "     -d '{\"status\":\"CONFIRMED\",\"reason\":\"Order confirmed by admin\"}'"
echo ""

echo -e "${GREEN}✅ Basic smoke tests completed!${NC}"
echo "See instructions above for full testing with authentication and data."
