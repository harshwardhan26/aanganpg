import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'hppatil' } },
        { phone: '+918830810131' },
        { email: { contains: 'harsh' } }
      ]
    }
  });
  console.log("Found users:", JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
