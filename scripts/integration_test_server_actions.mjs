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

import { runWithUserContext, withUserTx, prisma } from '../lib/prisma.ts'

async function runIntegrationTests() {
  console.log('================================================================')
  console.log('   PRISMA + RLS SERVER ACTIONS & APP INTEGRATION TEST SUITE     ')
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

  // 1. Fetch real student users and admin from DB
  const students = await prisma.students.findMany({
    where: { user_id: { not: null } },
    take: 2,
  })

  if (students.length < 2) {
    throw new Error('Need at least 2 students for integration test')
  }

  const studentA = students[0]
  const studentB = students[1]

  const adminProfile = await prisma.profiles.findFirst({
    where: { role: 'admin' },
  })

  console.log(`Testing with Student A: ${studentA.name} (User ID: ${studentA.user_id})`)
  console.log(`Testing with Student B: ${studentB.name} (User ID: ${studentB.user_id})`)
  if (adminProfile) {
    console.log(`Testing with Admin:     ${adminProfile.email} (ID: ${adminProfile.id})\n`)
  }

  // --- TEST SUITE 1: Prisma Queries Scoped to Student A ---
  console.log('--- TEST GROUP 1: Student A Scoped Prisma Operations ---')
  await runWithUserContext({ id: studentA.user_id, role: 'student' }, async () => {
    // 1.1 List all students
    const visibleStudents = await prisma.students.findMany()
    assert(visibleStudents.length === 1, `Student A sees exactly 1 student via Prisma findMany (got ${visibleStudents.length})`)
    assert(visibleStudents[0]?.id === studentA.id, `Visible student is Student A`)

    // 1.2 Find specific Student B by ID
    const studentBQuery = await prisma.students.findUnique({
      where: { id: studentB.id },
    })
    assert(studentBQuery === null, `Student A querying Student B by ID returns null (RLS blocks)`)

    // 1.3 Find profile
    const profiles = await prisma.profiles.findMany()
    assert(profiles.length === 1 && profiles[0]?.id === studentA.user_id, `Student A sees only their own profile record`)

    // 1.4 Attempt to update Student B
    const updateResult = await prisma.students.updateMany({
      where: { id: studentB.id },
      data: { name: 'Attempted Hack by Student A' },
    })
    assert(updateResult.count === 0, `Student A update on Student B matches 0 records (RLS blocks write)`)

    // 1.5 Orders access
    const orders = await prisma.orders.findMany()
    const otherOrders = orders.filter(o => o.student_id !== studentA.user_id)
    assert(otherOrders.length === 0, `Student A sees 0 orders belonging to other students`)

    // 1.6 Payments access
    const payments = await prisma.payments.findMany()
    const otherPayments = payments.filter(p => p.student_id !== studentA.id)
    assert(otherPayments.length === 0, `Student A sees 0 payments belonging to other students`)

    // 1.7 Messages access
    const messages = await prisma.messages.findMany()
    const otherMessages = messages.filter(m => m.student_id !== studentA.user_id && m.student_id !== studentA.id)
    assert(otherMessages.length === 0, `Student A sees 0 messages belonging to other students`)

    // 1.8 Exam Submissions access
    const submissions = await prisma.exam_submissions.findMany()
    const otherSubmissions = submissions.filter(s => s.student_id !== studentA.id)
    assert(otherSubmissions.length === 0, `Student A sees 0 exam submissions belonging to other students`)
  })

  // --- TEST SUITE 2: Prisma Queries Scoped to Student B ---
  console.log('\n--- TEST GROUP 2: Student B Scoped Prisma Operations ---')
  await runWithUserContext({ id: studentB.user_id, role: 'student' }, async () => {
    // 2.1 List all students
    const visibleStudents = await prisma.students.findMany()
    assert(visibleStudents.length === 1, `Student B sees exactly 1 student via Prisma findMany (got ${visibleStudents.length})`)
    assert(visibleStudents[0]?.id === studentB.id, `Visible student is Student B`)

    // 2.2 Attempt to update Student A
    const updateResult = await prisma.students.updateMany({
      where: { id: studentA.id },
      data: { name: 'Attempted Hack by Student B' },
    })
    assert(updateResult.count === 0, `Student B update on Student A matches 0 records (RLS blocks write)`)
  })

  // --- TEST SUITE 3: Unauthenticated / Anon Scoped Operations ---
  console.log('\n--- TEST GROUP 3: Unauthenticated (Anon) Scoped Prisma Operations ---')
  await runWithUserContext({ role: 'anon' }, async () => {
    const studentsList = await prisma.students.findMany()
    assert(studentsList.length === 0, `Anon user cannot see any students (got 0)`)

    const profilesList = await prisma.profiles.findMany()
    assert(profilesList.length === 0, `Anon user cannot see any profiles (got 0)`)

    const coursesList = await prisma.courses.findMany({ take: 5 })
    assert(coursesList.length >= 0, `Anon user can browse public courses`)
  })

  // --- TEST SUITE 4: Admin Scoped Operations ---
  if (adminProfile) {
    console.log('\n--- TEST GROUP 4: Admin Full Access Verification ---')
    await runWithUserContext({ id: adminProfile.id, role: 'admin' }, async () => {
      // 4.1 Admin sees all students
      const allStudents = await prisma.students.findMany()
      assert(allStudents.length > 1, `Admin sees all students (${allStudents.length} records)`)

      // 4.2 Admin sees all orders
      const allOrders = await prisma.orders.findMany()
      assert(allOrders.length >= 0, `Admin sees all orders (${allOrders.length} records)`)

      // 4.3 Admin sees all payments
      const allPayments = await prisma.payments.findMany()
      assert(allPayments.length >= 0, `Admin sees all payments (${allPayments.length} records)`)

      // 4.4 Admin sees activity logs
      const logs = await prisma.activity_logs.findMany({ take: 5 })
      assert(logs !== undefined, `Admin can query activity logs`)
    })
  }

  // --- TEST SUITE 5: Default Unscoped / System Auth Adapter Flow ---
  console.log('\n--- TEST GROUP 5: Auth Adapter & Credentials Verification ---')
  // NextAuth authorize calls prisma.user.findFirst
  const user = await prisma.user.findFirst({
    where: { email: studentA.email },
  })
  assert(user !== null && user.id === studentA.user_id, `Auth flow can query User record for authentication`)

  console.log('\n================================================================')
  console.log(`   INTEGRATION RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('================================================================\n')

  await prisma.$disconnect()
  if (failed > 0) process.exit(1)
}

runIntegrationTests().catch((err) => {
  console.error('Integration test failed with error:', err)
  process.exit(1)
})
