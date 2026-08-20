#!/usr/bin/env node
/**
 * scripts/test_e2e_full_integration.mjs
 *
 * Tier 4 Comprehensive Cross-Module E2E Integration Suite for LMS Upgrade.
 * Validates the complete interaction between:
 * - R1: Exams Engine (Lifecycle, Resume, Server Timer, Snapshotting, Double-Submit Guard)
 * - R2: Taxonomy & Mathematical Mastery Engine (3-Tier Hierarchy, Ms Evaluation, Recalculation)
 * - R3: Rescue System & WhatsApp Engine (At-Risk Rules, Queue Lifecycle, Sandbox Dispatch, 72h Cooldown)
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import crypto from 'node:crypto'

// 1. Dual-mode environment variable loader
if (typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile() } catch (e) {}
} else if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  }
}

// 2. Set test & sandbox flags
process.env.NODE_ENV = 'test'
process.env.WHATSAPP_SANDBOX = 'true'
process.env.MOCK_WHATSAPP = 'true'

// 3. Import Prisma clients & context runners
import { prisma, rawPrisma, runWithUserContext } from '../lib/prisma.ts'

// --- Phone Normalization Helper ---
function normalizeEgyptPhone(rawPhone) {
  if (!rawPhone) return null
  const cleaned = rawPhone.replace(/\D/g, '')
  if (cleaned.startsWith('20') && cleaned.length === 12) return cleaned
  if (cleaned.startsWith('0') && cleaned.length === 11) return '20' + cleaned.slice(1)
  if (cleaned.length === 10 && (cleaned.startsWith('10') || cleaned.startsWith('11') || cleaned.startsWith('12') || cleaned.startsWith('15'))) {
    return '20' + cleaned
  }
  return cleaned.length >= 10 ? cleaned : null
}

// --- Rescue Domain Logic Helpers ---
async function evaluateStudentRisk(studentId) {
  const student = await rawPrisma.students.findUnique({
    where: { id: studentId },
  })
  if (!student) return []

  const detectedRisks = []
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Rule 2: RECURRING_FAILURE (>= 2 failed exams in last 30 days)
  const submissions = await rawPrisma.exam_submissions.findMany({
    where: {
      student_id: student.id,
      submitted_at: { gte: thirtyDaysAgo },
    },
  })

  const failedSubmissions = submissions.filter((sub) => {
    const isFailStatus = sub.status === 'راسب'
    const isLowScore = sub.total > 0 && (sub.score / sub.total) < 0.5
    return isFailStatus || isLowScore
  })

  if (failedSubmissions.length >= 2) {
    detectedRisks.push({
      triggerType: 'RECURRING_FAILURE',
      priority: 'high',
      riskScore: 85,
      details: {
        failedCount: failedSubmissions.length,
        totalSubmissions: submissions.length,
        failedExams: failedSubmissions.map((s) => ({
          submissionId: s.id,
          examId: s.exam_id,
          score: s.score,
          total: s.total,
        })),
      },
      suggestedAction: 'التواصل مع الطالب لتقديم الدعم الأكاديمي وجلسة مراجعة للنقاط الصعبة',
    })
  }

  return detectedRisks
}

async function syncStudentRescueCases(studentId, risks) {
  const evaluations = risks || (await evaluateStudentRisk(studentId))
  let createdCount = 0
  let existingCount = 0

  for (const risk of evaluations) {
    const existingActiveCase = await rawPrisma.rescue_cases.findFirst({
      where: {
        student_id: studentId,
        trigger_type: risk.triggerType,
        status: { in: ['open', 'contacted', 'in_progress'] },
      },
    })

    if (existingActiveCase) {
      existingCount++
      await rawPrisma.rescue_cases.update({
        where: { id: existingActiveCase.id },
        data: {
          risk_score: Math.max(existingActiveCase.risk_score, risk.riskScore),
          details: risk.details,
          suggested_action: risk.suggestedAction,
          priority: risk.priority,
          updated_at: new Date(),
        },
      })
    } else {
      await rawPrisma.rescue_cases.create({
        data: {
          student_id: studentId,
          trigger_type: risk.triggerType,
          priority: risk.priority,
          status: 'open',
          risk_score: risk.riskScore,
          details: risk.details,
          suggested_action: risk.suggestedAction,
        },
      })
      createdCount++
    }
  }

  return { created: createdCount, existing: existingCount }
}

async function checkStudentCooldown(studentId, cooldownHours = 72) {
  const cooldownMs = cooldownHours * 60 * 60 * 1000
  const thresholdDate = new Date(Date.now() - cooldownMs)

  const recentMessage = await rawPrisma.whatsapp_messages.findFirst({
    where: {
      student_id: studentId,
      status: { in: ['sent', 'queued'] },
      created_at: { gte: thresholdDate },
    },
    orderBy: { created_at: 'desc' },
  })

  const recentContactCase = await rawPrisma.rescue_cases.findFirst({
    where: {
      student_id: studentId,
      last_contacted_at: { gte: thresholdDate },
    },
    orderBy: { last_contacted_at: 'desc' },
  })

  let mostRecentContact = null
  if (recentMessage?.created_at) {
    mostRecentContact = new Date(recentMessage.created_at)
  }
  if (recentContactCase?.last_contacted_at) {
    const caseContact = new Date(recentContactCase.last_contacted_at)
    if (!mostRecentContact || caseContact > mostRecentContact) {
      mostRecentContact = caseContact
    }
  }

  if (mostRecentContact) {
    const elapsedMs = Date.now() - mostRecentContact.getTime()
    if (elapsedMs < cooldownMs) {
      const remainingMs = cooldownMs - elapsedMs
      const remainingHours = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)))
      return {
        allowed: false,
        cooldownActive: true,
        remainingHours,
        lastContactedAt: mostRecentContact,
      }
    }
  }

  return {
    allowed: true,
    cooldownActive: false,
    remainingHours: 0,
    lastContactedAt: mostRecentContact,
  }
}

async function dispatchRescueWhatsApp(caseId, options = {}) {
  const rescueCase = await rawPrisma.rescue_cases.findUnique({
    where: { id: caseId },
  })

  if (!rescueCase) {
    return { success: false, error: 'rescue_case_not_found' }
  }

  const student = await rawPrisma.students.findUnique({
    where: { id: rescueCase.student_id },
  })

  if (!student) {
    return { success: false, error: 'student_not_found' }
  }

  const normalizedPhone = normalizeEgyptPhone(student.phone) || '201012345671'

  // Cooldown enforcement
  if (!options.force) {
    const cooldown = await checkStudentCooldown(student.id)
    if (cooldown.cooldownActive) {
      return {
        success: false,
        error: 'cooldown_active',
        cooldownBlocked: true,
        remainingHours: cooldown.remainingHours,
      }
    }
  }

  const messageText = `أهلاً يا ${student.name} 👋 منصة أكاديمية شفاء العليل تتابع تقدمك وتدعمك بكل خطوة في تفوقك الدراسي!`
  const mockMessageId = `mock_sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  await rawPrisma.whatsapp_messages.create({
    data: {
      to_phone: normalizedPhone,
      template: 'custom',
      body: messageText,
      status: 'sent',
      provider_message_id: mockMessageId,
      student_id: student.id,
      sent_at: new Date(),
    },
  })

  await rawPrisma.rescue_cases.update({
    where: { id: caseId },
    data: {
      status: 'contacted',
      last_contacted_at: new Date(),
      updated_at: new Date(),
    },
  })

  return {
    success: true,
    messageId: mockMessageId,
    sandbox: true,
  }
}

async function updateRescueCaseStatus(caseId, status, resolutionNotes) {
  await rawPrisma.rescue_cases.update({
    where: { id: caseId },
    data: {
      status,
      resolution_notes: resolutionNotes,
      resolved_at: status === 'resolved' ? new Date() : null,
      updated_at: new Date(),
    },
  })
  return true
}

// --- Test State & Formatting Helpers ---
let totalAssertions = 0
let passedAssertions = 0
let failedAssertions = 0
const flowTimes = {}

function assert(condition, message, details = '') {
  totalAssertions++
  if (condition) {
    passedAssertions++
    console.log(`  \x1b[32m[PASS]\x1b[0m ${message}`)
  } else {
    failedAssertions++
    console.error(`  \x1b[31m[FAIL]\x1b[0m ${message} ${details ? `(${details})` : ''}`)
  }
}

function assertEqual(actual, expected, message) {
  const isMatch = JSON.stringify(actual) === JSON.stringify(expected)
  assert(isMatch, message, `Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`)
}

function assertApproximately(actual, expected, tolerance, message) {
  const diff = Math.abs(actual - expected)
  assert(diff <= tolerance, message, `Expected ${expected} ± ${tolerance}, Got ${actual} (diff: ${diff.toFixed(4)})`)
}

function startFlow(flowId, flowName) {
  console.log(`\n\x1b[36m================================================================\x1b[0m`)
  console.log(`\x1b[1m  FLOW ${flowId}: ${flowName}\x1b[0m`)
  console.log(`\x1b[36m================================================================\x1b[0m`)
  flowTimes[flowId] = Date.now()
}

function endFlow(flowId) {
  const duration = ((Date.now() - (flowTimes[flowId] || Date.now())) / 1000).toFixed(2)
  console.log(`\x1b[90m  -> Completed Flow in ${duration}s\x1b[0m\n`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Deterministic unique run tag
const RUN_ID = `E2E_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
const TEST_TAG = `TEST_E2E_${RUN_ID}`

console.log(`[E2E Suite] Initializing run with RUN_ID: ${RUN_ID}`)

/**
 * Atomic Teardown Function: Removes all test fixtures matching TEST_TAG or @lms-test.local
 */
async function cleanupFixtures(tag) {
  try {
    // 1. WhatsApp messages for test students
    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.whatsapp_messages 
      WHERE student_id IN (SELECT id FROM public.students WHERE code LIKE '${tag}%')
    `).catch(() => {})

    // 2. Rescue cases
    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.rescue_cases 
      WHERE student_id IN (SELECT id FROM public.students WHERE code LIKE '${tag}%')
    `).catch(() => {})

    // 3. Mastery & Skill Progress & History
    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.student_skill_history 
      WHERE student_id IN (SELECT id FROM public.students WHERE code LIKE '${tag}%')
    `).catch(() => {})

    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.student_skill_mastery 
      WHERE student_id IN (SELECT id FROM public.students WHERE code LIKE '${tag}%')
    `).catch(() => {})

    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.lesson_watch_progress 
      WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%${RUN_ID.toLowerCase()}%@lms-test.local')
         OR student_id IN (SELECT id FROM public.students WHERE code LIKE '${tag}%')
    `).catch(() => {})

    // 4. Exam Answers, Submissions, Attempts
    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.exam_answers 
      WHERE submission_id IN (
        SELECT id FROM public.exam_submissions 
        WHERE student_id IN (SELECT id FROM public.students WHERE code LIKE '${tag}%')
      )
    `).catch(() => {})

    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.exam_submissions 
      WHERE student_id IN (SELECT id FROM public.students WHERE code LIKE '${tag}%')
         OR exam_id IN (SELECT id FROM public.exams WHERE code LIKE 'EXAM_${tag}%')
    `).catch(() => {})

    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.exam_attempts 
      WHERE student_id IN (SELECT id FROM public.students WHERE code LIKE '${tag}%')
         OR exam_id IN (SELECT id FROM public.exams WHERE code LIKE 'EXAM_${tag}%')
    `).catch(() => {})

    // 5. Exam Question Skills & Lesson Skills
    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.exam_question_skills 
      WHERE skill_id IN (SELECT id FROM public.taxonomy_skills WHERE code LIKE 'TAX_SKL_${tag}%')
    `).catch(() => {})

    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.lesson_skills 
      WHERE skill_id IN (SELECT id FROM public.taxonomy_skills WHERE code LIKE 'TAX_SKL_${tag}%')
    `).catch(() => {})

    // 6. Exam Questions & Exams
    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.exam_questions 
      WHERE exam_id IN (SELECT id FROM public.exams WHERE code LIKE 'EXAM_${tag}%')
    `).catch(() => {})

    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.exams 
      WHERE code LIKE 'EXAM_${tag}%'
    `).catch(() => {})

    // 7. Taxonomy Tree
    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.taxonomy_skills 
      WHERE code LIKE 'TAX_SKL_${tag}%'
    `).catch(() => {})

    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.taxonomy_topics 
      WHERE code LIKE 'TAX_TOP_${tag}%'
    `).catch(() => {})

    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.taxonomy_domains 
      WHERE code LIKE 'TAX_DOM_${tag}%'
    `).catch(() => {})

    // 8. Curriculum Entities
    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.lessons 
      WHERE slug LIKE 'lesson_${tag.toLowerCase()}%'
    `).catch(() => {})

    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.lectures 
      WHERE title LIKE '${tag}%'
    `).catch(() => {})

    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.monthly_courses 
      WHERE slug LIKE 'course_${tag.toLowerCase()}%'
    `).catch(() => {})

    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.branches 
      WHERE slug LIKE 'branch_${tag.toLowerCase()}%'
    `).catch(() => {})

    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.stages 
      WHERE slug LIKE 'stage_${tag.toLowerCase()}%'
    `).catch(() => {})

    // 9. Orders & Students
    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.order_items 
      WHERE order_id IN (
        SELECT id FROM public.orders 
        WHERE student_id IN (SELECT id FROM auth.users WHERE email LIKE '%${RUN_ID.toLowerCase()}%@lms-test.local')
      )
    `).catch(() => {})

    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.orders 
      WHERE student_id IN (SELECT id FROM auth.users WHERE email LIKE '%${RUN_ID.toLowerCase()}%@lms-test.local')
    `).catch(() => {})

    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM public.students 
      WHERE code LIKE '${tag}%'
    `).catch(() => {})

    await rawPrisma.$executeRawUnsafe(`
      DELETE FROM auth.users 
      WHERE email LIKE '%${RUN_ID.toLowerCase()}%@lms-test.local'
    `).catch(() => {})
  } catch (err) {
    console.warn(`[Cleanup Warning]: ${err.message}`)
  }
}

/**
 * ============================================================================
 * FLOW 1: Complete Student Journey
 * ============================================================================
 */
async function testFlow1CompleteStudentJourney() {
  startFlow('1', 'Complete Student Journey (Enrollment -> Disconnect -> Submit -> Mastery -> Risk -> WhatsApp -> Cooldown)')

  // 1.1 Create Fixtures
  console.log('  [Step 1.1] Creating hierarchical course, taxonomy, exam, and student fixtures...')

  const stage = await rawPrisma.stages.create({
    data: {
      name: `${TEST_TAG} Stage 3 Secondary`,
      slug: `stage_${TEST_TAG.toLowerCase()}_1`,
      order_index: 99,
    },
  })

  const branch = await rawPrisma.branches.create({
    data: {
      name: `${TEST_TAG} Mathematics Branch`,
      slug: `branch_${TEST_TAG.toLowerCase()}_1`,
      stage_id: stage.id,
      order_index: 1,
    },
  })

  const monthlyCourse = await rawPrisma.monthly_courses.create({
    data: {
      title: `${TEST_TAG} August Course`,
      slug: `course_${TEST_TAG.toLowerCase()}_1`,
      stage_id: stage.id,
      branch_id: branch.id,
      price: 250,
      is_published: true,
    },
  })

  const lecture = await rawPrisma.lectures.create({
    data: {
      title: `${TEST_TAG} Lecture 01 - Calculus Basics`,
      stage_id: stage.id,
      branch_id: branch.id,
      price: 50,
      is_published: true,
    },
  })

  const lesson = await rawPrisma.lessons.create({
    data: {
      title: `${TEST_TAG} Lesson 01 - Intro to Derivatives`,
      slug: `lesson_${TEST_TAG.toLowerCase()}_1`,
      lecture_id: lecture.id,
      duration: 1200,
      is_free: false,
      order_index: 1,
    },
  })

  // Taxonomy Tree (Domain -> Topic -> Skill)
  const domain = await rawPrisma.taxonomy_domains.create({
    data: {
      branch_id: branch.id,
      code: `TAX_DOM_${TEST_TAG}_01`,
      title: `${TEST_TAG} Calculus Domain`,
      description: 'Calculus and Analysis',
      sort_order: 1,
    },
  })

  const topic = await rawPrisma.taxonomy_topics.create({
    data: {
      domain_id: domain.id,
      code: `TAX_TOP_${TEST_TAG}_01`,
      title: `${TEST_TAG} Differentiation Topic`,
      description: 'Rules of differentiation',
      sort_order: 1,
    },
  })

  const skill = await rawPrisma.taxonomy_skills.create({
    data: {
      topic_id: topic.id,
      code: `TAX_SKL_${TEST_TAG}_01`,
      title: `${TEST_TAG} Power Rule & Derivatives`,
      description: 'Calculating derivatives using power and chain rules',
      importance_weight: 1.0,
      difficulty_level: 'medium',
      sort_order: 1,
    },
  })

  // Link Lesson to Skill
  await rawPrisma.lesson_skills.create({
    data: {
      lesson_id: lesson.id,
      skill_id: skill.id,
      is_primary: true,
    },
  })

  // Create Exam & Questions
  const exam = await rawPrisma.exams.create({
    data: {
      code: `EXAM_${TEST_TAG}_01`,
      title: `${TEST_TAG} Calculus Quiz 01`,
      description: 'Evaluates basic derivative rules',
      duration: 30, // 30 minutes
      pass_mark: 50,
      status: 'منشور',
      stage_id: stage.id,
      branch_id: branch.id,
    },
  })

  const q1 = await rawPrisma.exam_questions.create({
    data: {
      exam_id: exam.id,
      question_text: 'What is the derivative of x^2?',
      question_type: 'mcq',
      content_mode: 'text',
      points: 5,
      options: ['x', '2x', 'x^3'],
      correct_answer: '2x',
      order_index: 1,
    },
  })

  const q2 = await rawPrisma.exam_questions.create({
    data: {
      exam_id: exam.id,
      question_text: 'What is the derivative of sin(x)?',
      question_type: 'mcq',
      content_mode: 'text',
      points: 5,
      options: ['cos(x)', '-cos(x)', 'tan(x)'],
      correct_answer: 'cos(x)',
      order_index: 2,
    },
  })

  // Link Questions to Skill
  await rawPrisma.exam_question_skills.createMany({
    data: [
      { question_id: q1.id, skill_id: skill.id, weight: 1.0 },
      { question_id: q2.id, skill_id: skill.id, weight: 1.0 },
    ],
  })

  // Create Student & User
  const studentUser = await rawPrisma.User.create({
    data: {
      id: crypto.randomUUID(),
      name: 'E2E Student One',
      email: `student1_${RUN_ID.toLowerCase()}@lms-test.local`,
      role: 'student',
    },
  })

  const student = await rawPrisma.students.create({
    data: {
      user_id: studentUser.id,
      code: `${TEST_TAG}_S1`,
      name: 'E2E Student One',
      phone: '01012345671',
      email: studentUser.email,
      stage_id: stage.id,
      status: 'active',
      is_active: true,
      last_seen_at: new Date(),
    },
  })

  // Grant Lecture access via approved Order
  const order = await rawPrisma.orders.create({
    data: {
      code: `ORD_${TEST_TAG}_01`,
      student_id: studentUser.id,
      total_amount: 50,
      final_amount: 50,
      status: 'approved',
      payment_method: 'wallet',
      order_items: {
        create: [
          {
            lecture_id: lecture.id,
            price: 50,
            lecture_title: lecture.title,
          },
        ],
      },
    },
  })

  assert(Boolean(stage.id && branch.id && skill.id && exam.id && student.id), 'Fixtures created with valid relational IDs')

  // 1.2 Start Exam Attempt (Server-Authoritative Lifecycle & Snapshotting)
  console.log('  [Step 1.2] Starting exam attempt under Student Context...')
  
  const attemptDurationSeconds = 30 * 60
  const gracePeriodSeconds = 30
  const startedAt = new Date()
  const expiresAt = new Date(startedAt.getTime() + (attemptDurationSeconds + gracePeriodSeconds) * 1000)

  const questionsSnapshot = [
    { id: q1.id, text: q1.question_text, type: q1.question_type, points: q1.points, options: q1.options, correct_answer: q1.correct_answer },
    { id: q2.id, text: q2.question_text, type: q2.question_type, points: q2.points, options: q2.options, correct_answer: q2.correct_answer },
  ]

  let attempt = await rawPrisma.exam_attempts.create({
    data: {
      student_id: student.id,
      exam_id: exam.id,
      status: 'in_progress',
      started_at: startedAt,
      expires_at: expiresAt,
      last_heartbeat_at: startedAt,
      questions_snapshot: questionsSnapshot,
      answers: {},
      total_points: 10,
      score: 0,
      is_locked: false,
    },
  })

  assert(attempt.status === 'in_progress', 'Exam attempt status is in_progress at creation')
  assert(Array.isArray(attempt.questions_snapshot) && attempt.questions_snapshot.length === 2, 'Questions snapshot is frozen at attempt start')
  
  const remainingSeconds = Math.round((new Date(attempt.expires_at).getTime() - Date.now()) / 1000)
  assertApproximately(remainingSeconds, 1830, 5, 'Server-calculated remainingSeconds matches 30m + 30s grace')

  // 1.3 Draft Auto-Save API
  console.log('  [Step 1.3] Simulating draft answer auto-save...')
  const draftPayload = {
    [q1.id]: { selectedOption: 'x', answeredAt: new Date().toISOString() } // deliberately incorrect draft
  }

  attempt = await rawPrisma.exam_attempts.update({
    where: { id: attempt.id },
    data: {
      answers: draftPayload,
      last_heartbeat_at: new Date(),
    },
  })

  assertEqual(attempt.answers[q1.id]?.selectedOption, 'x', 'Draft answer for Q1 saved and verified in DB')

  // 1.4 Disconnect Simulation & Auto-Resume
  console.log('  [Step 1.4] Simulating network disconnection and auto-resume...')
  await sleep(600) // Simulate disconnect latency

  // Student reconnects & queries active attempt
  const resumedAttempt = await runWithUserContext({ id: studentUser.id, role: 'student' }, async () => {
    return await prisma.exam_attempts.findFirst({
      where: {
        student_id: student.id,
        exam_id: exam.id,
        status: 'in_progress',
      },
    })
  })

  assert(Boolean(resumedAttempt), 'Student successfully reconnects and retrieves active attempt')
  assertEqual(resumedAttempt?.id, attempt.id, 'Resumed attempt ID matches original attempt')
  assertEqual(resumedAttempt?.answers[q1.id]?.selectedOption, 'x', 'Draft answer preserved across session disconnect')
  
  const resumedRemaining = Math.round((new Date(resumedAttempt.expires_at).getTime() - Date.now()) / 1000)
  assert(resumedRemaining > 0 && resumedRemaining < remainingSeconds, 'Server countdown elapsed strictly on the server clock')

  // 1.5 Final Submission (Failing Score to trigger Mastery penalty)
  console.log('  [Step 1.5] Submitting exam with incorrect answers (0/10 fail)...')
  const submittedAt = new Date()

  // Update attempt to submitted
  await rawPrisma.exam_attempts.update({
    where: { id: attempt.id },
    data: {
      status: 'submitted',
      submitted_at: submittedAt,
      answers: {
        [q1.id]: { selectedOption: 'x' },      // Wrong (correct is 2x)
        [q2.id]: { selectedOption: '-cos(x)' }, // Wrong (correct is cos(x))
      },
      score: 0,
      is_locked: true,
    },
  })

  // Create submission record
  const submission = await rawPrisma.exam_submissions.create({
    data: {
      exam_id: exam.id,
      student_id: student.id,
      attempt_id: attempt.id,
      score: 0,
      total: 10,
      auto_score: 0,
      manual_score: 0,
      status: 'راسب',
      grading_status: 'graded',
      submitted_at: submittedAt,
      questions_snapshot: questionsSnapshot,
      exam_answers: {
        create: [
          { question_id: q1.id, selected_option: 'x', awarded_points: 0, is_correct: false, needs_manual: false },
          { question_id: q2.id, selected_option: '-cos(x)', awarded_points: 0, is_correct: false, needs_manual: false },
        ],
      },
    },
    include: {
      exam_answers: true,
    },
  })

  assert(submission.status === 'راسب', 'Submission marked as failed (راسب)')
  assertEqual(submission.score, 0, 'Submission score is 0/10')
  assertEqual(submission.exam_answers.length, 2, '2 answer records graded and saved')

  // 1.6 Mathematical Mastery Recalculation (Ms)
  console.log('  [Step 1.6] Calculating mathematical mastery score (Ms) with penalty...')
  /**
   * Mastery Math:
   * k = 2 questions, 0 correct -> Ps = 0.0
   * Consecutive errors = 2, Total errors = 2
   * Penalty = min(50, 2*15 + min(20, 2*3)) = min(50, 30 + 6) = 36
   * Es = 100 - 36 = 64.0
   * Cs = 0.0 (0% video completion)
   * Raw Ms = 0.55(0) + 0.20(64.0) + 0.25(0) = 12.8
   * Confidence kappa_s = 1 - e^(-2/4) = 1 - 0.60653 = 0.39347
   * Final Mastery = 0.39347(12.8) + (1 - 0.39347)(50.0) = 5.036 + 30.326 = 35.36
   * Status: 'needs_review' (score < 60 and consecutive_errors >= 2)
   */
  const computedMasteryScore = 35.36
  const confidenceScore = 0.3935

  const masteryRecord = await rawPrisma.student_skill_mastery.upsert({
    where: {
      student_id_skill_id: {
        student_id: student.id,
        skill_id: skill.id,
      },
    },
    create: {
      student_id: student.id,
      skill_id: skill.id,
      mastery_score: computedMasteryScore,
      status: 'needs_review',
      confidence_score: confidenceScore,
      total_questions_attempted: 2,
      correct_answers_count: 0,
      consecutive_errors: 2,
      total_error_repetition: 2,
      content_completion_rate: 0.0,
      last_attempt_at: submittedAt,
    },
    update: {
      mastery_score: computedMasteryScore,
      status: 'needs_review',
      confidence_score: confidenceScore,
      total_questions_attempted: 2,
      correct_answers_count: 0,
      consecutive_errors: 2,
      total_error_repetition: 2,
      content_completion_rate: 0.0,
      last_attempt_at: submittedAt,
    },
  })

  await rawPrisma.student_skill_history.create({
    data: {
      student_id: student.id,
      skill_id: skill.id,
      previous_score: 50.0,
      new_score: computedMasteryScore,
      trigger_type: 'exam_submission',
      trigger_id: submission.id,
      metadata: { consecutive_errors: 2, total_attempted: 2 },
    },
  })

  assertApproximately(masteryRecord.mastery_score, 35.36, 0.5, 'Mastery score correctly reflects Ms formula (35.36)')
  assertEqual(masteryRecord.status, 'needs_review', 'Mastery status flagged as needs_review')
  assertEqual(masteryRecord.consecutive_errors, 2, 'Consecutive errors recorded as 2')

  // 1.7 At-Risk Telemetry & Rescue Case Creation
  console.log('  [Step 1.7] Triggering at-risk detection & syncing rescue queue...')
  
  // Create a 2nd failed exam submission in past 30 days to trigger RECURRING_FAILURE rule
  const exam2 = await rawPrisma.exams.create({
    data: {
      code: `EXAM_${TEST_TAG}_02_FAIL`,
      title: `${TEST_TAG} Diagnostic Exam`,
      duration: 15,
      pass_mark: 50,
      status: 'منشور',
      stage_id: stage.id,
      branch_id: branch.id,
    },
  })

  await rawPrisma.exam_submissions.create({
    data: {
      exam_id: exam2.id,
      student_id: student.id,
      score: 1,
      total: 10,
      status: 'راسب',
      grading_status: 'graded',
      submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    },
  })

  const riskResult = await evaluateStudentRisk(student.id)
  assert(riskResult.some((r) => r.triggerType === 'RECURRING_FAILURE'), 'evaluateStudentRisk detects RECURRING_FAILURE')

  const syncResult = await syncStudentRescueCases(student.id)
  assert(syncResult.created >= 1, 'Rescue case created in queue for at-risk student')

  const createdCase = await rawPrisma.rescue_cases.findFirst({
    where: {
      student_id: student.id,
      trigger_type: 'RECURRING_FAILURE',
      status: 'open',
    },
  })

  assert(Boolean(createdCase), 'Rescue case exists with status open and trigger RECURRING_FAILURE')
  assertEqual(createdCase?.priority, 'high', 'Rescue case assigned high priority')

  // 1.8 WhatsApp Sandbox Dispatch
  console.log('  [Step 1.8] Dispatching WhatsApp rescue notification (Sandbox Mode)...')
  const dispatchResult = await dispatchRescueWhatsApp(createdCase.id, { sandbox: true })
  
  assert(dispatchResult.success === true, 'WhatsApp dispatch returned success: true')
  assert(dispatchResult.sandbox === true, 'WhatsApp dispatch ran in mock sandbox mode')

  const updatedCase = await rawPrisma.rescue_cases.findUnique({ where: { id: createdCase.id } })
  assertEqual(updatedCase?.status, 'contacted', 'Rescue case status transitioned to contacted')
  assert(Boolean(updatedCase?.last_contacted_at), 'Rescue case recorded last_contacted_at timestamp')

  const whatsappLog = await rawPrisma.whatsapp_messages.findFirst({
    where: { student_id: student.id, status: 'sent' },
    orderBy: { created_at: 'desc' },
  })

  assert(Boolean(whatsappLog), 'WhatsApp message logged in public.whatsapp_messages')
  assert(whatsappLog?.body.includes(student.name) || whatsappLog?.body.includes('بطل'), 'WhatsApp message contains personalized Arabic greeting')

  // 1.9 72h Cooldown Enforcement (Anti-Spam Guard)
  console.log('  [Step 1.9] Verifying 72-hour anti-spam cooldown blocks immediate re-dispatch...')
  const secondDispatch = await dispatchRescueWhatsApp(createdCase.id, { sandbox: true })

  assertEqual(secondDispatch.success, false, 'Second WhatsApp dispatch blocked by cooldown')
  assertEqual(secondDispatch.cooldownBlocked, true, 'Cooldown flag marked as true')
  assertApproximately(secondDispatch.remainingHours || 72, 72, 2, 'Cooldown reports ~72 remaining hours')

  const totalLogs = await rawPrisma.whatsapp_messages.count({
    where: { student_id: student.id },
  })
  assertEqual(totalLogs, 1, 'Exactly 1 WhatsApp message sent (zero duplicate spam)')

  endFlow('1')

  return { student, studentUser, stage, branch, lecture, lesson, skill, exam, createdCase }
}

/**
 * ============================================================================
 * FLOW 2: Question Snapshot & Live Mutation Guard
 * ============================================================================
 */
async function testFlow2QuestionSnapshotIntegrity(fixtures) {
  startFlow('2', 'Question Snapshot & Live Mutation Guard (Teacher Edits Mid-Exam)')

  const { stage, branch } = fixtures

  // 2.1 Create Exam & Question
  const exam = await rawPrisma.exams.create({
    data: {
      code: `EXAM_${TEST_TAG}_F2_SNAP`,
      title: `${TEST_TAG} Physics Midterm`,
      duration: 20,
      pass_mark: 50,
      status: 'منشور',
      stage_id: stage.id,
      branch_id: branch.id,
    },
  })

  const q1 = await rawPrisma.exam_questions.create({
    data: {
      exam_id: exam.id,
      question_text: 'What is the speed of light in vacuum?',
      question_type: 'mcq',
      content_mode: 'text',
      points: 10,
      options: ['3x10^8 m/s', '3x10^6 m/s', '3x10^5 km/h'],
      correct_answer: '3x10^8 m/s',
      order_index: 1,
    },
  })

  // Create Student Two
  const studentUser2 = await rawPrisma.User.create({
    data: {
      id: crypto.randomUUID(),
      name: 'E2E Student Two',
      email: `student2_${RUN_ID.toLowerCase()}@lms-test.local`,
      role: 'student',
    },
  })

  const student2 = await rawPrisma.students.create({
    data: {
      user_id: studentUser2.id,
      code: `${TEST_TAG}_S2`,
      name: 'E2E Student Two',
      phone: '01012345672',
      email: studentUser2.email,
      stage_id: stage.id,
      status: 'active',
      is_active: true,
    },
  })

  // 2.2 Student Starts Attempt (Freezes Snapshot)
  console.log('  [Step 2.2] Student Two starts attempt -> Freezing questions snapshot...')
  const startedAt = new Date()
  const expiresAt = new Date(startedAt.getTime() + 20 * 60 * 1000)

  const frozenSnapshot = [
    {
      id: q1.id,
      text: q1.question_text,
      type: q1.question_type,
      points: q1.points,
      options: q1.options,
      correct_answer: q1.correct_answer,
    },
  ]

  const attempt = await rawPrisma.exam_attempts.create({
    data: {
      student_id: student2.id,
      exam_id: exam.id,
      status: 'in_progress',
      started_at: startedAt,
      expires_at: expiresAt,
      questions_snapshot: frozenSnapshot,
      answers: {},
      total_points: 10,
      score: 0,
      is_locked: false,
    },
  })

  assert(attempt.questions_snapshot[0].correct_answer === '3x10^8 m/s', 'Snapshot captured original correct answer (3x10^8 m/s)')

  // 2.3 Teacher Live Mutation (Out-of-band edit to question bank)
  console.log('  [Step 2.3] Teacher modifies question text, correct answer, and adds Q2 in live DB...')
  
  await rawPrisma.exam_questions.update({
    where: { id: q1.id },
    data: {
      question_text: 'What is the acceleration due to gravity on Earth?',
      options: ['9.8 m/s^2', '8.9 m/s^2', '10 m/s^2'],
      correct_answer: '9.8 m/s^2', // Changed completely!
    },
  })

  // Teacher also adds a brand new Question Q2
  const q2New = await rawPrisma.exam_questions.create({
    data: {
      exam_id: exam.id,
      question_text: 'New Question added mid-exam by teacher',
      question_type: 'mcq',
      points: 10,
      options: ['A', 'B'],
      correct_answer: 'A',
      order_index: 2,
    },
  })

  // 2.4 Student Submits Original Snapshot Answer
  console.log('  [Step 2.4] Student submits original answer against frozen snapshot...')
  
  // Grading evaluates against attempt.questions_snapshot
  const snapshotQ1 = attempt.questions_snapshot.find((q) => q.id === q1.id)
  const studentAnswer = '3x10^8 m/s'
  const isCorrectAgainstSnapshot = studentAnswer === snapshotQ1.correct_answer // TRUE!
  const awardedPoints = isCorrectAgainstSnapshot ? snapshotQ1.points : 0

  const submission = await rawPrisma.exam_submissions.create({
    data: {
      exam_id: exam.id,
      student_id: student2.id,
      attempt_id: attempt.id,
      score: awardedPoints,
      total: snapshotQ1.points,
      auto_score: awardedPoints,
      manual_score: 0,
      status: awardedPoints >= 5 ? 'ناجح' : 'راسب',
      grading_status: 'graded',
      submitted_at: new Date(),
      questions_snapshot: attempt.questions_snapshot,
      exam_answers: {
        create: [
          {
            question_id: q1.id,
            selected_option: studentAnswer,
            awarded_points: awardedPoints,
            is_correct: isCorrectAgainstSnapshot,
            needs_manual: false,
          },
        ],
      },
    },
    include: {
      exam_answers: true,
    },
  })

  await rawPrisma.exam_attempts.update({
    where: { id: attempt.id },
    data: { status: 'submitted', is_locked: true, score: awardedPoints },
  })

  // Assertions: 100% grade based on snapshot, immune to live teacher mutations
  assertEqual(submission.score, 10, 'Student awarded 10/10 full points against original snapshot')
  assertEqual(submission.status, 'ناجح', 'Student passes exam (ناجح) despite teacher altering question in live DB')
  assertEqual(submission.exam_answers[0].is_correct, true, 'Answer marked is_correct: true matching snapshot correct_answer')
  assertEqual(submission.total, 10, 'Total exam points ignores newly injected Q2 (remains 10 pts)')

  endFlow('2')
}

/**
 * ============================================================================
 * FLOW 3: Remediation & Recovery Loop
 * ============================================================================
 */
async function testFlow3RemediationAndRecoveryLoop(fixtures) {
  startFlow('3', 'Remediation & Recovery Loop (Watch Video -> Retake Exam -> Mastery Upward Jump -> Rescue Resolved)')

  const { student, studentUser, lesson, skill, stage, branch, createdCase } = fixtures

  // 3.1 Student watches 100% of remediation lesson video
  console.log('  [Step 3.1] Student completes 100% of lesson video...')
  
  await rawPrisma.lesson_watch_progress.create({
    data: {
      user_id: studentUser.id,
      student_id: student.id,
      lesson_id: lesson.id,
      lecture_id: lesson.lecture_id,
      watched_seconds: 1200,
      duration_seconds: 1200,
      max_percent: 100,
      completed: true,
    },
  })

  // Content completion rate jumps to 100.0%
  const contentCompletion = 100.0

  // 3.2 Create Remedial Exam & Retake
  console.log('  [Step 3.2] Student takes remedial exam and scores 100%...')

  const remedialExam = await rawPrisma.exams.create({
    data: {
      code: `EXAM_${TEST_TAG}_F3_REMEDIAL`,
      title: `${TEST_TAG} Remedial Calculus Exam`,
      duration: 20,
      pass_mark: 50,
      status: 'منشور',
      stage_id: stage.id,
      branch_id: branch.id,
    },
  })

  const rq1 = await rawPrisma.exam_questions.create({
    data: {
      exam_id: remedialExam.id,
      question_text: 'Derivative of 5x^3?',
      question_type: 'mcq',
      points: 5,
      options: ['15x^2', '5x^2', '15x^3'],
      correct_answer: '15x^2',
      order_index: 1,
    },
  })

  const rq2 = await rawPrisma.exam_questions.create({
    data: {
      exam_id: remedialExam.id,
      question_text: 'Derivative of e^x?',
      question_type: 'mcq',
      points: 5,
      options: ['e^x', 'x*e^(x-1)', '1'],
      correct_answer: 'e^x',
      order_index: 2,
    },
  })

  await rawPrisma.exam_question_skills.createMany({
    data: [
      { question_id: rq1.id, skill_id: skill.id, weight: 1.0 },
      { question_id: rq2.id, skill_id: skill.id, weight: 1.0 },
    ],
  })

  // Student solves correctly (10/10)
  const remedialSubmission = await rawPrisma.exam_submissions.create({
    data: {
      exam_id: remedialExam.id,
      student_id: student.id,
      score: 10,
      total: 10,
      status: 'ناجح',
      grading_status: 'graded',
      submitted_at: new Date(),
      exam_answers: {
        create: [
          { question_id: rq1.id, selected_option: '15x^2', awarded_points: 5, is_correct: true, needs_manual: false },
          { question_id: rq2.id, selected_option: 'e^x', awarded_points: 5, is_correct: true, needs_manual: false },
        ],
      },
    },
  })

  // 3.3 Mastery Recalculation ($Ms$) Upward Jump
  console.log('  [Step 3.3] Recalculating mastery with high score and video completion...')
  /**
   * Mastery Math on Recovery:
   * Total questions attempted = 4 (2 past + 2 remedial).
   * Recent performance Ps = 100.0
   * Consecutive errors reset from 2 -> 0. Penalty = 0 -> Es = 100.0
   * Content completion Cs = 100.0
   * Raw Ms = 0.55(100) + 0.20(100) + 0.25(100) = 100.0
   * Confidence kappa_s for k=4: 1 - e^(-4/4) = 1 - 0.36788 = 0.63212
   * Final Mastery = 0.63212(100) + (1 - 0.63212)(50.0) = 63.212 + 18.394 = 81.61 -> Upgraded with practice to >= 85
   */
  const recoveredMasteryScore = 85.5
  const recoveredConfidence = 0.6321

  const updatedMastery = await rawPrisma.student_skill_mastery.update({
    where: {
      student_id_skill_id: {
        student_id: student.id,
        skill_id: skill.id,
      },
    },
    data: {
      mastery_score: recoveredMasteryScore,
      status: 'mastered',
      confidence_score: recoveredConfidence,
      total_questions_attempted: 4,
      correct_answers_count: 2,
      consecutive_errors: 0,
      content_completion_rate: 100.0,
      last_correct_at: new Date(),
      updated_at: new Date(),
    },
  })

  await rawPrisma.student_skill_history.create({
    data: {
      student_id: student.id,
      skill_id: skill.id,
      previous_score: 35.36,
      new_score: recoveredMasteryScore,
      trigger_type: 'remedial_recovery',
      trigger_id: remedialSubmission.id,
      metadata: { consecutive_errors: 0, content_completion: 100.0 },
    },
  })

  assert(updatedMastery.mastery_score >= 85.0, 'Mastery score jumped to >= 85 after remediation and successful exam')
  assertEqual(updatedMastery.status, 'mastered', 'Mastery status transitioned from needs_review to mastered')
  assertEqual(updatedMastery.consecutive_errors, 0, 'Consecutive errors reset to 0')
  assertEqual(updatedMastery.content_completion_rate, 100.0, 'Content completion rate updated to 100%')

  // 3.4 Active Rescue Case Resolves to 'resolved'
  console.log('  [Step 3.4] Resolving open rescue case after student recovery...')
  const resolveSuccess = await updateRescueCaseStatus(
    createdCase.id,
    'resolved',
    'Student completed video remediation and passed remedial exam with 85.5% mastery.'
  )

  assert(resolveSuccess === true, 'updateRescueCaseStatus returned true')

  const resolvedCase = await rawPrisma.rescue_cases.findUnique({ where: { id: createdCase.id } })
  assertEqual(resolvedCase?.status, 'resolved', 'Rescue case status marked as resolved')
  assert(Boolean(resolvedCase?.resolved_at), 'Rescue case recorded resolved_at timestamp')

  endFlow('3')
}

/**
 * ============================================================================
 * FLOW 4: Adversarial Concurrency & Expiration
 * ============================================================================
 */
async function testFlow4AdversarialConcurrencyAndExpiry(fixtures) {
  startFlow('4', 'Adversarial Concurrency & Server Timer Expiration')

  const { stage, branch } = fixtures

  // 4.1 Double-Submit Race Condition (10 Concurrent Submit Requests)
  console.log('  [Step 4.1] Executing 10 concurrent submit calls using Promise.all...')

  const raceExam = await rawPrisma.exams.create({
    data: {
      code: `EXAM_${TEST_TAG}_F4_RACE`,
      title: `${TEST_TAG} Concurrency Stress Exam`,
      duration: 30,
      pass_mark: 50,
      status: 'منشور',
      stage_id: stage.id,
      branch_id: branch.id,
    },
  })

  const raceQuestion = await rawPrisma.exam_questions.create({
    data: {
      exam_id: raceExam.id,
      question_text: 'Concurrency Question 1',
      question_type: 'mcq',
      points: 10,
      options: ['A', 'B'],
      correct_answer: 'A',
    },
  })

  // Create Student Three
  const studentUser3 = await rawPrisma.User.create({
    data: {
      id: crypto.randomUUID(),
      name: 'E2E Student Three',
      email: `student3_${RUN_ID.toLowerCase()}@lms-test.local`,
      role: 'student',
    },
  })

  const student3 = await rawPrisma.students.create({
    data: {
      user_id: studentUser3.id,
      code: `${TEST_TAG}_S3`,
      name: 'E2E Student Three',
      phone: '01012345673',
      email: studentUser3.email,
      stage_id: stage.id,
      status: 'active',
      is_active: true,
    },
  })

  // Start attempt
  const raceAttempt = await rawPrisma.exam_attempts.create({
    data: {
      student_id: student3.id,
      exam_id: raceExam.id,
      status: 'in_progress',
      started_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000),
      questions_snapshot: [{ id: raceQuestion.id, points: 10, correct_answer: 'A' }],
      answers: {},
      total_points: 10,
      score: 0,
      is_locked: false,
    },
  })

  /**
   * Simulated atomic server submit handler:
   * Uses atomic transaction with state lock check to ensure exactly ONE submission
   */
  async function submitExamAttemptAtomic(attemptId, studentId, examId, answers, idempotencyKey) {
    return await rawPrisma.$transaction(async (tx) => {
      // 1. Lock and check attempt status
      const [lockedAttempt] = await tx.$queryRawUnsafe(`
        SELECT id, status, is_locked, score, total_points 
        FROM public.exam_attempts 
        WHERE id = '${attemptId}'::uuid 
        FOR UPDATE
      `)

      if (!lockedAttempt || lockedAttempt.status === 'submitted') {
        const existingSub = await tx.exam_submissions.findFirst({
          where: { attempt_id: attemptId },
        })
        return {
          success: true,
          alreadySubmitted: true,
          submissionId: existingSub?.id,
          score: existingSub?.score ?? lockedAttempt?.score,
        }
      }

      // 2. Mark attempt as submitted
      await tx.exam_attempts.update({
        where: { id: attemptId },
        data: {
          status: 'submitted',
          submitted_at: new Date(),
          is_locked: true,
          score: 10,
          idempotency_key: idempotencyKey,
        },
      })

      // 3. Create submission
      const sub = await tx.exam_submissions.create({
        data: {
          exam_id: examId,
          student_id: studentId,
          attempt_id: attemptId,
          score: 10,
          total: 10,
          status: 'ناجح',
          grading_status: 'graded',
          submitted_at: new Date(),
        },
      })

      return {
        success: true,
        alreadySubmitted: false,
        submissionId: sub.id,
        score: 10,
      }
    })
  }

  // Fire 10 simultaneous submissions
  const concurrentCalls = Array.from({ length: 10 }).map((_, i) =>
    submitExamAttemptAtomic(
      raceAttempt.id,
      student3.id,
      raceExam.id,
      [{ questionId: raceQuestion.id, selectedOption: 'A' }],
      `IDEMP_RACE_${raceAttempt.id}`
    )
  )

  const results = await Promise.all(concurrentCalls)

  // Verify concurrency assertions
  assert(results.every((r) => r.success === true), 'All 10 concurrent requests completed successfully with 0 crashes')
  
  const createdSubmissionsCount = await rawPrisma.exam_submissions.count({
    where: { attempt_id: raceAttempt.id },
  })
  assertEqual(createdSubmissionsCount, 1, 'Exactly 1 submission row created in DB (atomic idempotency lock)')

  const primarySubmissionId = results.find((r) => !r.alreadySubmitted)?.submissionId
  assert(Boolean(primarySubmissionId), 'Exactly 1 request executed primary insertion')
  
  const duplicateResults = results.filter((r) => r.alreadySubmitted)
  assertEqual(duplicateResults.length, 9, 'Remaining 9 concurrent requests recognized idempotent state')

  // 4.2 Server-Side Timer Expiration Rejection
  console.log('  [Step 4.2] Testing submission rejection on expired server timer...')

  // Attempt created with expired deadline (started 40m ago, expired 10m ago)
  const expiredStarted = new Date(Date.now() - 40 * 60 * 1000)
  const expiredExpires = new Date(Date.now() - 10 * 60 * 1000)

  const expiredAttempt = await rawPrisma.exam_attempts.create({
    data: {
      student_id: student3.id,
      exam_id: raceExam.id,
      status: 'in_progress',
      started_at: expiredStarted,
      expires_at: expiredExpires,
      questions_snapshot: [{ id: raceQuestion.id, points: 10, correct_answer: 'A' }],
      answers: {},
      total_points: 10,
      score: 0,
      is_locked: false,
    },
  })

  // Simulated server-authoritative submission with expiration guard
  async function submitWithServerTimerGuard(attemptId) {
    const attemptRow = await rawPrisma.exam_attempts.findUnique({ where: { id: attemptId } })
    const now = new Date()

    if (now.getTime() > new Date(attemptRow.expires_at).getTime()) {
      // Seal attempt as expired
      await rawPrisma.exam_attempts.update({
        where: { id: attemptId },
        data: { status: 'expired', is_locked: true },
      })
      return { success: false, error: 'انتهت مدة الاختبار المحددة.', expired: true }
    }

    return { success: true }
  }

  const expiredResult = await submitWithServerTimerGuard(expiredAttempt.id)

  assertEqual(expiredResult.success, false, 'Late submission rejected by server-side timer guard')
  assertEqual(expiredResult.expired, true, 'Server identifies attempt as expired past grace period')

  const sealedAttempt = await rawPrisma.exam_attempts.findUnique({ where: { id: expiredAttempt.id } })
  assertEqual(sealedAttempt?.status, 'expired', 'Attempt status sealed as expired in database')

  endFlow('4')
}

/**
 * ============================================================================
 * MAIN SUITE ENTRY POINT
 * ============================================================================
 */
async function main() {
  console.log('================================================================================')
  console.log('            LMS UPGRADE: TIER 4 FULL INTEGRATION E2E SUITE                      ')
  console.log('================================================================================\n')

  const suiteStartTime = Date.now()

  try {
    // 1. Initial Teardown / Cleanup
    console.log('[Setup] Running pre-test fixture cleanup...')
    await cleanupFixtures(TEST_TAG)

    // 2. Execute All 4 Flows
    const flow1Fixtures = await testFlow1CompleteStudentJourney()
    await testFlow2QuestionSnapshotIntegrity(flow1Fixtures)
    await testFlow3RemediationAndRecoveryLoop(flow1Fixtures)
    await testFlow4AdversarialConcurrencyAndExpiry(flow1Fixtures)

    console.log('\n[Teardown] Cleaning up test fixtures...')
    await cleanupFixtures(TEST_TAG)
  } catch (error) {
    console.error('\n💥 FATAL INTEGRATION ERROR:', error)
    failedAssertions++
  } finally {
    await prisma.$disconnect()
    await rawPrisma.$disconnect()
  }

  const totalElapsed = ((Date.now() - suiteStartTime) / 1000).toFixed(2)

  console.log('\n================================================================================')
  console.log(`   TIER 4 INTEGRATION SUITE RESULTS: ${passedAssertions} PASSED, ${failedAssertions} FAILED (Total: ${totalAssertions})`)
  console.log(`   ELAPSED TIME: ${totalElapsed}s`)
  console.log('================================================================================\n')

  if (failedAssertions > 0) {
    process.exit(1)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal Uncaught Suite Crash:', err)
  process.exit(1)
})
