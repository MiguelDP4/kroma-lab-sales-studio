import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function setup() {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'file:./test.db';

  const prismaDir = path.resolve(__dirname, 'prisma');
  const testDbPath = path.join(prismaDir, 'test.db');
  const journalPath = path.join(prismaDir, 'test.db-journal');

  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch (e) {
      // Ignore if locked
    }
  }
  if (fs.existsSync(journalPath)) {
    try {
      fs.unlinkSync(journalPath);
    } catch (e) {
      // Ignore if locked
    }
  }

  execSync('npx prisma db push --schema=prisma/schema.sqlite.prisma --skip-generate --accept-data-loss', {
    cwd: __dirname,
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'pipe',
  });
}

export async function teardown() {
  const prismaDir = path.resolve(__dirname, 'prisma');
  const testDbPath = path.join(prismaDir, 'test.db');
  const journalPath = path.join(prismaDir, 'test.db-journal');

  try {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(journalPath)) {
      fs.unlinkSync(journalPath);
    }
  } catch (e) {
    // If held by Windows process during shutdown, ignore
  }
}
