# Testing Structure

## Overview

This directory contains all tests for the Mi Banh Bao API.

## Structure

```
tests/
├── unit/           # Unit tests for individual functions/classes
├── integration/    # Integration tests for API endpoints
├── e2e/            # End-to-end tests
└── fixtures/       # Test data and fixtures
```

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

## Writing Tests

### Unit Tests

Test individual functions, services, or repositories in isolation.

Example: `tests/unit/services/product.service.test.js`

### Integration Tests

Test API endpoints with database interactions.

Example: `tests/integration/products.test.js`

### E2E Tests

Test complete user flows through the API.

Example: `tests/e2e/checkout.test.js`

## Test Data

Use fixtures in `tests/fixtures/` for consistent test data.
