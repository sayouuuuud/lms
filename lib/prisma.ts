import { PrismaClient, Prisma } from "@prisma/client"
import { AsyncLocalStorage } from "node:async_hooks"

export interface UserContext {
  id?: string | null
  role?: string | null
  email?: string | null
}

export const userContextStorage = new AsyncLocalStorage<UserContext>()

export function runWithUserContext<T>(context: UserContext, callback: () => Promise<T>): Promise<T> {
  return userContextStorage.run(context, callback)
}

export function getCurrentUserContext(): UserContext | undefined {
  return userContextStorage.getStore()
}

const globalForPrisma = globalThis as unknown as {
  prisma: any
  rawPrisma: PrismaClient
}

export const rawPrisma = globalForPrisma.rawPrisma || new PrismaClient()

/**
 * Configures PostgreSQL session parameters (SET LOCAL ROLE & set_config) for RLS.
 */
export async function setupRlsSession(tx: any, context: UserContext): Promise<void> {
  const isSuper = context.role === 'service_role' || (!context.id && !context.role)
  if (isSuper) {
    return
  }

  const dbRole = context.id ? 'authenticated' : 'anon'
  await tx.$executeRawUnsafe(`SET LOCAL ROLE ${dbRole};`)

  const userId = context.id || ''
  await tx.$executeRaw`SELECT set_config('request.jwt.claim.sub', ${userId}, true);`
  await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true);`

  const appRole = context.id ? (context.role || 'student') : 'anon'
  await tx.$executeRaw`SELECT set_config('request.jwt.claim.role', ${appRole}, true);`
  await tx.$executeRaw`SELECT set_config('app.current_role', ${appRole}, true);`
}

/**
 * Executes a callback within an interactive transaction that sets
 * the PostgreSQL role and RLS session parameters for the given user.
 */
export async function withUserTx<T>(
  context: UserContext,
  fn: (tx: any) => Promise<T>,
  options?: { maxWait?: number; timeout?: number; isolationLevel?: any }
): Promise<T> {
  const isSuper = context.role === 'service_role' || (!context.id && !context.role)
  const txOpts = { maxWait: 10000, timeout: 30000, ...options }

  return rawPrisma.$transaction(async (tx) => {
    if (!isSuper) {
      await setupRlsSession(tx, context)
    }
    return await fn(tx)
  }, txOpts)
}

/**
 * Returns a scoped prisma client for explicit user scoping.
 */
export function getScopedPrisma(context: UserContext) {
  return rawPrisma.$extends({
    client: {
      async $transaction<R>(
        arg: ((tx: Prisma.TransactionClient) => Promise<R>) | Prisma.PrismaPromise<any>[],
        options?: { maxWait?: number; timeout?: number; isolationLevel?: Prisma.TransactionIsolationLevel }
      ): Promise<any> {
        const txOpts = { maxWait: 10000, timeout: 30000, ...options }
        if (typeof arg === 'function') {
          return rawPrisma.$transaction(async (tx) => {
            await setupRlsSession(tx, context)
            return await arg(tx)
          }, txOpts)
        }
        return (rawPrisma as any).$transaction(arg, options)
      },
      async $queryRaw<T = any>(query: any, ...values: any[]): Promise<T> {
        return withUserTx(context, async (tx) => {
          return tx.$queryRaw(query, ...values)
        })
      },
      async $executeRaw<T = any>(query: any, ...values: any[]): Promise<T> {
        return withUserTx(context, async (tx) => {
          return tx.$executeRaw(query, ...values)
        })
      },
      async $queryRawUnsafe<T = any>(query: string, ...values: any[]): Promise<T> {
        return withUserTx(context, async (tx) => {
          return tx.$queryRawUnsafe(query, ...values)
        })
      },
      async $executeRawUnsafe<T = any>(query: string, ...values: any[]): Promise<T> {
        return withUserTx(context, async (tx) => {
          return tx.$executeRawUnsafe(query, ...values)
        })
      }
    },
    query: {
      $allModels: {
        async $allOperations({ model, operation, args }: { model: any; operation: any; args: any }) {
          return withUserTx(context, async (tx) => {
            return (tx as any)[model][operation](args)
          })
        }
      }
    }
  })
}

const extendedPrisma = rawPrisma.$extends({
  client: {
    async $transaction<R>(
      arg: ((tx: Prisma.TransactionClient) => Promise<R>) | Prisma.PrismaPromise<any>[],
      options?: { maxWait?: number; timeout?: number; isolationLevel?: Prisma.TransactionIsolationLevel }
    ): Promise<any> {
      const ctx = userContextStorage.getStore()
      const txOpts = { maxWait: 10000, timeout: 30000, ...options }

      if (typeof arg === 'function') {
        if (!ctx || (!ctx.id && !ctx.role) || ctx.role === 'service_role') {
          return rawPrisma.$transaction(arg, txOpts)
        }
        return rawPrisma.$transaction(async (tx) => {
          await setupRlsSession(tx, ctx)
          return await arg(tx)
        }, txOpts)
      } else if (Array.isArray(arg)) {
        if (!ctx || (!ctx.id && !ctx.role) || ctx.role === 'service_role') {
          return rawPrisma.$transaction(arg as any, txOpts)
        }
        return rawPrisma.$transaction(async (tx) => {
          await setupRlsSession(tx, ctx)
          const results = []
          for (const item of arg) {
            results.push(await item)
          }
          return results
        }, txOpts)
      }
      return (rawPrisma as any).$transaction(arg, options)
    },
    async $queryRaw<T = any>(query: any, ...values: any[]): Promise<T> {
      const ctx = userContextStorage.getStore()
      if (!ctx || (!ctx.id && !ctx.role) || ctx.role === 'service_role') {
        return (rawPrisma as any).$queryRaw(query, ...values)
      }
      return withUserTx(ctx, async (tx) => {
        return tx.$queryRaw(query, ...values)
      })
    },
    async $executeRaw<T = any>(query: any, ...values: any[]): Promise<T> {
      const ctx = userContextStorage.getStore()
      if (!ctx || (!ctx.id && !ctx.role) || ctx.role === 'service_role') {
        return (rawPrisma as any).$executeRaw(query, ...values)
      }
      return withUserTx(ctx, async (tx) => {
        return tx.$executeRaw(query, ...values)
      })
    },
    async $queryRawUnsafe<T = any>(query: string, ...values: any[]): Promise<T> {
      const ctx = userContextStorage.getStore()
      if (!ctx || (!ctx.id && !ctx.role) || ctx.role === 'service_role') {
        return (rawPrisma as any).$queryRawUnsafe(query, ...values)
      }
      return withUserTx(ctx, async (tx) => {
        return tx.$queryRawUnsafe(query, ...values)
      })
    },
    async $executeRawUnsafe<T = any>(query: string, ...values: any[]): Promise<T> {
      const ctx = userContextStorage.getStore()
      if (!ctx || (!ctx.id && !ctx.role) || ctx.role === 'service_role') {
        return (rawPrisma as any).$executeRawUnsafe(query, ...values)
      }
      return withUserTx(ctx, async (tx) => {
        return tx.$executeRawUnsafe(query, ...values)
      })
    }
  },
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const ctx = userContextStorage.getStore()
        if (!ctx || (!ctx.id && !ctx.role) || ctx.role === 'service_role') {
          return query(args)
        }
        return withUserTx(ctx, async (tx) => {
          return (tx as any)[model][operation](args)
        })
      }
    }
  }
})

export const prisma = (globalForPrisma.prisma || extendedPrisma) as typeof extendedPrisma

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.rawPrisma = rawPrisma
  globalForPrisma.prisma = prisma
}
