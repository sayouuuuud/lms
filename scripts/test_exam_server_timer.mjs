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
import { startOrResumeExamAttempt, saveDraftAnswers, submitExamAttempt, getExamAttemptStatus } from '../lib/exams.ts'

async function runServerTimerTest() {
  console.log('================================================================')
  console.log('     TEST SUITE: SERVER-SIDE TIMER & EXPIRY ENFORCEMENT         ')
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
        email: `test_timer_student_${Date.now()}@example.com`,
        name: 'طالب فحص مؤقت السيرفر',
        role: 'student',
      }
    })
    student = await rawPrisma.students.create({
      data: {
        code: `STU-TIMER-${Date.now()}`,
        name: 'طالب فحص مؤقت السيرفر',
        user_id: testUser.id,
      }
    })
  }

  const examCode = `TIMER-EXAM-${Date.now()}`
  const exam = await rawPrisma.exams.create({
    data: {
      code: examCode,
      title: 'امتحان اختبار حماية مؤقت السيرفر ومنع التلاعب بالوقت',
      course: 'أمن المعلومات',
      duration: 15,
      questions: 1,
      pass_mark: 50,
      status: 'منشور',
      exam_questions: {
        create: [
          {
            question_text: 'ما هو البروتوكول المستخدم لمزامنة التوقيت عبر الشبكة؟',
            question_type: 'mcq',
            content_mode: 'text',
            points: 10,
            options: ['NTP', 'HTTP', 'FTP'],
            correct_answer: 'NTP',
            order_index: 0,
          }
        ]
      }
    },
    include: { exam_questions: true }
  })

  console.log(`Testing with Student: ${student.name} (ID: ${student.id})`)
  console.log(`Testing with Exam:    ${exam.title} (Code: ${exam.code})`)

  const attemptIdsToClean = []

  try {
    // 1. Start attempt
    console.log('\n--- Step 1: Start Active Attempt ---')
    const startRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
      return await startOrResumeExamAttempt({ studentId: student.id, examIdOrCode: exam.id })
    })

    const attempt = startRes.attempt || startRes.data
    assert(startRes.success === true, 'Attempt started successfully')
    const attemptId = attempt.id
    attemptIdsToClean.push(attemptId)

    // 2. Backdate expires_at in DB to simulate expired attempt
    console.log('\n--- Step 2: Simulate Expiration on Server by Backdating expires_at ---')
    await rawPrisma.exam_attempts.update({
      where: { id: attemptId },
      data: {
        started_at: new Date(Date.now() - 3600000), // 1 hour ago
        expires_at: new Date(Date.now() - 120000),  // expired 2 minutes ago
      }
    })

    // 3. Check status calculation
    console.log('\n--- Step 3: Verify Authoritative Status & remainingSeconds Calculation ---')
    const statusRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
      return await getExamAttemptStatus(attemptId, student.id)
    })
    const statusData = statusRes.data || statusRes
    assert(statusData.remainingSeconds === 0, `Server calculates remainingSeconds as 0 for past deadline (got ${statusData.remainingSeconds})`)

    // 4. Attempt to save draft after expiration
    console.log('\n--- Step 4: Test Late Draft Save Rejection ---')
    const q1 = exam.exam_questions[0]
    const draftRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
      return await saveDraftAnswers({
        attemptId,
        studentId: student.id,
        answers: { [q1.id]: { selectedOption: 'NTP' } }
      })
    })
    assert(draftRes.success === false, 'Server rejected draft save on expired attempt')
    assert(draftRes.expired === true || (draftRes.error && (draftRes.error.includes('وقت') || draftRes.error.includes('مدة'))), 'Rejection reason explicitly indicates time expiration')

    // 5. Attempt late submission beyond grace period
    console.log('\n--- Step 5: Test Late Submit Rejection ---')
    const submitRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
      return await submitExamAttempt({
        attemptId,
        studentId: student.id,
        answers: [{ questionId: q1.id, selectedOption: 'NTP' }]
      })
    })
    assert(submitRes.success === false, 'Server rejected submission after deadline exceeded')
    assert(submitRes.code === 'SUBMISSION_DEADLINE_EXCEEDED' || submitRes.code === 'ATTEMPT_EXPIRED' || (submitRes.error && submitRes.error.includes('المهلة')), 'Rejection error indicates deadline exceeded')

    // 6. Attempt resume of expired attempt
    console.log('\n--- Step 6: Verify Resume on Expired Attempt returns ATTEMPT_EXPIRED ---')
    const resumeExpiredRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
      return await startOrResumeExamAttempt({ studentId: student.id, examIdOrCode: exam.id })
    })
    assert(resumeExpiredRes.success === false, 'Resume call fails on expired attempt')
    assert(resumeExpiredRes.code === 'ATTEMPT_EXPIRED', 'Code is ATTEMPT_EXPIRED')
  } finally {
    // Cleanup
    console.log('\n--- Cleaning up test artifacts ---')
    for (const aId of attemptIdsToClean) {
      await rawPrisma.exam_submissions.deleteMany({ where: { attempt_id: aId } })
      await rawPrisma.exam_attempts.deleteMany({ where: { id: aId } })
    }
    await rawPrisma.exam_questions.deleteMany({ where: { exam_id: exam.id } })
    await rawPrisma.exams.delete({ where: { id: exam.id } })
    await prisma.$disconnect()
  }

  console.log('\n================================================================')
  console.log(`   TIMER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('================================================================\n')

  if (failed > 0) process.exit(1)
}

runServerTimerTest().catch((err) => {
  console.error('Fatal error in test_exam_server_timer:', err)
  process.exit(1)
})
