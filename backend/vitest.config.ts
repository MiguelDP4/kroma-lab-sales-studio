import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno de prueba sin exponer credenciales en el repositorio
dotenv.config({ path: path.resolve(__dirname, '.env.test') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDbUrl,
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
