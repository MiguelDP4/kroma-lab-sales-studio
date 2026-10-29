import dotenv from 'dotenv';
import path from 'path';

process.env.NODE_ENV = 'test';
dotenv.config({ path: path.resolve(__dirname, '.env.test') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

import { afterAll } from 'vitest';
import { prisma } from './src/db/prisma';

afterAll(async () => {
  await prisma.$disconnect();
});
