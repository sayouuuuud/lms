import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test() {
  console.log('Testing raw prisma connection...')
  const student = await prisma.students.findFirst({
    where: { user_id: { not: null } }
  })
  console.log('Found student:', student?.id, student?.name, student?.user_id)

  await prisma.$disconnect()
}

test().catch(console.error)
