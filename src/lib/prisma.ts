import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

let connectionString = process.env.DATABASE_URL;

// A local `prisma dev` server hands out a prisma+postgres:// URL whose api_key
// carries the real Postgres connection string. Hosted databases give a plain
// postgres:// URL and fall straight through.
if (connectionString?.startsWith('prisma+postgres://')) {
  const apiKey = new URL(connectionString).searchParams.get('api_key');
  if (apiKey) {
    connectionString = JSON.parse(Buffer.from(apiKey, 'base64').toString('utf-8')).databaseUrl;
  }
}

/** One client per process, reused across hot reloads. */
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(
      // Every serverless instance opens its own pool, so the ceiling that
      // matters is per-instance times instances, not this number. `pg` defaults
      // to 10 — a busy evening across a handful of instances is enough to
      // exhaust Postgres' connection limit, and the symptom is the whole site
      // erroring at once rather than one slow request.
      new Pool({ connectionString, max: 5 }),
    ),
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
