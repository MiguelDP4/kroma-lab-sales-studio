import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://neondb_owner:npg_Bm5aK1UgeLdt@ep-fragrant-wave-b5s2zyjd-pooler.c-7.us-east-2.aws.neon.tech/kroma_test?sslmode=require&channel_binding=require',
    },
    setupFiles: ['./vitest.setup.ts'],
    globalSetup: ['./vitest.global-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'src/index.ts',
        'src/db/seed.ts',
        'src/db/prisma.ts',
        '*.config.ts',
        'vitest.config.ts',
        'vitest.setup.ts',
        'vitest.global-setup.ts',
        'dist/**',
        '**/*.test.ts',
        'node_modules/**',
      ],
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
      },
    },
  },
});
