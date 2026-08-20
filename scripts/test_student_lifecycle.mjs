import fs from 'fs'
import crypto from 'node:crypto'
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
import { prisma, rawPrisma, runWithUserContext, userContextStorage } from '../lib/prisma.ts'

const SECRET = process.env.VIDEO_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'fallback-secret'
const TOKEN_TTL_SECONDS = 3 * 60 * 60

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlToBuffer(input) {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}
function sign(data) {
  return b64url(crypto.createHmac('sha256', SECRET).update(data).digest())
}
function signVideoToken(payload) {
  const body = b64url(JSON.stringify(payload))
  return `${body}.${sign(body)}`
}
function verifyVideoToken(token) {
  if (!token || !SECRET) return null
  const dot = token.indexOf('.')
  if (dot <= 0) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = sign(body)
  if (sig !== expected) return null
  try {
    return JSON.parse(b64urlToBuffer(body).toString('utf8'))
  } catch {
    return null
  }
}

async function createPlaybackTokenForTest(userId, lessonId) {
  const sid = crypto.randomBytes(16).toString('hex')
  const now = new Date()
  await prisma.$executeRaw`
    INSERT INTO lecture_playback_sessions (user_id, lesson_id, sid, updated_at)
    VALUES (${userId}::uuid, ${lessonId}::uuid, ${sid}, ${now})
    ON CONFLICT (user_id, lesson_id)
    DO UPDATE SET sid = EXCLUDED.sid, updated_at = EXCLUDED.updated_at
  `
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  return signVideoToken({ lessonId, userId, sid, exp })
}

async function isLatestSessionForTest(userId, lessonId, sid) {
  const data = await prisma.$queryRaw`
    SELECT sid FROM lecture_playback_sessions
    WHERE user_id = ${userId}::uuid AND lesson_id = ${lessonId}::uuid
  `
  return data.length > 0 && data[0].sid === sid
}

async function runLifecycleTests() {
  console.log('================================================================')
  console.log('       STUDENT LIFECYCLE, EXAM & VIDEO STREAMING RLS SUITE      ')
  console.log('================================================================\n')

  let passed = 0
  let failed = 0

  function assert(cond, msg) {
    if (cond) {
      console.log(`  [PASS] ${msg}`)
      passed++
    } else {
      console.error(`  [FAIL] ${msg}`)
      failed++
    }
  }

  // 1. Get test students
  const students = await rawPrisma.students.findMany({
    where: { user_id: { not: null } },
    take: 2,
  })
  const studentA = students[0]
  const studentB = students[1]

  console.log(`Student A: ${studentA.name} (${studentA.user_id})`)
  console.log(`Student B: ${studentB.name} (${studentB.user_id})`)

  // STEP 1: Video playback token generation & validation under RLS
  console.log('\n--- STEP 1: Video Playback Token Lifecycle & RLS ---')
  const lesson = await rawPrisma.lessons.findFirst({ select: { id: true, lecture_id: true } })
  if (lesson) {
    const token = await runWithUserContext({ id: studentA.user_id, role: 'student' }, async () => {
      return await createPlaybackTokenForTest(studentA.user_id, lesson.id)
    })
    assert(token && token.includes('.'), 'Playback token created under Student A RLS context')

    const verified = verifyVideoToken(token)
    assert(verified && verified.userId === studentA.user_id && verified.lessonId === lesson.id, 'Playback token payload verified successfully')

    const isValidSession = await runWithUserContext({ id: studentA.user_id, role: 'student' }, async () => {
      return await isLatestSessionForTest(studentA.user_id, lesson.id, verified.sid)
    })
    assert(isValidSession, 'Session is recognized as latest active session under RLS')

    // Student B querying Student A's playback session directly via RLS gets 0 rows
    const crossSession = await runWithUserContext({ id: studentB.user_id, role: 'student' }, async () => {
      return await prisma.$queryRaw`
        SELECT sid FROM lecture_playback_sessions
        WHERE user_id = ${studentA.user_id}::uuid AND lesson_id = ${lesson.id}::uuid
      `
    })
    assert(crossSession.length === 0, 'Student B cannot query Student A playback session (RLS isolated)')
  }

  // STEP 2: Multi-step Exam / Assignment Submission under RLS
  console.log('\n--- STEP 2: Exam & Submission Lifecycle under Student Context ---')
  const exam = await rawPrisma.exams.findFirst({ select: { id: true, title: true } })
  if (exam) {
    // Delete any existing submission for clean test
    await rawPrisma.exam_submissions.deleteMany({
      where: { exam_id: exam.id, student_id: studentA.id }
    })

    // Student A submits exam under RLS
    const subResult = await runWithUserContext({ id: studentA.user_id, role: 'student' }, async () => {
      return await prisma.exam_submissions.create({
        data: {
          exam_id: exam.id,
          student_id: studentA.id,
          score: 85,
          total: 100,
          auto_score: 85,
          manual_score: 0,
          grading_status: 'graded',
          status: 'ناجح',
        },
        select: { id: true, score: true, status: true }
      })
    })
    assert(subResult && subResult.id, 'Student A successfully created exam submission under RLS')

    // Student A can read their own submission
    const studentAView = await runWithUserContext({ id: studentA.user_id, role: 'student' }, async () => {
      return await prisma.exam_submissions.findMany({ where: { exam_id: exam.id } })
    })
    assert(studentAView.length === 1 && studentAView[0].id === subResult.id, 'Student A can read their own exam submission')

    // Student B CANNOT see Student A's submission
    const studentBView = await runWithUserContext({ id: studentB.user_id, role: 'student' }, async () => {
      return await prisma.exam_submissions.findMany({ where: { exam_id: exam.id } })
    })
    const leak = studentBView.some(s => s.student_id === studentA.id)
    assert(!leak, 'Student B CANNOT see Student A exam submission (RLS filtered 100%)')

    // Student B CANNOT update Student A's submission
    const studentBUpdate = await runWithUserContext({ id: studentB.user_id, role: 'student' }, async () => {
      return await prisma.exam_submissions.updateMany({
        where: { id: subResult.id },
        data: { score: 0 }
      })
    })
    assert(studentBUpdate.count === 0, 'Student B update on Student A submission affected 0 rows (BLOCKED)')

    // Clean up test submission
    await rawPrisma.exam_submissions.deleteMany({ where: { id: subResult.id } })
  }

  // STEP 3: Admin & Assistant Role Verification
  console.log('\n--- STEP 3: Admin Visibility & Integrity ---')
  const admin = await rawPrisma.profiles.findFirst({ where: { role: 'admin' } })
  if (admin) {
    const adminStudents = await runWithUserContext({ id: admin.id, role: 'admin' }, async () => {
      return await prisma.students.count()
    })
    assert(adminStudents > 1, `Admin can view all students under RLS (count: ${adminStudents})`)
  }

  console.log(`\n================================================================`)
  console.log(`   LIFECYCLE RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log(`================================================================\n`)

  process.exit(failed > 0 ? 1 : 0)
}

runLifecycleTests().catch((err) => {
  console.error('Lifecycle test crashed:', err)
  process.exit(1)
})
