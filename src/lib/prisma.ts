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
      new Pool({ connectionString }),
    ),
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
