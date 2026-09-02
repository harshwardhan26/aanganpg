/**
 * Creates a mess and hands it to its owner.
 *
 * There is no self-serve signup for this on purpose: a mess is onboarded by
 * Aangan, once, with the owner sitting there. The owner must already have
 * signed in with Google at least once, because that is what creates the `User`
 * row this attaches to.
 *
 *   npx tsx scripts/create-mess.ts "Shree Mess" owner@gmail.com
 */

async function main() {
  const [name, email] = process.argv.slice(2);

  if (!name || !email) {
    console.error('Usage: npx tsx scripts/create-mess.ts "<mess name>" <owner email>');
    process.exit(1);
  }

  // Before the import below, not after: `lib/prisma` reads DATABASE_URL while it
  // is being evaluated, so an import at the top of the file builds its pool from
  // an unset variable. `pg` then falls back to the OS username and the failure
  // reads "Database <your login name> does not exist", which points nowhere near
  // the actual cause. Next and the Prisma CLI load `.env` themselves; a bare
  // `tsx` run does not.
  try {
    process.loadEnvFile();
  } catch {
    // Already-exported environment variables are a valid way to run this.
  }
  const { default: prisma } = await import("../src/lib/prisma");

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, name: true },
    });

    if (!user) {
      console.error(
        `No account for ${email}. Ask them to sign in with Google on the site once, then run this again.`,
      );
      process.exit(1);
    }

    const mess = await prisma.mess.create({
      data: {
        name: name.trim(),
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });

    console.log(`Created "${mess.name}" for ${user.name ?? email}`);
    console.log(`Open it at /mess/${mess.id}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
