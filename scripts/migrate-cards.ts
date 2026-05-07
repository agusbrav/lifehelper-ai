import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const cardItems = await db.budgetItem.findMany({
    where: { isCard: true, parentId: null },
    select: { userId: true, name: true, category: true },
    distinct: ['userId', 'name'],
  })

  console.log(`Found ${cardItems.length} unique card(s) to migrate.`)

  for (const item of cardItems) {
    await db.card.upsert({
      where: { userId_name: { userId: item.userId, name: item.name } },
      update: {},
      create: { userId: item.userId, name: item.name, category: item.category },
    })
    console.log(`  Migrated: ${item.name} (user ${item.userId})`)
  }

  console.log('Done.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
