import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

let connectionString = process.env.DATABASE_URL;

// A local `prisma dev` server hands out a prisma+postgres:// URL whose api_key
// carries the real Postgres connection string.
if (connectionString?.startsWith('prisma+postgres://')) {
  const apiKey = new URL(connectionString).searchParams.get('api_key');
  if (apiKey) {
    connectionString = JSON.parse(Buffer.from(apiKey, 'base64').toString('utf-8')).databaseUrl;
  }
}

const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString })) });

/**
 * The 15 colleges Kolhapur's student housing actually revolves around.
 *
 * Objects, not "slug/name/short/area" strings split on "/". One of the areas is
 * "Kagal Road / MIDC" — it contains the delimiter, so KIT was seeded with an
 * area of "Kagal Road " and the trailing half was silently dropped.
 *
 * `area` must match an entry in KOLHAPUR_LOCALITIES.
 */
const colleges = [
  { slug: 'shivaji-university', name: 'Shivaji University', shortName: 'SUK', area: 'Kadamwadi' },
  { slug: 'rajaram-college', name: 'Rajaram College', shortName: 'Rajaram', area: 'Kasaba Bawada' },
  { slug: 'kit-college', name: 'KIT College of Engineering', shortName: 'KIT', area: 'Kagal Road / MIDC' },
  { slug: 'dy-patil-engineering', name: 'D. Y. Patil College of Engineering', shortName: 'DYPCET', area: 'Kasaba Bawada' },
  { slug: 'dy-patil-medical', name: 'D. Y. Patil Medical College', shortName: 'DY Patil Medical', area: 'Kadamwadi' },
  { slug: 'csiber', name: 'CSIBER', shortName: 'CSIBER', area: 'Nagala Park' },
  { slug: 'vivekanand-college', name: 'Vivekanand College', shortName: 'Vivekanand', area: 'Tarabai Park' },
  { slug: 'new-college', name: 'New College', shortName: 'New College', area: 'Shahupuri' },
  { slug: 'bharati-vidyapeeth', name: 'Bharati Vidyapeeth', shortName: 'Bharati', area: 'Kadamwadi' },
  { slug: 'sanjay-ghodawat', name: 'Sanjay Ghodawat University', shortName: 'Ghodawat', area: 'Uchgaon' },
  { slug: 'gov-polytechnic', name: 'Government Polytechnic', shortName: 'Polytechnic', area: 'Kalamba' },
  { slug: 'gov-iti', name: 'Government ITI', shortName: 'ITI', area: 'Phulewadi' },
  { slug: 'nursing-college', name: 'D. Y. Patil College of Nursing', shortName: 'Nursing', area: 'Kadamwadi' },
  { slug: 'pharmacy-college', name: 'Bharati Vidyapeeth College of Pharmacy', shortName: 'Pharmacy', area: 'Kadamwadi' },
  { slug: 'shahu-college', name: 'Rajarshi Shahu College', shortName: 'Shahu', area: 'Rajarampuri' },
];

async function main() {
  // Upsert on slug: colleges are reference data that must land on a database
  // that already has listings, and a second run must change nothing.
  for (const c of colleges) {
    await prisma.college.upsert({ where: { slug: c.slug }, update: c, create: c });
  }
  console.log(`${colleges.length} colleges upserted.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
