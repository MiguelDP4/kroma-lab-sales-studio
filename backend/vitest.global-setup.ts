import dotenv from 'dotenv';
import path from 'path';

export async function setup() {
  process.env.NODE_ENV = 'test';
  dotenv.config({ path: path.resolve(__dirname, '.env.test') });
  dotenv.config({ path: path.resolve(__dirname, '.env') });

  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }
}

export async function teardown() {
  // Teardown placeholder
}
