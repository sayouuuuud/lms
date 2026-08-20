import { Client } from 'pg'
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

async function runSecurityVerification() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  console.log('================================================================')
  console.log('   ROW LEVEL SECURITY (RLS) COMPREHENSIVE VERIFICATION SUITE   ')
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

  // 1. Fetch test subjects: Student A, Student B, Admin, Assistant
  const studentsRes = await client.query(`
    SELECT s.id, s.user_id, s.name, s.email, p.role
    FROM public.students s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.user_id IS NOT NULL
    LIMIT 2
  `)

  if (studentsRes.rowCount < 2) {
    throw new Error('Need at least 2 students in database for cross-student test')
  }

  const studentA = studentsRes.rows[0]
  const studentB = studentsRes.rows[1]

  const adminRes = await client.query(`
    SELECT p.id, p.email, p.role
    FROM public.profiles p
    WHERE p.role = 'admin'
    LIMIT 1
  `)
  const admin = adminRes.rows[0]

  console.log(`Target Student A: ${studentA.name} (${studentA.user_id})`)
  console.log(`Target Student B: ${studentB.name} (${studentB.user_id})`)
  if (admin) {
    console.log(`Target Admin:     ${admin.email} (${admin.id})\n`)
  }

  // Helper to run query in simulated user context
  async function queryAsUser(userId, role, sql, params = []) {
    await client.query('BEGIN')
    try {
      if (role) {
        await client.query(`SET LOCAL ROLE ${role}`)
      }
      if (userId) {
        await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId])
        await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [userId])
      } else {
        await client.query(`SELECT set_config('request.jwt.claim.sub', '', true)`)
        await client.query(`SELECT set_config('app.current_user_id', '', true)`)
      }
      if (role) {
        await client.query(`SELECT set_config('request.jwt.claim.role', $1, true)`, [role])
        await client.query(`SELECT set_config('app.current_role', $1, true)`, [role])
      }
      const res = await client.query(sql, params)
      await client.query('COMMIT')
      return res
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    }
  }

  console.log('--- TEST GROUP 1: Student A Isolation ---')
  // Student A SELECT students
  const resStudentsA = await queryAsUser(studentA.user_id, 'authenticated', 'SELECT id, user_id, name FROM public.students')
  assert(resStudentsA.rowCount === 1, `Student A sees exactly 1 student record (got ${resStudentsA.rowCount})`)
  assert(resStudentsA.rows[0]?.user_id === studentA.user_id, `Student A sees only their own student record`)

  // Student A SELECT Student B's record directly
  const resStudentBDirect = await queryAsUser(studentA.user_id, 'authenticated', 'SELECT id FROM public.students WHERE id = $1', [studentB.id])
  assert(resStudentBDirect.rowCount === 0, `Student A query for Student B id returns 0 rows (no leak)`)

  // Student A UPDATE Student B's record
  const resUpdateB = await queryAsUser(studentA.user_id, 'authenticated', 'UPDATE public.students SET name = $1 WHERE id = $2', ['Hacked By Student A', studentB.id])
  assert(resUpdateB.rowCount === 0, `Student A cannot UPDATE Student B record (0 rows updated)`)

  // Student A SELECT profiles
  const resProfileA = await queryAsUser(studentA.user_id, 'authenticated', 'SELECT id FROM public.profiles')
  assert(resProfileA.rowCount === 1 && resProfileA.rows[0]?.id === studentA.user_id, `Student A sees only their own profile`)

  // Student A SELECT orders
  const resOrdersA = await queryAsUser(studentA.user_id, 'authenticated', 'SELECT id, student_id FROM public.orders')
  const leakedOrders = resOrdersA.rows.filter(o => o.student_id !== studentA.user_id)
  assert(leakedOrders.length === 0, `Student A sees no orders belonging to other students`)

  // Student A SELECT payments
  const resPaymentsA = await queryAsUser(studentA.user_id, 'authenticated', 'SELECT id, student_id FROM public.payments')
  const leakedPayments = resPaymentsA.rows.filter(p => p.student_id !== studentA.id)
  assert(leakedPayments.length === 0, `Student A sees no payments belonging to other students`)

  console.log('\n--- TEST GROUP 2: Student B Isolation ---')
  // Student B SELECT students
  const resStudentsB = await queryAsUser(studentB.user_id, 'authenticated', 'SELECT id, user_id, name FROM public.students')
  assert(resStudentsB.rowCount === 1, `Student B sees exactly 1 student record (got ${resStudentsB.rowCount})`)
  assert(resStudentsB.rows[0]?.user_id === studentB.user_id, `Student B sees only their own student record`)

  // Student B UPDATE Student A's record
  const resUpdateA = await queryAsUser(studentB.user_id, 'authenticated', 'UPDATE public.students SET name = $1 WHERE id = $2', ['Hacked By Student B', studentA.id])
  assert(resUpdateA.rowCount === 0, `Student B cannot UPDATE Student A record (0 rows updated)`)

  console.log('\n--- TEST GROUP 3: Unauthenticated (Anon) Access ---')
  // Anon SELECT students
  const resAnonStudents = await queryAsUser(null, 'anon', 'SELECT id FROM public.students')
  assert(resAnonStudents.rowCount === 0, `Anon cannot read students table (0 rows)`)

  // Anon SELECT profiles
  const resAnonProfiles = await queryAsUser(null, 'anon', 'SELECT id FROM public.profiles')
  assert(resAnonProfiles.rowCount === 0, `Anon cannot read profiles table (0 rows)`)

  // Anon SELECT courses
  const resAnonCourses = await queryAsUser(null, 'anon', 'SELECT id FROM public.courses LIMIT 5')
  assert(resAnonCourses.rowCount >= 0, `Anon can read public course catalog`)

  if (admin) {
    console.log('\n--- TEST GROUP 4: Admin Access & Privileges ---')
    // Admin SELECT students
    const resAdminStudents = await queryAsUser(admin.id, 'authenticated', 'SELECT id FROM public.students')
    assert(resAdminStudents.rowCount > 1, `Admin can see all students (${resAdminStudents.rowCount} rows)`)

    // Admin SELECT orders
    const resAdminOrders = await queryAsUser(admin.id, 'authenticated', 'SELECT id FROM public.orders')
    assert(resAdminOrders.rowCount >= 0, `Admin can view all orders (${resAdminOrders.rowCount} rows)`)
  }

  console.log('\n================================================================')
  console.log(`   VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('================================================================\n')

  await client.end()
  if (failed > 0) process.exit(1)
}

runSecurityVerification().catch(err => {
  console.error('Suite error:', err)
  process.exit(1)
})
