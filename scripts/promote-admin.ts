import { prisma } from '../src/lib/db';

async function main() {
  const email = (process.argv[2] ?? '').trim().toLowerCase();
  if (!email) {
    throw new Error('Usage: tsx scripts/promote-admin.ts <email>');
  }

  const updated = await prisma.userProfile.updateMany({
    where: { email },
    data: { role: 'admin' },
  });

  console.log(`Promoted ${updated.count} user(s) to admin for email=${email}`);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

