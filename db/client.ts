// This file is used by db/seed.ts only (local dev).
// The API uses api/src/db/client.ts instead.
// Run from the api/ directory so @prisma/adapter-pg resolves from api/node_modules.
import { PrismaClient } from '../api/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const adapter = new PrismaPg({ connectionString });
  return new (PrismaClient as unknown as new (opts: { adapter: PrismaPg }) => PrismaClient)({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
