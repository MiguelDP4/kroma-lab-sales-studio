import { afterAll } from 'vitest';
import { prisma } from './src/db/prisma';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';

afterAll(async () => {
  await prisma.$disconnect();
});
