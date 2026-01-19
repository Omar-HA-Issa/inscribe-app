import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',
        'src/**/*.d.ts',
        'src/core/config/**',
        'src/shared/constants/**',
        // Exclude type-only and interface files
        'src/core/domain/entities/**',
        'src/core/domain/interfaces/**',
        'src/core/domain/repositories/**',
        'src/core/interfaces/**',
        'src/core/types/**',
        // Exclude infrastructure abstractions (tested through their usage)
        'src/infrastructure/**',
        'src/core/factories/**',
        'src/core/repositories/**',
        // Exclude config/container (DI setup)
        'src/config/**',
        // Exclude logger (utility wrapper)
        'src/shared/utils/logger.ts',
        // Exclude index barrel files
        '**/index.ts',
        // Exclude services with complex external dependencies or config-like files
        'src/core/services/upload.service.ts',
        'src/core/services/reports.service.ts',
        'src/core/services/fileUpload.service.ts',
        'src/core/services/prompts.service.ts',
        // Exclude api layer (uses deprecated DI pattern)
        'src/api/**',
        // Exclude client setup code
        'src/core/clients/**',
        // Exclude complex services with heavy external dependencies
        'src/core/services/download.service.ts',
      ],
      thresholds: {
        global: {
          branches: 50,
          functions: 60,
          lines: 70,
          statements: 70,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
