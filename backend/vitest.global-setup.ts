export async function setup() {
  process.env.NODE_ENV = 'test';
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
    process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_Bm5aK1UgeLdt@ep-fragrant-wave-b5s2zyjd-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  }
}

export async function teardown() {
  // Teardown placeholder
}
