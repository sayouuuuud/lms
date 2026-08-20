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

import { prisma, rawPrisma, runWithUserContext } from '../lib/prisma.ts'
import { startOrResumeExamAttempt, submitExamAttempt } from '../lib/exams.ts'

async function runDoubleSubmitTest() {
  console.log('================================================================')
  console.log('    TEST SUITE: CONCURRENT DOUBLE-SUBMIT & IDEMPOTENCY LOCK     ')
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

  let student = await rawPrisma.students.findFirst({ where: { user_id: { not: null } } })
  if (!student) {
    const testUser = await rawPrisma.user.create({
      data: {
        email: `test_double_submit_${Date.now()}@example.com`,
        name: 'طالب فحص التسليم المتزامن',
        role: 'student',
      }
    })
    student = await rawPrisma.students.create({
      data: {
        code: `STU-DS-${Date.now()}`,
        name: 'طالب فحص التسليم المتزامن',
        user_id: testUser.id,
      }
    })
  }

  const examCode = `DS-EXAM-${Date.now()}`
  const exam = await rawPrisma.exams.create({
    data: {
      code: examCode,
      title: 'امتحان اختبار مقاومة النقر المزدوج والتسليم المتزامن',
      course: 'هندسة النظم الموزعة',
      duration: 20,
      questions: 2,
      pass_mark: 50,
      status: 'منشور',
      exam_questions: {
        create: [
          {
            question_text: 'ما هو الهدف الرئيسي من استخدام الأقفال الذرية (Atomic Locks)؟',
            question_type: 'mcq',
            content_mode: 'text',
            points: 10,
            options: ['منع حالات السباق Race Conditions', 'زيادة سرعة المعالج', 'تقليل استهلاك الذاكرة'],
            correct_answer: 'منع حالات السباق Race Conditions',
            order_index: 0,
          },
          {
            question_text: 'ماذا تعني خاصية Idempotency في واجهات البرمجة؟',
            question_type: 'mcq',
            content_mode: 'text',
            points: 10,
            options: ['تكرار الطلب يعطي نفس النتيجة دون آثار جانبية إضافية', 'تسريع استجابة الخادم', 'تشفير البيانات'],
            correct_answer: 'تكرار الطلب يعطي نفس النتيجة دون آثار جانبية إضافية',
            order_index: 1,
          }
        ]
      }
    },
    include: { exam_questions: true }
  })

  console.log(`Testing with Student: ${student.name} (ID: ${student.id})`)
  console.log(`Testing with Exam:    ${exam.title} (Code: ${exam.code})`)

  let attemptId = null

  try {
    // 1. Start active attempt
    console.log('\n--- Step 1: Start Active Attempt ---')
    const startRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
      return await startOrResumeExamAttempt({ studentId: student.id, examIdOrCode: exam.id })
    })

    const attempt = startRes.attempt || startRes.data
    assert(startRes.success === true, 'Attempt started successfully')
    attemptId = attempt.id

    // 2. Prepare payload
    const idempotencyKey = `idempotent_submit_${attemptId}_${Date.now()}`
    const answersPayload = exam.exam_questions.map((q) => ({
      questionId: q.id,
      selectedOption: q.correct_answer || (Array.isArray(q.options) ? q.options[0] : ''),
    }))

    // 3. Fire 10 concurrent submit requests via Promise.all
    console.log('\n--- Step 2: Firing 10 Concurrent Submit Requests (Promise.all) ---')
    const concurrentPromises = Array.from({ length: 10 }, (_, i) => {
      return runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
        try {
          return await submitExamAttempt({
            attemptId,
            studentId: student.id,
            idempotencyKey,
            answers: answersPayload,
          })
        } catch (err) {
          console.error(`Error in submit request ${i}:`, err)
          return { success: false, error: String(err) }
        }
      })
    })

    const results = await Promise.all(concurrentPromises)
    console.log('Results summaries:', results.map(r => ({ success: r.success, score: r.score, alreadySubmitted: r.alreadySubmitted, error: r.error })))

    // 4. Verify invariants
    console.log('\n--- Step 3: Verifying Response Consistency & Concurrency Safety ---')
    const allSuccess = results.every((r) => r.success === true)
    assert(allSuccess, 'All 10 concurrent requests returned success === true (zero P2002 or race condition crashes)')

    const expectedScore = 20
    const allScoresMatch = results.every((r) => r.score === expectedScore)
    assert(allScoresMatch, `All 10 responses return identical score (${expectedScore}/20)`)

    const exactlyOneWon = results.filter((r) => r.alreadySubmitted === false).length === 1
    const othersHandledIdempotently = results.filter((r) => r.alreadySubmitted === true).length === 9
    assert(exactlyOneWon, 'Exactly 1 request won the atomic transition lock and performed grading')
    assert(othersHandledIdempotently, 'Remaining 9 requests received idempotent result without re-grading')

    // 5. Verify database records
    console.log('\n--- Step 4: Verifying Database Table Invariants ---')
    const dbSubmissions = await rawPrisma.exam_submissions.findMany({
      where: { exam_id: exam.id, student_id: student.id }
    })
    assert(dbSubmissions.length === 1, `Exactly 1 submission row in exam_submissions (got ${dbSubmissions.length})`)

    const dbAnswers = await rawPrisma.exam_answers.findMany({
      where: { submission_id: dbSubmissions[0].id }
    })
    assert(dbAnswers.length === 2, `Exactly 2 answers rows in exam_answers (matching questions count, got ${dbAnswers.length})`)

    const dbAttempt = await rawPrisma.exam_attempts.findUnique({
      where: { id: attemptId }
    })
    assert(dbAttempt.status === 'submitted', 'Attempt status updated to submitted in database')
  } finally {
    // Cleanup
    console.log('\n--- Cleaning up test artifacts ---')
    if (attemptId) {
      await rawPrisma.exam_submissions.deleteMany({ where: { attempt_id: attemptId } })
      await rawPrisma.exam_attempts.deleteMany({ where: { id: attemptId } })
    }
    await rawPrisma.exam_questions.deleteMany({ where: { exam_id: exam.id } })
    await rawPrisma.exams.delete({ where: { id: exam.id } })
    await prisma.$disconnect()
  }

  console.log('\n================================================================')
  console.log(`   DOUBLE-SUBMIT RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('================================================================\n')

  if (failed > 0) process.exit(1)
}

runDoubleSubmitTest().catch((err) => {
  console.error('Fatal error in test_exam_double_submit:', err)
  process.exit(1)
})
