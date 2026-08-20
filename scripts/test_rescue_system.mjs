import fs from 'fs'
import crypto from 'node:crypto'

// 1. Load environment variables
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

// Force sandbox mode for testing
process.env.WHATSAPP_SANDBOX = 'true'
process.env.NODE_ENV = 'test'

import { prisma } from '../lib/prisma.ts'
import {
  evaluateStudentRisk,
  syncStudentRescueCases,
  runRescueScan,
  getRescueCases,
  updateRescueCaseStatus,
  getRescueStats,
} from '../lib/rescue.ts'
import {
  checkStudentCooldown,
  checkHourlyRateLimit,
  dispatchRescueWhatsApp,
  generateRescueMessage,
  getPlatformRescueSettings,
} from '../lib/rescue-notifier.ts'

const TEST_RUN_ID = `test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
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

async function runTests() {
  console.log('================================================================')
  console.log('        R3 RESCUE SYSTEM & WHATSAPP INTEGRATION SUITE           ')
  console.log(`        Run ID: ${TEST_RUN_ID}                                  `)
  console.log('================================================================\n')

  const createdStudentIds = []
  const createdUserIds = []
  const createdOrderIds = []
  const createdLectureIds = []
  const createdExamIds = []
  const createdStageIds = []
  const createdBranchIds = []

  try {
    // -------------------------------------------------------------------------
    // Setup Shared Test Stage & Branch
    // -------------------------------------------------------------------------
    const stage = await prisma.stages.create({
      data: {
        slug: `stage-${TEST_RUN_ID}`,
        title: `مرحلة تجريبية ${TEST_RUN_ID}`,
        subtitle: 'مرحلة لاختبارات نظام الإنقاذ',
        sort_order: 999,
      },
    })
    createdStageIds.push(stage.id)

    const branch = await prisma.branches.create({
      data: {
        stage_id: stage.id,
        slug: `br-${TEST_RUN_ID}`,
        title: `فرع تجريبي ${TEST_RUN_ID}`,
      },
    })
    createdBranchIds.push(branch.id)

    // -------------------------------------------------------------------------
    // Setup Test Lectures & Lessons
    // -------------------------------------------------------------------------
    const lecture1 = await prisma.lectures.create({
      data: {
        branch_id: branch.id,
        slug: `lec-1-${TEST_RUN_ID}`,
        title: `محاضرة النحو الشامل ${TEST_RUN_ID}`,
        price: 150,
      },
    })
    createdLectureIds.push(lecture1.id)

    const lesson1_1 = await prisma.lessons.create({
      data: {
        lecture_id: lecture1.id,
        slug: `les-1-1-${TEST_RUN_ID}`,
        title: 'درس المبتدأ والخبر',
        duration: '15:00',
        sort_order: 1,
      },
    })

    const lesson1_2 = await prisma.lessons.create({
      data: {
        lecture_id: lecture1.id,
        slug: `les-1-2-${TEST_RUN_ID}`,
        title: 'درس النواسخ وكان وأخواتها',
        duration: '20:00',
        sort_order: 2,
      },
    })

    // Setup Test Exam
    const exam1 = await prisma.exams.create({
      data: {
        code: `exam_${TEST_RUN_ID}`,
        title: `امتحان النحو الشامل ${TEST_RUN_ID}`,
        course: `محاضرة النحو الشامل ${TEST_RUN_ID}`,
        branch_id: branch.id,
        stage_id: stage.id,
        duration: 30,
        questions: 10,
        pass_mark: 50,
        status: 'منشور',
      },
    })
    createdExamIds.push(exam1.id)

    // -------------------------------------------------------------------------
    // Helper to create test user and student
    async function createTestStudent({ code, name, email, phone, stage_id, status = 'نشط', created_at, last_seen_at }) {
      const userId = crypto.randomUUID()
      const user = await prisma.user.create({
        data: {
          id: userId,
          email,
          role: 'authenticated',
          aud: 'authenticated',
        },
      })
      createdUserIds.push(user.id)

      const student = await prisma.students.create({
        data: {
          code,
          user_id: user.id,
          name,
          email,
          phone,
          stage_id,
          status,
          created_at: created_at || new Date(),
          last_seen_at: last_seen_at || null,
        },
      })
      createdStudentIds.push(student.id)
      return { student, user }
    }

    // -------------------------------------------------------------------------
    // Setup Test Students
    // -------------------------------------------------------------------------
    // Student 1: PURCHASED_INACTIVE (Approved purchase 4 days ago, 0 watch progress)
    const { student: student1, user: user1 } = await createTestStudent({
      code: `st1_${TEST_RUN_ID}`,
      name: 'أحمد محمود التائه',
      email: `ahmed_${TEST_RUN_ID}@example.com`,
      phone: '01012345671',
      stage_id: stage.id,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    })

    const order1 = await prisma.orders.create({
      data: {
        code: `ORD-1-${TEST_RUN_ID}`,
        student_id: user1.id,
        student_name: student1.name,
        student_email: student1.email || '',
        student_phone: student1.phone || '',
        status: 'approved',
        total: 150,
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        order_items: {
          create: [
            {
              lecture_id: lecture1.id,
              lecture_title: lecture1.title,
              branch_title: branch.name,
              price: 150,
              item_type: 'lecture',
            },
          ],
        },
      },
    })
    createdOrderIds.push(order1.id)

    // Student 2: RECURRING_FAILURE (2 failed exam submissions in last 10 days)
    const { student: student2, user: user2 } = await createTestStudent({
      code: `st2_${TEST_RUN_ID}`,
      name: 'كريم عادل المتعثر',
      email: `karim_${TEST_RUN_ID}@example.com`,
      phone: '01112345672',
      stage_id: stage.id,
      created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    })

    const exam2 = await prisma.exams.create({
      data: {
        code: `exam2_${TEST_RUN_ID}`,
        title: `اختبار البلاغة ${TEST_RUN_ID}`,
        course: `فرع تجريبي ${TEST_RUN_ID}`,
        branch_id: branch.id,
        duration: 20,
        questions: 5,
        pass_mark: 50,
        status: 'منشور',
      },
    })
    createdExamIds.push(exam2.id)

    await prisma.exam_submissions.create({
      data: {
        exam_id: exam1.id,
        student_id: student2.id,
        score: 3,
        total: 10,
        status: 'راسب',
        submitted_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
    })

    await prisma.exam_submissions.create({
      data: {
        exam_id: exam2.id,
        student_id: student2.id,
        score: 2,
        total: 10,
        status: 'راسب',
        submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    })

    // Student 3: ABANDONED_FLOW (100% lessons completed 4 days ago, 0 exam submissions)
    const { student: student3, user: user3 } = await createTestStudent({
      code: `st3_${TEST_RUN_ID}`,
      name: 'سارة طارق المنقطعة',
      email: `sara_${TEST_RUN_ID}@example.com`,
      phone: '01212345673',
      stage_id: stage.id,
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    })

    await prisma.lesson_watch_progress.create({
      data: {
        user_id: user3.id,
        student_id: student3.id,
        lecture_id: lecture1.id,
        lesson_id: lesson1_1.id,
        max_percent: 100,
        watched_seconds: 900,
        duration_seconds: 900,
        completed: true,
        last_viewed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
    })

    await prisma.lesson_watch_progress.create({
      data: {
        user_id: user3.id,
        student_id: student3.id,
        lecture_id: lecture1.id,
        lesson_id: lesson1_2.id,
        max_percent: 100,
        watched_seconds: 1200,
        duration_seconds: 1200,
        completed: true,
        last_viewed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
    })

    // Student 4: INACTIVE_STUDENT (Enrolled, last seen 20 days ago, no activity)
    const { student: student4, user: user4 } = await createTestStudent({
      code: `st4_${TEST_RUN_ID}`,
      name: 'ياسين سامي الغائب',
      email: `yassin_${TEST_RUN_ID}@example.com`,
      phone: '01512345674',
      stage_id: stage.id,
      last_seen_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    })

    // Mark student4 as enrolled via an order
    await prisma.orders.create({
      data: {
        student_id: user4.id,
        code: `ORD-RESCUE-${TEST_RUN_ID}-S4`,
        total: 150,
        status: 'approved',
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        order_items: {
          create: [
            {
              lecture_id: lecture1.id,
              lecture_title: lecture1.title,
              price: 150,
              item_type: 'lecture',
            }
          ]
        }
      },
    })

    // Student 5: Control Student (Healthy & Active)
    const { student: student5, user: user5 } = await createTestStudent({
      code: `st5_${TEST_RUN_ID}`,
      name: 'مريم هاني المتفوقة',
      email: `mariam_${TEST_RUN_ID}@example.com`,
      phone: '01098765432',
      stage_id: stage.id,
      last_seen_at: new Date(),
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    })

    await prisma.lesson_watch_progress.create({
      data: {
        user_id: user5.id,
        student_id: student5.id,
        lecture_id: lecture1.id,
        lesson_id: lesson1_1.id,
        max_percent: 100,
        watched_seconds: 900,
        duration_seconds: 900,
        completed: true,
        last_viewed_at: new Date(),
      },
    })

    await prisma.exam_submissions.create({
      data: {
        exam_id: exam1.id,
        student_id: student5.id,
        score: 10,
        total: 10,
        status: 'ناجح',
        submitted_at: new Date(),
      },
    })

    console.log('--- TEST 1: Rule 1 Detection (PURCHASED_INACTIVE) ---')
    const risks1 = await evaluateStudentRisk(student1.id)
    const rule1 = risks1.find((r) => r.triggerType === 'PURCHASED_INACTIVE')
    assert(!!rule1, 'Rule 1 (PURCHASED_INACTIVE) flagged student with approved order and 0 watch progress')
    assert(rule1?.priority === 'high', 'Rule 1 assigned priority "high"')
    assert(rule1?.riskScore === 80, 'Rule 1 assigned riskScore = 80')
    assert(rule1?.details?.daysInactive >= 3, 'Rule 1 details include daysInactive >= 3')

    const sync1 = await syncStudentRescueCases(student1.id, risks1)
    assert(sync1.created === 1, 'syncStudentRescueCases created 1 new open case for student 1')

    console.log('\n--- TEST 2: Rule 2 Detection (RECURRING_FAILURE) ---')
    const risks2 = await evaluateStudentRisk(student2.id)
    const rule2 = risks2.find((r) => r.triggerType === 'RECURRING_FAILURE')
    assert(!!rule2, 'Rule 2 (RECURRING_FAILURE) flagged student with >= 2 failed exams in last 30 days')
    assert(rule2?.priority === 'high', 'Rule 2 assigned priority "high"')
    assert(rule2?.riskScore === 85, 'Rule 2 assigned riskScore = 85')
    assert(rule2?.details?.failedCount === 2, 'Rule 2 details captured exact failedCount = 2')

    const sync2 = await syncStudentRescueCases(student2.id, risks2)
    assert(sync2.created >= 1, 'syncStudentRescueCases created >= 1 new open case for student 2')

    console.log('\n--- TEST 3: Rule 3 Detection (ABANDONED_FLOW) ---')
    const risks3 = await evaluateStudentRisk(student3.id)
    const rule3 = risks3.find((r) => r.triggerType === 'ABANDONED_FLOW')
    assert(!!rule3, 'Rule 3 (ABANDONED_FLOW) flagged student with 100% lessons completed and 0 exams')
    assert(rule3?.priority === 'medium', 'Rule 3 assigned priority "medium"')
    assert(rule3?.riskScore === 70, 'Rule 3 assigned riskScore = 70')
    assert(rule3?.details?.completionPercentage >= 80, 'Rule 3 details captured completionPercentage >= 80%')

    const sync3 = await syncStudentRescueCases(student3.id, risks3)
    assert(sync3.created >= 1, 'syncStudentRescueCases created >= 1 new open case for student 3')

    console.log('\n--- TEST 4: Rule 4 Detection (INACTIVE_STUDENT) ---')
    const risks4 = await evaluateStudentRisk(student4.id)
    const rule4 = risks4.find((r) => r.triggerType === 'INACTIVE_STUDENT')
    assert(!!rule4, 'Rule 4 (INACTIVE_STUDENT) flagged student with no presence or learning activity for >= 14 days')
    assert(rule4?.priority === 'medium', 'Rule 4 assigned priority "medium"')
    assert(rule4?.riskScore === 65, 'Rule 4 assigned riskScore = 65')
    assert(rule4?.details?.daysInactive >= 14, 'Rule 4 details captured daysInactive >= 14')

    const sync4 = await syncStudentRescueCases(student4.id, risks4)
    assert(sync4.created >= 1, 'syncStudentRescueCases created >= 1 new open case for student 4')

    console.log('\n--- TEST 5: Control Student Evaluation (No Risk) ---')
    const risks5 = await evaluateStudentRisk(student5.id)
    assert(risks5.length === 0, 'Active & healthy student flagged 0 risks')

    console.log('\n--- TEST 6: Case Deduplication & Idempotency ---')
    const dedupeSync = await syncStudentRescueCases(student1.id)
    assert(dedupeSync.created === 0, 'Second sync did NOT create duplicate case (created: 0)')
    assert(dedupeSync.existing >= 1, 'Second sync recognized existing active case')

    const student1Cases = await prisma.rescue_cases.count({
      where: { student_id: student1.id, trigger_type: 'PURCHASED_INACTIVE' },
    })
    assert(student1Cases === 1, 'Exactly 1 case exists for student 1 + PURCHASED_INACTIVE')

    console.log('\n--- TEST 7: Template & Arabic Message Generator ---')
    const msg1 = generateRescueMessage('PURCHASED_INACTIVE', {
      studentName: 'أحمد محمود',
      courseTitle: 'محاضرة النحو',
      daysInactive: 4,
    })
    assert(msg1.includes('أحمد محمود') && msg1.includes('محاضرة النحو'), 'PURCHASED_INACTIVE template correctly personalizes name and course')

    const msg2 = generateRescueMessage('RECURRING_FAILURE', {
      studentName: 'كريم عادل',
    })
    assert(msg2.includes('كريم عادل') && msg2.includes('الغلط هو أول طريق الفهم'), 'RECURRING_FAILURE template contains positive motivational phrasing')

    const msg3 = generateRescueMessage('ABANDONED_FLOW', {
      studentName: 'سارة',
      courseTitle: 'النحو الشامل',
      examTitle: 'الاختبار التقييمي',
    })
    assert(msg3.includes('سارة') && msg3.includes('الاختبار التقييمي'), 'ABANDONED_FLOW template contains exam reminder')

    console.log('\n--- TEST 8: WhatsApp Dispatch in Sandbox Mock Mode ---')
    const case1 = await prisma.rescue_cases.findFirst({
      where: { student_id: student1.id, trigger_type: 'PURCHASED_INACTIVE' },
    })
    assert(!!case1, 'Found rescue case 1 in database')

    const dispatchResult1 = await dispatchRescueWhatsApp(case1.id, { sandbox: true })
    assert(dispatchResult1.success === true, 'dispatchRescueWhatsApp returned success: true in sandbox mode')
    assert(dispatchResult1.sandbox === true, 'dispatchRescueWhatsApp indicated sandbox: true')
    assert(!!dispatchResult1.messageId, `Mock messageId generated: ${dispatchResult1.messageId}`)

    // Verify outbox log in whatsapp_messages
    const loggedMsg = await prisma.whatsapp_messages.findFirst({
      where: { student_id: student1.id, to_phone: '201012345671' },
    })
    assert(!!loggedMsg, 'Message was recorded in whatsapp_messages outbox')
    assert(loggedMsg?.status === 'sent', 'whatsapp_messages status set to "sent"')
    assert(loggedMsg?.template === 'custom', 'whatsapp_messages template set to "custom"')

    // Verify rescue_cases status transition to 'contacted'
    const updatedCase1 = await prisma.rescue_cases.findUnique({
      where: { id: case1.id },
    })
    assert(updatedCase1?.status === 'contacted', 'Case status updated to "contacted"')
    assert(!!updatedCase1?.last_contacted_at, 'Case last_contacted_at populated with current timestamp')

    console.log('\n--- TEST 9: 72-Hour WhatsApp Cooldown Enforcement ---')
    const dispatchResult2 = await dispatchRescueWhatsApp(case1.id, { sandbox: true })
    assert(dispatchResult2.success === false, 'Immediate 2nd WhatsApp dispatch was REJECTED')
    assert(dispatchResult2.cooldownBlocked === true, 'cooldownBlocked flag is true')
    assert(dispatchResult2.remainingHours > 0, `Remaining cooldown hours reported: ${dispatchResult2.remainingHours}h`)

    // Verify checkStudentCooldown directly
    const cooldownCheck = await checkStudentCooldown(student1.id)
    assert(cooldownCheck.cooldownActive === true, 'checkStudentCooldown confirms active cooldown')
    assert(cooldownCheck.allowed === false, 'checkStudentCooldown allowed = false')

    console.log('\n--- TEST 10: Force Override Dispatch Bypass ---')
    const forceDispatchResult = await dispatchRescueWhatsApp(case1.id, {
      sandbox: true,
      force: true,
      customText: 'رسالة إدارية عاجلة ومباشرة',
    })
    assert(forceDispatchResult.success === true, 'Dispatch with force: true successfully bypassed cooldown')

    console.log('\n--- TEST 11: Case Lifecycle Transitions & Resolution Persistence ---')
    // Transition to in_progress
    const inProgressRes = await updateRescueCaseStatus(
      case1.id,
      'in_progress',
      'جاري متابعة الطالب من قِبل مسؤول الدعم'
    )
    assert(inProgressRes.success === true, 'updateRescueCaseStatus transitioned to "in_progress"')
    assert(inProgressRes.case?.status === 'in_progress', 'Case status verified as "in_progress"')

    // Transition to resolved
    const resolvedRes = await updateRescueCaseStatus(
      case1.id,
      'resolved',
      'قام الطالب بمشاهدة 3 دروس وحل الواجب بنجاح'
    )
    assert(resolvedRes.success === true, 'updateRescueCaseStatus transitioned to "resolved"')
    assert(resolvedRes.case?.status === 'resolved', 'Case status verified as "resolved"')
    assert(!!resolvedRes.case?.resolved_at, 'resolved_at timestamp populated on resolution')
    assert(resolvedRes.case?.resolution_notes?.includes('3 دروس'), 'Resolution notes accurately persisted')

    console.log('\n--- TEST 12: Admin Dashboard Query & Aggregated Stats ---')
    const caseList = await getRescueCases({
      status: 'all',
      search: 'أحمد محمود',
    })
    assert(caseList.cases.length >= 1, 'getRescueCases returned filtered list matching student search')
    assert(caseList.cases[0].studentName === 'أحمد محمود التائه', 'getRescueCases returned populated student relations')
    assert(caseList.cases[0].cooldownActive === true, 'getRescueCases computed dynamic cooldownActive state')

    const stats = await getRescueStats()
    assert(typeof stats.totalOpen === 'number', 'getRescueStats returned numeric totalOpen count')
    assert(typeof stats.resolvedCount === 'number', 'getRescueStats returned numeric resolvedCount')
    assert(typeof stats.highCount === 'number', 'getRescueStats returned numeric highCount')

  } finally {
    // -------------------------------------------------------------------------
    // Clean up test data
    // -------------------------------------------------------------------------
    console.log('\n--- TEARDOWN: Cleaning up test fixtures ---')
    try {
      if (createdStudentIds.length > 0) {
        await prisma.whatsapp_messages.deleteMany({
          where: { student_id: { in: createdStudentIds } },
        })
        await prisma.rescue_cases.deleteMany({
          where: { student_id: { in: createdStudentIds } },
        })
        await prisma.lesson_watch_progress.deleteMany({
          where: { student_id: { in: createdStudentIds } },
        })
        await prisma.exam_submissions.deleteMany({
          where: { student_id: { in: createdStudentIds } },
        })
        await prisma.enrollments.deleteMany({
          where: { student_id: { in: createdStudentIds } },
        })
        if (createdOrderIds.length > 0) {
          await prisma.order_items.deleteMany({
            where: { order_id: { in: createdOrderIds } },
          })
          await prisma.orders.deleteMany({
            where: { id: { in: createdOrderIds } },
          })
        }
        await prisma.students.deleteMany({
          where: { id: { in: createdStudentIds } },
        })
      }
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        })
      }
      if (createdExamIds.length > 0) {
        await prisma.exams.deleteMany({
          where: { id: { in: createdExamIds } },
        })
      }
      if (createdLectureIds.length > 0) {
        await prisma.lessons.deleteMany({
          where: { lecture_id: { in: createdLectureIds } },
        })
        await prisma.lectures.deleteMany({
          where: { id: { in: createdLectureIds } },
        })
      }
      if (createdBranchIds.length > 0) {
        await prisma.branches.deleteMany({
          where: { id: { in: createdBranchIds } },
        })
      }
      if (createdStageIds.length > 0) {
        await prisma.stages.deleteMany({
          where: { id: { in: createdStageIds } },
        })
      }
      console.log('  [PASS] Test fixtures cleaned up successfully')
    } catch (err) {
      console.error('  [WARN] Error during teardown:', err.message)
    }
  }

  console.log('\n================================================================')
  console.log(`   RESCUE SYSTEM RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal test execution error:', err)
  process.exit(1)
})
