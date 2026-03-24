import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
      include: ['src/**/*'],
      exclude: ['src/cli/index.ts', 'src/mcp/**/*', 'src/types/**/*']
    }
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    }
  }
});