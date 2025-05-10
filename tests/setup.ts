import { vi, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Set up global environment variables for tests
process.env.PERPLEXITY_API_KEY = 'test-api-key';

// Setup global mocks for tests
global.fetch = vi.fn();

// Setup mock for ResizeObserver (used by some UI components)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Clean up after each test case
afterEach(() => {
  cleanup();
});

// Export commonly used testing utilities
export { vi, expect };