import prisma from '../src/lib/prisma';
async function main() {
  const slugs = ['zero-beds-vacant', 'closed-pg', 'verified-fully-loaded-pg', 'very-long-title'];
  const res = await prisma.property.deleteMany({
    where: { slug: { in: slugs } }
  });
  console.log(`Deleted ${res.count} test fixtures from the database.`);
}
main();
