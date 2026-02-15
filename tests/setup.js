/**
 * Test Setup and Configuration
 * This file runs before all tests
 */

// Set test environment
process.env.NODE_ENV = "test";

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup and teardown hooks
beforeAll(async () => {
  // Setup test database, etc.
});

afterAll(async () => {
  // Cleanup
});
