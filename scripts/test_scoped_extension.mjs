import { PrismaClient } from '@prisma/client'
import { AsyncLocalStorage } from 'node:async_hooks'

const basePrisma = new PrismaClient()
const contextStorage = new AsyncLocalStorage()

export function runWithContext(ctx, fn) {
  return contextStorage.run(ctx, fn)
}

export const scopedPrisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const ctx = contextStorage.getStore()
        if (!ctx || (!ctx.id && !ctx.role)) {
          return query(args)
        }

        return basePrisma.$transaction(async (tx) => {
          const dbRole = ctx.id ? 'authenticated' : (ctx.dbRole || 'anon')
          await tx.$executeRawUnsafe(`SET LOCAL ROLE ${dbRole};`)
          if (ctx.id) {
            await tx.$executeRawUnsafe(`SELECT set_config('request.jwt.claim.sub', '${ctx.id}', true);`)
            await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', '${ctx.id}', true);`)
          } else {
            await tx.$executeRawUnsafe(`SELECT set_config('request.jwt.claim.sub', '', true);`)
            await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', '', true);`)
          }
          const appRole = ctx.role || (ctx.id ? 'student' : 'anon')
          await tx.$executeRawUnsafe(`SELECT set_config('request.jwt.claim.role', '${appRole}', true);`)
          await tx.$executeRawUnsafe(`SELECT set_config('app.current_role', '${appRole}', true);`)

          return tx[model][operation](args)
        })
      }
    }
  }
})

async function testScopedPrisma() {
  console.log('Testing auto-scoped Prisma extension with authenticated DB role...')

  const studentA_UserId = '4c00b96f-fbe5-46af-a287-1f8212ea4cf5'
  const studentB_UserId = '96fc83b3-a369-47cb-8481-f01a3f433d2c'

  // 1. Without context (admin/service default)
  const defaultList = await scopedPrisma.students.findMany()
  console.log(`Default context sees ${defaultList.length} students.`)

  // 2. In Student A context
  const studentAList = await runWithContext({ id: studentA_UserId, role: 'student' }, async () => {
    return await scopedPrisma.students.findMany()
  })
  console.log(`Student A context sees ${studentAList.length} students:`, studentAList.map(s => s.name))

  // 3. In Student B context
  const studentBList = await runWithContext({ id: studentB_UserId, role: 'student' }, async () => {
    return await scopedPrisma.students.findMany()
  })
  console.log(`Student B context sees ${studentBList.length} students:`, studentBList.map(s => s.name))

  // 4. In Admin context
  const adminList = await runWithContext({ id: '64a7cdf2-661c-4e2d-84d5-0b7d0034777a', role: 'admin' }, async () => {
    return await scopedPrisma.students.findMany()
  })
  console.log(`Admin context sees ${adminList.length} students.`)

  await basePrisma.$disconnect()
}

testScopedPrisma().catch(console.error)
