import { PrismaClient } from '@prisma/client'
import { AsyncLocalStorage } from 'node:async_hooks'

const rawPrisma = new PrismaClient()
const userContextStorage = new AsyncLocalStorage()

export function runWithUserContext(context, callback) {
  return userContextStorage.run(context, callback)
}

export function getCurrentUserContext() {
  return userContextStorage.getStore()
}

export async function withUserTx(context, fn) {
  return rawPrisma.$transaction(async (tx) => {
    const role = context.role || (context.id ? 'authenticated' : 'anon')
    if (role === 'authenticated' || role === 'anon') {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${role};`)
    }
    if (context.id) {
      await tx.$executeRawUnsafe(`SELECT set_config('request.jwt.claim.sub', '${context.id}', true);`)
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', '${context.id}', true);`)
    }
    if (context.role) {
      await tx.$executeRawUnsafe(`SELECT set_config('request.jwt.claim.role', '${context.role}', true);`)
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_role', '${context.role}', true);`)
    }
    return await fn(tx)
  })
}

async function testPrismaExtension() {
  console.log('Testing withUserTx...')
  const studentA_UserId = '4c00b96f-fbe5-46af-a287-1f8212ea4cf5'
  const studentB_UserId = '96fc83b3-a369-47cb-8481-f01a3f433d2c'

  // Query as Student A
  const studentAResult = await withUserTx({ id: studentA_UserId, role: 'authenticated' }, async (tx) => {
    return await tx.students.findMany()
  })
  console.log(`Student A sees ${studentAResult.length} students:`, studentAResult.map(s => s.name))

  // Query as Student B
  const studentBResult = await withUserTx({ id: studentB_UserId, role: 'authenticated' }, async (tx) => {
    return await tx.students.findMany()
  })
  console.log(`Student B sees ${studentBResult.length} students:`, studentBResult.map(s => s.name))

  // Query as Admin
  const adminResult = await withUserTx({ id: '64a7cdf2-661c-4e2d-84d5-0b7d0034777a', role: 'admin' }, async (tx) => {
    return await tx.students.findMany()
  })
  console.log(`Admin sees ${adminResult.length} students.`)

  await rawPrisma.$disconnect()
}

testPrismaExtension().catch(console.error)
