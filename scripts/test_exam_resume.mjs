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
import { startOrResumeExamAttempt, saveDraftAnswers } from '../lib/exams.ts'

async function runResumeTest() {
  console.log('================================================================')
  console.log('       TEST SUITE: EXAM DISCONNECT & RESUME VERIFICATION        ')
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

  // 1. Setup: get or create test student & exam
  let student = await rawPrisma.students.findFirst({ where: { user_id: { not: null } } })
  if (!student) {
    // Create test user and student
    const testUser = await rawPrisma.user.create({
      data: {
        email: `test_resume_student_${Date.now()}@example.com`,
        name: 'طالب فحص الاستئناف التجريبي',
        role: 'student',
      }
    })
    student = await rawPrisma.students.create({
      data: {
        code: `STU-RESUME-${Date.now()}`,
        name: 'طالب فحص الاستئناف التجريبي',
        user_id: testUser.id,
      }
    })
  }

  const examCode = `RESUME-EXAM-${Date.now()}`
  const exam = await rawPrisma.exams.create({
    data: {
      code: examCode,
      title: 'امتحان اختبار استئناف الجلسة وحفظ المسودة',
      course: 'علوم الحاسب',
      duration: 10, // 10 minutes
      questions: 2,
      pass_mark: 50,
      status: 'منشور',
      exam_questions: {
        create: [
          {
            question_text: 'ما هو حاصل جمع 10 + 20؟',
            question_type: 'mcq',
            content_mode: 'text',
            points: 5,
            options: ['20', '30', '40'],
            correct_answer: '30',
            order_index: 0,
          },
          {
            question_text: 'اشرح بإيجاز مفهوم الاستئناف عند انقطاع الإنترنت.',
            question_type: 'essay',
            content_mode: 'text',
            points: 5,
            order_index: 1,
          }
        ]
      }
    },
    include: { exam_questions: true }
  })

  console.log(`Testing with Student: ${student.name} (ID: ${student.id})`)
  console.log(`Testing with Exam:    ${exam.title} (Code: ${exam.code}, Duration: ${exam.duration}m)`)

  const attemptIdsToClean = []

  try {
    // 2. Start initial attempt
    console.log('\n--- Step 1: Start New Attempt ---')
    const startRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
      return await startOrResumeExamAttempt({ studentId: student.id, examIdOrCode: exam.id })
    })

    assert(startRes.success === true, 'Attempt started successfully')
    const attempt = startRes.attempt || startRes.data
    assert(attempt.status === 'in_progress', 'Attempt status is in_progress')
    assert(attempt.remainingSeconds > 0, `Remaining seconds initialized (${attempt.remainingSeconds}s)`)
    const attemptId = attempt.id
    attemptIdsToClean.push(attemptId)

    // 3. Save draft answers
    console.log('\n--- Step 2: Save Draft Answers ---')
    const q1 = exam.exam_questions.find(q => q.order_index === 0)
    const q2 = exam.exam_questions.find(q => q.order_index === 1)
    const draftPayload = {
      [q1.id]: { selectedOption: '30' },
      [q2.id]: { answerText: 'مسودة مقالية محفوظة تلقائياً في السيرفر' }
    }

    const saveRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
      return await saveDraftAnswers({ attemptId, studentId: student.id, answers: draftPayload })
    })
    assert(saveRes.success === true, 'Draft answers saved successfully to server')

    // 4. Simulate disconnect & wait 2 seconds
    console.log('\n--- Step 3: Simulate Disconnect & Tab Refresh (Waiting 2s) ---')
    await new Promise((r) => setTimeout(r, 2000))

    // 5. Resume attempt
    console.log('\n--- Step 4: Resume Attempt on Reconnect ---')
    const resumeRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
      return await startOrResumeExamAttempt({ studentId: student.id, examIdOrCode: exam.id })
    })

    const resumed = resumeRes.attempt || resumeRes.data
    assert(resumeRes.success === true, 'Resume call succeeded')
    assert(resumed.id === attemptId, 'Resumed attempt has EXACT same attemptId (no duplicate created)')
    assert(resumed.status === 'in_progress', 'Resumed attempt remains in_progress')
    assert(resumed.draftAnswers[q1.id]?.selectedOption === '30', 'Draft selectedOption for Q1 recovered accurately')
    assert(resumed.draftAnswers[q2.id]?.answerText === 'مسودة مقالية محفوظة تلقائياً في السيرفر', 'Draft essay text for Q2 recovered accurately')
    assert(resumed.remainingSeconds <= attempt.remainingSeconds - 2, `Server remaining seconds naturally decremented (${resumed.remainingSeconds}s <= ${attempt.remainingSeconds - 2}s)`)
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
  console.log(`   RESUME TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('================================================================\n')

  if (failed > 0) process.exit(1)
}

runResumeTest().catch((err) => {
  console.error('Fatal error in test_exam_resume:', err)
  process.exit(1)
})
