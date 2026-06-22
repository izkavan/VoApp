import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true, // Allows using describe, it, expect without importing
    coverage: {
      reporter: ['text', 'json-summary', 'json', 'html'],
    }
  },
});
