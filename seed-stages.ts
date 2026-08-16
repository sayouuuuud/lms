import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const count = await prisma.stages.count()
  if (count === 0) {
    await prisma.stages.createMany({
      data: [
        { slug: 'sec-1', idx: '1', title: 'الصف العاشر', subtitle: '', image: '/stages/sec-1.png', sort_order: 1, term_price: 0 },
        { slug: 'sec-2', idx: '2', title: 'الصف الحادي عشر', subtitle: '', image: '/stages/sec-2.png', sort_order: 2, term_price: 0 },
        { slug: 'sec-3', idx: '3', title: 'الصف الثاني عشر', subtitle: '', image: '/stages/sec-3.png', sort_order: 3, term_price: 0 },
      ]
    })
    console.log('Seeded stages.')
  } else {
    console.log('Stages already exist.')
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
