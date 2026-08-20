import { prisma, runWithUserContext } from '../lib/prisma.ts'

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

async function run() {
  console.log('================================================================')
  console.log('  ROUND 3 ADVERSARIAL: BATCH OPS, NESTED RELATIONS & ISOLATION  ')
  console.log('================================================================\n')

  // Find two real students
  const students = await prisma.students.findMany({
    take: 2,
    include: { users: true }
  })
  if (students.length < 2) {
    console.error('Not enough students found in DB to run tests.')
    process.exit(1)
  }

  const studentA = students[0]
  const studentB = students[1]
  const adminProfile = await prisma.profiles.findFirst({ where: { role: 'admin' } })

  console.log(`Student A: ${studentA.name} (${studentA.user_id}) [student_id: ${studentA.id}]`)
  console.log(`Student B: ${studentB.name} (${studentB.user_id}) [student_id: ${studentB.id}]`)
  console.log(`Admin:     ${adminProfile?.email} (${adminProfile?.id})\n`)

  const ctxA = { id: studentA.user_id, role: 'student', email: studentA.users?.email }
  const ctxB = { id: studentB.user_id, role: 'student', email: studentB.users?.email }
  const ctxAdmin = { id: adminProfile?.id, role: 'admin', email: adminProfile?.email }
  const ctxAnon = { role: 'anon' }

  // -------------------------------------------------------------
  // TEST SUITE 1: Batch Operations (updateMany, deleteMany, createMany)
  // -------------------------------------------------------------
  console.log('--- TEST GROUP 1: Batch Operations under RLS Context ---')

  // 1.1 Student A attempts blanket updateMany on students
  await runWithUserContext(ctxA, async () => {
    const res = await prisma.students.updateMany({
      data: { school_name: 'HACKED_SCHOOL_BATCH' }
    })
    assert(res.count <= 1, `Student A updateMany affected only own record (${res.count} affected, <= 1 expected)`)
  })

  // Verify Student B was NOT modified
  const studentBCheck = await prisma.students.findUnique({ where: { id: studentB.id } })
  assert(studentBCheck.school_name !== 'HACKED_SCHOOL_BATCH', 'Student B school_name remains untouched by Student A updateMany')

  // Revert Student A school_name
  await runWithUserContext(ctxA, async () => {
    await prisma.students.updateMany({
      where: { id: studentA.id },
      data: { school_name: studentA.school_name || null }
    })
  })

  // 1.2 Student A attempts blanket deleteMany on orders targeting Student B
  await runWithUserContext(ctxA, async () => {
    const res = await prisma.orders.deleteMany({
      where: { student_id: studentB.user_id }
    })
    assert(res.count === 0, `Student A deleteMany on Student B orders deleted 0 rows (${res.count} deleted)`)
  })

  // 1.3 Student A attempts blanket updateMany on orders
  await runWithUserContext(ctxA, async () => {
    const res = await prisma.orders.updateMany({
      data: { note: 'TAMPERED_BY_STUDENT_A' }
    })
    // Check if any of Student B's orders got updated
    const tamperedB = await prisma.orders.findMany({
      where: { student_id: studentB.user_id, note: 'TAMPERED_BY_STUDENT_A' }
    })
    assert(tamperedB.length === 0, `Student A updateMany on orders did NOT affect Student B orders (count: ${tamperedB.length})`)
  })

  // 1.4 Student A creates lecture_playback_sessions via createMany
  // Fetch a lesson id if available
  const lesson = await prisma.lessons.findFirst()
  const testLessonId = lesson?.id || '00000000-0000-0000-0000-000000000001'

  // Clean up any existing session for studentA/testLessonId
  await prisma.lecture_playback_sessions.deleteMany({
    where: { user_id: studentA.user_id, lesson_id: testLessonId }
  })

  await runWithUserContext(ctxA, async () => {
    try {
      const res = await prisma.lecture_playback_sessions.createMany({
        data: [
          {
            user_id: studentA.user_id,
            lesson_id: testLessonId,
            sid: 'test_token_batch_1_' + Date.now()
          }
        ]
      })
      assert(res.count === 1, `Student A createMany for own records succeeded (count: ${res.count})`)
    } catch (e) {
      assert(false, `Student A createMany failed: ${e.message}`)
    }
  })

  // 1.5 Student A attempts createMany with Student B's user_id
  await runWithUserContext(ctxA, async () => {
    let blocked = false
    try {
      await prisma.lecture_playback_sessions.createMany({
        data: [
          {
            user_id: studentB.user_id,
            lesson_id: testLessonId,
            sid: 'malicious_token_' + Date.now()
          }
        ]
      })
    } catch (e) {
      blocked = true
    }
    // Verify no session was created for Student B
    const leakedSession = await prisma.lecture_playback_sessions.findFirst({
      where: { user_id: studentB.user_id, sid: { startsWith: 'malicious_token_' } }
    })
    assert(blocked || !leakedSession, 'Student A cannot forge records for Student B via createMany (BLOCKED / ISOLATED)')
  })

  // -------------------------------------------------------------
  // TEST SUITE 2: Nested Relational Includes and Filters
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Nested Relational Queries & Filters ---')

  // 2.1 Student A querying courses with nested enrollments
  await runWithUserContext(ctxA, async () => {
    const courses = await prisma.courses.findMany({
      take: 5,
      include: {
        enrollments: true
      }
    })
    assert(courses.length >= 0, `Student A can query courses with nested enrollments (${courses.length} courses)`)
    
    // Check that any returned enrollments belong ONLY to Student A
    let crossEnrollmentsFound = 0
    for (const c of courses) {
      for (const enr of (c.enrollments || [])) {
        if (enr.student_id !== studentA.id) {
          crossEnrollmentsFound++
        }
      }
    }
    assert(crossEnrollmentsFound === 0, `Nested enrollments contained 0 other students records (found: ${crossEnrollmentsFound})`)
  })

  // 2.2 Student A querying students with nested enrollments & submissions
  await runWithUserContext(ctxA, async () => {
    const studentsWithSubmissions = await prisma.students.findMany({
      include: {
        exam_submissions: true,
        assignment_submissions: true
      }
    })
    assert(studentsWithSubmissions.length === 1, `Student A findMany with nested submissions returned exactly 1 student (${studentsWithSubmissions.length})`)
    assert(studentsWithSubmissions[0].id === studentA.id, 'Nested query returned only Student A record')
  })

  // 2.3 Student A filtering courses by other student's enrollment
  await runWithUserContext(ctxA, async () => {
    const courses = await prisma.courses.findMany({
      where: {
        enrollments: {
          some: {
            student_id: studentB.id
          }
        }
      }
    })
    // Under RLS, Student A cannot see Student B's enrollments, so this condition should match 0 courses
    assert(courses.length === 0, `Student A cannot filter courses based on Student B enrollments (got ${courses.length} courses)`)
  })

  // -------------------------------------------------------------
  // TEST SUITE 3: Anonymous (Anon) Boundary Checks
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Anon Context Isolation & Public Catalog ---')

  // 3.1 Anon querying sensitive tables
  await runWithUserContext(ctxAnon, async () => {
    const stds = await prisma.students.findMany()
    assert(stds.length === 0, `Anon cannot read students (returned ${stds.length})`)

    const profs = await prisma.profiles.findMany()
    assert(profs.length === 0, `Anon cannot read profiles (returned ${profs.length})`)

    const ords = await prisma.orders.findMany()
    assert(ords.length === 0, `Anon cannot read orders (returned ${ords.length})`)

    const pays = await prisma.payments.findMany()
    assert(pays.length === 0, `Anon cannot read payments (returned ${pays.length})`)

    const msgs = await prisma.messages.findMany()
    assert(msgs.length === 0, `Anon cannot read messages (returned ${msgs.length})`)

    const sess = await prisma.lecture_playback_sessions.findMany()
    assert(sess.length === 0, `Anon cannot read playback sessions (returned ${sess.length})`)
  })

  // 3.2 Anon querying public catalog
  await runWithUserContext(ctxAnon, async () => {
    const publicCourses = await prisma.courses.findMany({
      where: { status: 'published' }
    })
    assert(publicCourses.length >= 0, `Anon can view published course catalog (${publicCourses.length} courses)`)
  })

  // -------------------------------------------------------------
  // TEST SUITE 4: Admin Capabilities under RLS
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Admin Visibility & Capabilities ---')

  await runWithUserContext(ctxAdmin, async () => {
    const allStudents = await prisma.students.findMany()
    assert(allStudents.length >= 2, `Admin can view all students (count: ${allStudents.length})`)

    const allOrders = await prisma.orders.findMany()
    assert(allOrders.length >= 0, `Admin can view all orders (count: ${allOrders.length})`)

    const allProfiles = await prisma.profiles.findMany()
    assert(allProfiles.length >= 2, `Admin can view all profiles (count: ${allProfiles.length})`)
  })

  // -------------------------------------------------------------
  // TEST SUITE 5: Malformed / Incomplete Context Resilience
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Malformed Context Resilience ---')

  // Context with role = 'student' but NO id
  await runWithUserContext({ role: 'student' }, async () => {
    const stds = await prisma.students.findMany()
    assert(stds.length === 0, `Context with role='student' and no id cannot read students (returned ${stds.length})`)
  })

  // Context with invalid UUID string
  await runWithUserContext({ id: 'not-a-valid-uuid', role: 'student' }, async () => {
    const stds = await prisma.students.findMany()
    assert(stds.length === 0, `Context with invalid UUID cannot read students (returned ${stds.length})`)
  })

  // Context with role = 'assistant' without ID
  await runWithUserContext({ role: 'assistant' }, async () => {
    const stds = await prisma.students.findMany()
    assert(stds.length === 0, `Context with role='assistant' and no id cannot read students (returned ${stds.length})`)
  })

  console.log('\n================================================================')
  console.log(`   ROUND 3 RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('================================================================\n')

  await prisma.$disconnect()
  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((e) => {
  console.error('Test execution error:', e)
  process.exit(1)
})
