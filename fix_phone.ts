import prisma from "./src/lib/prisma";

async function main() {
  const phone = '+917588603477';
  const adminEmail = 'hppatilhpp@gmail.com';

  const oldHolder = await prisma.user.findUnique({ where: { phone } });
  if (oldHolder) {
    console.log(`Found old holder: ${oldHolder.email}. Removing phone...`);
    await prisma.user.update({ where: { id: oldHolder.id }, data: { phone: null } });
  }

  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (admin) {
    console.log(`Found admin account. Setting phone to ${phone}...`);
    await prisma.user.update({ where: { id: admin.id }, data: { phone } });
  } else {
    console.log(`Admin account not found yet! Please log in first.`);
  }
}

main().catch(console.error);
