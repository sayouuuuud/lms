import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const s = await prisma.settings.findUnique({ where: { key: 'global' } })
  if (s) {
    const val = s.value as any
    val.security.allowRegistrations = true
    await prisma.settings.update({ where: { key: 'global' }, data: { value: val } })
    console.log('Registration enabled successfully!')
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
