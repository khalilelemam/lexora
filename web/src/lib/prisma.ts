import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Creates a PrismaClient with the appropriate adapter.
 *
 * - **Neon** (production / default): `@prisma/adapter-neon` — serverless
 *   WebSocket driver for Neon databases.
 * - **pg** (Docker / local): `@prisma/adapter-pg` — standard TCP driver
 *   for any PostgreSQL instance. Activated when `DATABASE_ADAPTER=pg`
 *   or when `DATABASE_URL` does NOT contain `neon.tech`.
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const useNeon =
    process.env.DATABASE_ADAPTER !== 'pg' &&
    (process.env.DATABASE_ADAPTER === 'neon' || connectionString.includes('neon.tech'));

  if (useNeon) {
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({ adapter });
  }

  // Standard TCP adapter for Docker / local PostgreSQL
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
