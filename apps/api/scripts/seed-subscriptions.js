const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });
  try {
    const users = await prisma.user.findMany({
      where: { subscription: null },
      select: { id: true, email: true },
    });
    console.log('Users without subscription:', users.length);

    if (users.length > 0) {
      const result = await prisma.subscription.createMany({
        data: users.map(function (u) {
          return { userId: u.id, plan: 'FREE', status: 'ACTIVE' };
        }),
        skipDuplicates: true,
      });
      console.log('Created FREE subscriptions:', result.count);
    } else {
      console.log('All users already have subscriptions.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
