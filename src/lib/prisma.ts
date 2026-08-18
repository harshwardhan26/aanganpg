import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

let connectionString = process.env.DATABASE_URL;

if (connectionString?.startsWith('prisma+postgres://')) {
  const url = new URL(connectionString);
  const apiKey = url.searchParams.get('api_key');
  if (apiKey) {
    const decoded = Buffer.from(apiKey, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    connectionString = parsed.databaseUrl;
  }
}

// In production, you might want to attach this to the global object
// to avoid exhausting connections during hot reloads in development.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString })),
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
