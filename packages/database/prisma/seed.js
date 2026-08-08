// Layer 2 seed data (docs/10-testing-strategy.md / global CLAUDE.md §5): idempotent
// reference baseline, safe to run repeatedly against dev, test, or a fresh prod DB.
const { getPrismaClient } = require('../index');

async function main() {
  const prisma = getPrismaClient();

  await prisma.conversationPolicy.upsert({
    where: { matchType: 'NORMAL' },
    update: {},
    create: { matchType: 'NORMAL', initiatorRule: 'EITHER', initiationWindowHours: 168 },
  });

  await prisma.conversationPolicy.upsert({
    where: { matchType: 'HUMBLE' },
    update: {},
    create: { matchType: 'HUMBLE', initiatorRule: 'EITHER', initiationWindowHours: 168 },
  });

  console.log('Seed complete: ConversationPolicy defaults ensured.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { getPrismaClient: getClient } = require('../index');
    await getClient().$disconnect();
  });
