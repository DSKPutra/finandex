// © 2026 Dea Saka Kurnia Putra. All rights reserved.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' } },
      { test: { name: 'golden', include: ['tests/golden/**/*.test.ts'], environment: 'node', testTimeout: 600_000 } },
      { test: { name: 'tools', include: ['tests/tools/**/*.test.ts'], environment: 'node', testTimeout: 120_000 } },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/shared/**/*.ts', 'server/**/*.ts'],
      exclude: ['server/chat/system-prompts/**'],
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 80 },
      reporter: ['text-summary', 'json-summary', 'html'],
    },
  },
});
