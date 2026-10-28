import { afterAll } from 'vitest';
import { prisma } from './src/db/prisma';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_Bm5aK1UgeLdt@ep-fragrant-wave-b5s2zyjd-pooler.c-7.us-east-2.aws.neon.tech/kroma_test?sslmode=require&channel_binding=require';

afterAll(async () => {
  await prisma.$disconnect();
});
