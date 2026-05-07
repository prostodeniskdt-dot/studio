import { prisma } from '../src/lib/db';

async function main() {
  await prisma.product.count();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

