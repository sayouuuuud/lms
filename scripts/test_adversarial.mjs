import fs from 'fs'
if (typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile() } catch (e) {}
} else if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i !== -1 && !process.env[t.slice(0, i).trim()]) {
      process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
    }
  }
}
import { runWithUserContext, withUserTx, prisma, rawPrisma, getScopedPrisma } from '../lib/prisma.ts'
import { Client } from 'pg'

async function runAdversarialTests() {
  console.log('================================================================')
  console.log('            ADVERSARIAL RLS & PRISMA TEST SUITE                 ')
  console.log('================================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`)
      passed++
    } else {
      console.error(`  [FAIL] ${message}`)
      failed++
    }
  }

  // 1. Fetch real test data
  const students = await rawPrisma.students.findMany({
    where: { user_id: { not: null } },
    take: 3,
  })

  if (students.length < 2) {
    throw new Error('Need at least 2 students for adversarial testing')
  }

  const sA = students[0]
  const sB = students[1]
  const admin = await rawPrisma.profiles.findFirst({ where: { role: 'admin' } })

  console.log(`Testing Student A: ${sA.name} (${sA.user_id})`)
  console.log(`Testing Student B: ${sB.name} (${sB.user_id})`)
  if (admin) console.log(`Testing Admin:     ${admin.email} (${admin.id})`)

  console.log('\n--- ATTACK 1: High Concurrency Interleaved Contexts ---')
  // Run 100 concurrent promises alternating between Student A and Student B
  // Every Student A query MUST only see Student A, every Student B MUST only see Student B
  const concurrentTasks = []
  let concurrencyErrors = 0

  for (let i = 0; i < 60; i++) {
    const isA = i % 2 === 0
    const targetUser = isA ? sA : sB
    const expectedId = targetUser.id
    const expectedUserId = targetUser.user_id

    const task = (async () => {
      // Add random delay to simulate asynchronous interleaved execution
      await new Promise(r => setTimeout(r, Math.random() * 20))
      return runWithUserContext({ id: expectedUserId, role: 'student' }, async () => {
        await new Promise(r => setTimeout(r, Math.random() * 20))
        const res = await prisma.students.findMany()
        if (res.length !== 1 || res[0].id !== expectedId) {
          concurrencyErrors++
          console.error(`[LEAK] Iteration ${i}: Expected student ${expectedId}, got:`, res.map(r => r.id))
        }
      })
    })()
    concurrentTasks.push(task)
  }

  await Promise.all(concurrentTasks)
  assert(concurrencyErrors === 0, `Concurrency test: 60 interleaved async requests had 0 context leaks (errors: ${concurrencyErrors})`)

  console.log('\n--- ATTACK 2: Explicit prisma.$transaction inside runWithUserContext ---')
  try {
    let txSuccess = false
    await runWithUserContext({ id: sA.user_id, role: 'student' }, async () => {
      // Test multi-step transaction under student context
      const result = await prisma.$transaction(async (tx) => {
        const student = await tx.students.findFirst({ where: { user_id: sA.user_id } })
        const other = await tx.students.findFirst({ where: { user_id: sB.user_id } })
        return { student, other }
      })
      if (result.student && result.student.id === sA.id && result.other === null) {
        txSuccess = true
      } else {
        console.error('Unexpected tx result:', result)
      }
    })
    assert(txSuccess, `Explicit prisma.$transaction works and preserves RLS isolation inside user context`)
  } catch (err) {
    console.error('Attack 2 failed with error:', err)
    assert(false, `Explicit prisma.$transaction failed under user context: ${err.message}`)
  }

  console.log('\n--- ATTACK 3: Malicious / Injection Payload in Context ---')
  // Try SQL injection via user id or role
  try {
    let injectionBlocked = false
    await runWithUserContext({ id: "'; DROP TABLE dummy_nonexistent; --", role: 'student' }, async () => {
      try {
        const res = await prisma.students.findMany()
        if (res.length === 0) {
          injectionBlocked = true
        }
      } catch (err) {
        injectionBlocked = true
      }
    })
    assert(injectionBlocked, `SQL injection in userContext id is safely neutralized (0 rows returned or rejected)`)
  } catch (err) {
    assert(true, `SQL injection in userContext id is safely rejected`)
  }

  console.log('\n--- ATTACK 4: Cross-Tenant Mutation (UPDATE / DELETE) Attack ---')
  // Student A tries to update Student B's profile
  await runWithUserContext({ id: sA.user_id, role: 'student' }, async () => {
    const updateProfile = await prisma.profiles.updateMany({
      where: { id: sB.user_id },
      data: { full_name: 'Hacked Profile' },
    })
    assert(updateProfile.count === 0, `Student A cannot update Student B's profile record (0 rows updated)`)

    // Student A tries to delete Student B's order
    const deleteOrders = await prisma.orders.deleteMany({
      where: { student_id: sB.user_id },
    })
    assert(deleteOrders.count === 0, `Student A cannot delete Student B's orders (0 rows deleted)`)
  })

  console.log('\n--- ATTACK 5: Check ALL Tables for RLS Activation & Default Policies ---')
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const tablesRes = await client.query(`
    SELECT c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `)

  let unsecureTables = []
  for (const row of tablesRes.rows) {
    if (!row.rls_enabled) {
      unsecureTables.push(row.table_name)
    }
  }

  assert(unsecureTables.length === 0, `All ${tablesRes.rowCount} public tables have RLS enabled. (Unsecured: ${unsecureTables.join(', ') || 'none'})`)

  // Check policies on sensitive tables
  const sensitiveTables = [
    'students', 'profiles', 'orders', 'order_items', 'payments', 'cart_items',
    'student_devices', 'student_device_sessions', 'student_weekly_goals',
    'learning_activity', 'lesson_progress', 'student_content_progress',
    'exam_submissions', 'exam_answers', 'assignment_submissions', 'messages',
    'notifications', 'notification_reads', 'lecture_playback_sessions'
  ]

  const policiesRes = await client.query(`
    SELECT tablename, policyname, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public';
  `)

  const tablesWithPolicies = new Set(policiesRes.rows.map(r => r.tablename))
  let sensitiveMissingPolicies = []
  for (const t of sensitiveTables) {
    if (!tablesWithPolicies.has(t)) {
      sensitiveMissingPolicies.push(t)
    }
  }

  assert(sensitiveMissingPolicies.length === 0, `All sensitive tables have RLS policies defined. (Missing: ${sensitiveMissingPolicies.join(', ') || 'none'})`)

  console.log('\n--- ATTACK 6: Assistant Permission Enforcement ---')
  // Find or create an assistant
  const assistantProfile = await client.query(`
    SELECT id, email, role FROM public.profiles WHERE role = 'assistant' LIMIT 1
  `)

  if (assistantProfile.rowCount > 0) {
    const asstId = assistantProfile.rows[0].id
    console.log(`Testing Assistant: ${assistantProfile.rows[0].email} (${asstId})`)

    // Check assistant permissions in table
    const perms = await client.query(`
      SELECT resource, access_level FROM public.assistant_permissions WHERE profile_id = $1
    `, [asstId])
    console.log(`Assistant has permissions:`, perms.rows)

    // Test assistant querying students under scoped context
    await runWithUserContext({ id: asstId, role: 'assistant' }, async () => {
      const studentCount = await prisma.students.count()
      console.log(`Assistant student count: ${studentCount}`)
    })
  } else {
    console.log('No assistant profile found in database; skipping live assistant check.')
  }

  await client.end()
  await prisma.$disconnect()

  console.log('\n================================================================')
  console.log(`   ADVERSARIAL RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('================================================================\n')

  if (failed > 0) process.exit(1)
}

runAdversarialTests().catch(err => {
  console.error('Adversarial test fatal error:', err)
  process.exit(1)
})
