import { vi, expect } from 'vitest';

// Set up global environment variables for tests
process.env.PERPLEXITY_API_KEY = 'test-api-key';

// Setup global mocks for tests
global.fetch = vi.fn();

// Export commonly used testing utilities
export { vi, expect };