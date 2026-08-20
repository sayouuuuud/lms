// scripts/test_mastery_map.mjs
// Comprehensive Standalone Verification Suite for Milestone 2: Taxonomy & Mastery Engine

import { PrismaClient } from '@prisma/client'
import {
  getBranchTaxonomyTree,
  saveDomain,
  saveTopic,
  saveSkill,
  deleteDomain,
  linkLessonSkills,
  linkQuestionSkills,
  getLessonSkills,
  getQuestionSkills,
} from '../lib/taxonomy.ts'
import {
  calculateStudentSkillMastery,
  processExamSubmission,
  processLessonProgress,
  getStudentMasteryMap,
  computeMasteryMath,
} from '../lib/mastery.ts'

const prisma = new PrismaClient()

// Test assertion helper
let testsPassed = 0
let testsFailed = 0

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`)
    testsPassed++
  } else {
    console.error(`  [FAIL] ${testName}${details ? ' - ' + details : ''}`)
    testsFailed++
  }
}

function assertApprox(actual, expected, tolerance, testName) {
  const diff = Math.abs(actual - expected)
  const pass = diff <= tolerance
  assert(pass, testName, `Expected ≈ ${expected}, got ${actual} (diff: ${diff.toFixed(4)})`)
}

async function runTestSuite() {
  console.log('==============================================================================')
  console.log('🚀 STARTING COMPREHENSIVE VERIFICATION: TAXONOMY & MASTERY ENGINE (M2)')
  console.log('==============================================================================\n')

  const uniqueSuffix = `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  let stageId = null
  let branchId = null
  let studentId = null
  let lectureId = null
  let lesson1Id = null
  let lesson2Id = null
  let exam1Id = null
  let exam2Id = null
  let domainId = null
  let topic1Id = null
  let topic2Id = null
  let skill1Id = null
  let skill2Id = null
  let skill3Id = null
  let eq1Id = null
  let eq2Id = null
  let eq3Id = null
  let qbqId = null

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // 1. Pure Mathematical Engine Unit Tests
    // ──────────────────────────────────────────────────────────────────────────
    console.log('--- 1. Pure Mathematical Engine Unit Verification ---')

    // Test Ps calculation with recency decay and difficulty
    const testNow = new Date('2026-08-20T12:00:00Z')
    const pureMath1 = computeMasteryMath({
      attempts: [
        {
          id: 'a1',
          awardedPoints: 1,
          maxPoints: 1,
          isCorrect: true,
          difficulty: 'hard', // weight 1.3
          weight: 1.0,
          createdAt: new Date('2026-08-20T12:00:00Z'), // 0 days elapsed
        },
        {
          id: 'a2',
          awardedPoints: 0,
          maxPoints: 1,
          isCorrect: false,
          difficulty: 'easy', // weight 0.8
          weight: 1.0,
          createdAt: new Date('2026-07-21T12:00:00Z'), // 30 days elapsed => decay = 0.5
        },
      ],
      lessonCompletionRates: [100.0],
      now: testNow,
    })

    // Expected Ps: (1.3 * 1.0 * 1.0 + 0.8 * 0.5 * 0.0) / (1.3 * 1.0 + 0.8 * 0.5) * 100 = 1.3 / (1.3 + 0.4) * 100 = 1.3 / 1.7 * 100 ≈ 76.47
    assertApprox(pureMath1.assessmentPerformance, 76.47, 0.5, 'Ps time-decay and difficulty weighting calculation')
    // Consecutive errors: latest is correct => consecutiveErrors = 0, totalErrors = 1
    assert(pureMath1.consecutiveErrors === 0, 'Error streak is 0 when latest attempt is correct')
    assert(pureMath1.totalErrors === 1, 'Total errors count is 1')
    // Es penalty: min(50, 0 * 15 + min(20, 1 * 3)) = 3 => Es = 100 - 3 = 97
    assertApprox(pureMath1.errorStability, 97.0, 0.1, 'Es stability score with 1 historical error')
    // Cs: 100
    assertApprox(pureMath1.contentCompletionRate, 100.0, 0.1, 'Cs completion rate matches linked lessons')
    // Base Mastery Ms: 0.55 * 76.47 + 0.20 * 97 + 0.25 * 100 = 42.06 + 19.4 + 25 = 86.46
    assertApprox(pureMath1.baseMastery, 86.46, 0.5, 'Ms base composite mastery score formula')
    // Confidence kappa for k=2: 1 - e^(-2/4) = 1 - e^(-0.5) ≈ 0.3935
    assertApprox(pureMath1.confidenceScore, 0.3935, 0.01, 'Confidence score kappa for k=2')
    // FinalMastery: 0.3935 * 86.46 + (1 - 0.3935) * 50 ≈ 34.02 + 30.33 = 64.35
    assertApprox(pureMath1.finalMastery, 64.35, 0.6, 'Calibrated FinalMastery score with prior regression')
    assert(pureMath1.status === 'developing', 'Status is developing for calibrated score between 60 and 85')

    // Test error streak penalty leading to needs_review
    const pureMathStreak = computeMasteryMath({
      attempts: [
        {
          id: 'e1',
          awardedPoints: 0,
          maxPoints: 1,
          isCorrect: false,
          difficulty: 'medium',
          weight: 1.0,
          createdAt: new Date('2026-08-20T11:00:00Z'),
        },
        {
          id: 'e2',
          awardedPoints: 0,
          maxPoints: 1,
          isCorrect: false,
          difficulty: 'medium',
          weight: 1.0,
          createdAt: new Date('2026-08-20T10:00:00Z'),
        },
      ],
      lessonCompletionRates: [],
      now: testNow,
    })

    assert(pureMathStreak.consecutiveErrors === 2, 'Consecutive errors streak = 2')
    // Penalty: min(50, 2*15 + min(20, 2*3)) = min(50, 30 + 6) = 36 => Es = 64
    assertApprox(pureMathStreak.errorStability, 64.0, 0.1, 'Error stability dropped by streak penalty')
    assert(pureMathStreak.status === 'needs_review', 'Status flags needs_review when consecutive errors >= 2')

    console.log('\n--- 2. Database Fixture Creation & Taxonomy Setup ---')
    // ──────────────────────────────────────────────────────────────────────────
    // 2. Database Fixtures
    // ──────────────────────────────────────────────────────────────────────────

    // Create test Stage & Branch
    const stage = await prisma.stages.create({
      data: {
        slug: `stage_${uniqueSuffix}`,
        title: `مرحلة الاختبار ${uniqueSuffix}`,
        term_price: '500',
      },
    })
    stageId = stage.id

    const branch = await prisma.branches.create({
      data: {
        stage_id: stageId,
        slug: `branch_${uniqueSuffix}`,
        title: `رياضيات 3ث ${uniqueSuffix}`,
        description: 'فرع التفاضل والتكامل للاختبار',
      },
    })
    branchId = branch.id

    // Use existing student with user_id (auth.users requires explicit id in Supabase)
    // or create student without user_id and bypass lesson_watch_progress for mastery calc
    const existingStudentWithUser = await prisma.students.findFirst({
      where: { user_id: { not: null } },
    })
    const student = existingStudentWithUser ?? await prisma.students.create({
      data: {
        code: `STU_${uniqueSuffix}`,
        name: `طالب الاختبار ${uniqueSuffix}`,
        email: `student_${uniqueSuffix}@example.com`,
        phone: '01012345678',
        stage_id: stageId,
      },
    })
    // Track if we created this student (for cleanup)
    const createdStudent = !existingStudentWithUser
    studentId = student.id

    // Create Lecture & Lessons
    const lecture = await prisma.lectures.create({
      data: {
        branch_id: branchId,
        title: `محاضرة التفاضل ${uniqueSuffix}`,
        slug: `lecture-calc-${uniqueSuffix}`,
      },
    })
    lectureId = lecture.id

    const lesson1 = await prisma.lessons.create({
      data: {
        lecture_id: lectureId,
        slug: `lesson-1-${uniqueSuffix}`,
        title: 'شرح مشتقات الدوال المثلثية',
        duration: '45:00',
      },
    })
    lesson1Id = lesson1.id

    const lesson2 = await prisma.lessons.create({
      data: {
        lecture_id: lectureId,
        slug: `lesson-2-${uniqueSuffix}`,
        title: 'شرح قاعدة السلسلة وتطبيقاتها',
        duration: '30:00',
      },
    })
    lesson2Id = lesson2.id

    // Create Taxonomy Hierarchy: Domain -> Topics -> Skills
    const domainRes = await saveDomain({
      branchId,
      code: `DOM_CALC_${uniqueSuffix}`,
      title: 'الوحدة الأولى: التفاضل والتكامل',
      description: 'مفاهيم الاشتقاق والتكامل المتقدمة',
      sortOrder: 1,
    })
    assert(domainRes.success && !!domainRes.id, 'Domain created successfully')
    domainId = domainRes.id

    const topic1Res = await saveTopic({
      domainId,
      code: `TOP_RULES_${uniqueSuffix}`,
      title: 'قواعد الاشتقاق',
      description: 'قواعد الاشتقاق الأساسية والمثلثية',
      sortOrder: 1,
    })
    assert(topic1Res.success && !!topic1Res.id, 'Topic 1 created successfully')
    topic1Id = topic1Res.id

    const topic2Res = await saveTopic({
      domainId,
      code: `TOP_APPS_${uniqueSuffix}`,
      title: 'تطبيقات التفاضل',
      description: 'المعدلات الزمنية المرتبطة والقيم العظمى',
      sortOrder: 2,
    })
    assert(topic2Res.success && !!topic2Res.id, 'Topic 2 created successfully')
    topic2Id = topic2Res.id

    // Skill 1: Easy (Trig Derivatives)
    const skill1Res = await saveSkill({
      topicId: topic1Id,
      code: `SKL_TRIG_${uniqueSuffix}`,
      title: 'مشتقة الدوال المثلثية',
      description: 'اشتقاق جا، جتا، ظا ومقلوباتها',
      difficultyLevel: 'easy',
      importanceWeight: 1.0,
      sortOrder: 1,
    })
    assert(skill1Res.success && !!skill1Res.id, 'Skill 1 (Easy) created successfully')
    skill1Id = skill1Res.id

    // Skill 2: Medium (Chain Rule)
    const skill2Res = await saveSkill({
      topicId: topic1Id,
      code: `SKL_CHAIN_${uniqueSuffix}`,
      title: 'قاعدة السلسلة',
      description: 'تطبيق قاعدة السلسلة في الدوال المركبة',
      difficultyLevel: 'medium',
      importanceWeight: 1.2,
      sortOrder: 2,
    })
    assert(skill2Res.success && !!skill2Res.id, 'Skill 2 (Medium) created successfully')
    skill2Id = skill2Res.id

    // Skill 3: Hard (Related Rates)
    const skill3Res = await saveSkill({
      topicId: topic2Id,
      code: `SKL_RATES_${uniqueSuffix}`,
      title: 'معدلات التغير الزمنية',
      description: 'حل مسائل المعدلات الزمنية المرتبطة الهندسية',
      difficultyLevel: 'hard',
      importanceWeight: 1.5,
      sortOrder: 1,
    })
    assert(skill3Res.success && !!skill3Res.id, 'Skill 3 (Hard) created successfully')
    skill3Id = skill3Res.id

    // Verify Hierarchy Retrieval
    const tree = await getBranchTaxonomyTree(branchId)
    assert(tree.length === 1, 'Branch taxonomy tree contains 1 domain')
    assert(tree[0].topics.length === 2, 'Domain contains 2 topics')
    assert(tree[0].topics[0].skills.length === 2, 'Topic 1 contains 2 skills')
    assert(tree[0].topics[1].skills.length === 1, 'Topic 2 contains 1 skill')
    assert(tree[0].skillsCount === 3, 'Domain aggregated skillsCount equals 3')

    console.log('\n--- 3. Multi-Entity Skill Linking Verification ---')
    // ──────────────────────────────────────────────────────────────────────────
    // 3. Multi-Entity Skill Linking
    // ──────────────────────────────────────────────────────────────────────────

    // Link Lessons to Skills
    const linkLessonsRes = await linkLessonSkills(lesson1Id, [skill1Id, skill2Id], skill1Id)
    assert(linkLessonsRes.success, 'Lesson 1 linked to Skill 1 (primary) and Skill 2')

    const lessonSkills = await getLessonSkills(lesson1Id)
    assert(lessonSkills.length === 2, 'getLessonSkills returns 2 linked skills')
    assert(lessonSkills.find((s) => s.skillId === skill1Id)?.isPrimary === true, 'Skill 1 correctly marked as primary')
    assert(lessonSkills.find((s) => s.skillId === skill2Id)?.isPrimary === false, 'Skill 2 correctly marked as secondary')

    // Create Exam and Questions
    const exam1 = await prisma.exams.create({
      data: {
        code: `EXAM1_${uniqueSuffix}`,
        title: `امتحان التفاضل الشامل ${uniqueSuffix}`,
        course: 'تفاضل وتكامل',
        duration: 30,
        questions: 3,
        status: 'منشور',
        branch_id: branchId,
        stage_id: stageId,
      },
    })
    exam1Id = exam1.id

    const eq1 = await prisma.exam_questions.create({
      data: {
        exam_id: exam1Id,
        question_text: 'ما هي مشتقة د(س) = جا(٢س)؟',
        options: ['٢ جتا(٢س)', 'جتا(٢س)', '-٢ جتا(٢س)', '٢ جا(٢س)'],
        correct_answer: '٢ جتا(٢س)',
        points: 2,
        question_type: 'mcq',
      },
    })
    eq1Id = eq1.id

    const eq2 = await prisma.exam_questions.create({
      data: {
        exam_id: exam1Id,
        question_text: 'أوجد مشتقة ص = (٣س + ١)^٥',
        options: ['١٥(٣س + ١)^٤', '٥(٣س + ١)^٤', '٣(٣س + ١)^٤', '١٥(٣س + ١)^٥'],
        correct_answer: '١٥(٣س + ١)^٤',
        points: 3,
        question_type: 'mcq',
      },
    })
    eq2Id = eq2.id

    const eq3 = await prisma.exam_questions.create({
      data: {
        exam_id: exam1Id,
        question_text: 'يتمدد مكعب بانتظام بمعدل ٠.٢ سم/ث. أوجد معدل تغير الحجم عندما يكون طول حرفه ٥ سم.',
        options: ['١٥ سم٣/ث', '١٢ سم٣/ث', '٥٠ سم٣/ث', '٣٠ سم٣/ث'],
        correct_answer: '١٥ سم٣/ث',
        points: 5,
        question_type: 'mcq',
      },
    })
    eq3Id = eq3.id

    // Link Exam Questions to Skills
    await linkQuestionSkills(eq1Id, [{ skillId: skill1Id, weight: 1.0 }], 'exam')
    await linkQuestionSkills(eq2Id, [{ skillId: skill2Id, weight: 1.0 }], 'exam')
    await linkQuestionSkills(eq3Id, [{ skillId: skill3Id, weight: 1.0 }], 'exam')

    const q1Skills = await getQuestionSkills(eq1Id, 'exam')
    assert(q1Skills.length === 1 && q1Skills[0].skillId === skill1Id, 'Question 1 linked to Skill 1 with weight 1.0')

    console.log('\n--- 4. Mastery Progression: Initial State & Content Completion ---')
    // ──────────────────────────────────────────────────────────────────────────
    // 4. Initial State & Content Completion Impact
    // ──────────────────────────────────────────────────────────────────────────

    // Initial Mastery Map
    const initialMap = await getStudentMasteryMap(studentId, branchId)
    assert(initialMap.notStartedCount === 3, 'Initial state: all 3 skills are not_started')
    assert(initialMap.overallScore === 0, 'Initial overall score is 0.0')

    // Student watches Lesson 1 (100% watch progress)
    const progressRes = await processLessonProgress(studentId, lesson1Id, 100)
    assert(progressRes.updatedSkillsCount === 2, 'processLessonProgress updated 2 linked skills (Skill 1 and Skill 2)')

    // Verify Skill 1 Mastery after watching lesson
    const skill1AfterLesson = await prisma.student_skill_mastery.findUnique({
      where: { student_id_skill_id: { student_id: studentId, skill_id: skill1Id } },
    })
    assert(skill1AfterLesson !== null, 'Skill 1 mastery record exists in DB')
    assertApprox(skill1AfterLesson.content_completion_rate, 100.0, 0.1, 'Skill 1 content completion rate is 100.0%')
    assert(skill1AfterLesson.status === 'needs_review', 'Skill 1 status transitioned to needs_review (watched but score < 60)')

    console.log('\n--- 5. Exam Submission & Assessment Score Integration ($P_s$, $M_s$, $\\kappa$) ---')
    // ──────────────────────────────────────────────────────────────────────────
    // 5. Exam Submission Integration
    // ──────────────────────────────────────────────────────────────────────────

    // Student submits Exam 1:
    // Question 1 (Skill 1): CORRECT
    // Question 2 (Skill 2): CORRECT
    // Question 3 (Skill 3): WRONG
    const sub1 = await prisma.exam_submissions.create({
      data: {
        exam_id: exam1Id,
        student_id: studentId,
        score: 5,
        total: 10,
        status: 'راسب',
        grading_status: 'graded',
        auto_score: 5,
        manual_score: 0,
        exam_answers: {
          create: [
            {
              question_id: eq1Id,
              selected_option: '٢ جتا(٢س)',
              awarded_points: 2,
              is_correct: true,
              needs_manual: false,
            },
            {
              question_id: eq2Id,
              selected_option: '١٥(٣س + ١)^٤',
              awarded_points: 3,
              is_correct: true,
              needs_manual: false,
            },
            {
              question_id: eq3Id,
              selected_option: '٥٠ سم٣/ث', // wrong answer
              awarded_points: 0,
              is_correct: false,
              needs_manual: false,
            },
          ],
        },
      },
    })

    const submissionResult = await processExamSubmission(sub1.id)
    assert(submissionResult.updatedSkillsCount === 3, 'processExamSubmission recalculated all 3 affected skills')

    // Verify Skill 1 Mastery after 1 correct attempt & 100% completion:
    // Ps = 100, Es = 100, Cs = 100 => Ms = 100
    // k = 1 => kappa = 1 - e^(-1/4) ≈ 0.2212
    // FinalMastery = 0.2212 * 100 + (1 - 0.2212) * 50 ≈ 61.06
    const skill1AfterSub1 = submissionResult.masteryResults.find((s) => s.skillId === skill1Id)
    assert(skill1AfterSub1 !== undefined, 'Skill 1 result returned in masteryResults')
    assertApprox(skill1AfterSub1.assessmentPerformance, 100.0, 0.1, 'Skill 1 Ps = 100.0%')
    assertApprox(skill1AfterSub1.errorStability, 100.0, 0.1, 'Skill 1 Es = 100.0%')
    assertApprox(skill1AfterSub1.masteryScore, 61.06, 0.5, 'Skill 1 FinalMastery score calibrated ≈ 61.06')
    assert(skill1AfterSub1.status === 'developing', 'Skill 1 status is developing')

    // Verify Skill 3 Mastery after 1 wrong attempt:
    // Ps = 0, Cs = 0 (no lessons), Es: Penalty = 15 + 3 = 18 => Es = 82.0
    // Ms = 0.55(0) + 0.20(82) + 0.25(0) = 16.4
    // k = 1 => kappa ≈ 0.2212
    // FinalMastery = 0.2212 * 16.4 + 0.7788 * 50 ≈ 3.63 + 38.94 = 42.57
    const skill3AfterSub1 = submissionResult.masteryResults.find((s) => s.skillId === skill3Id)
    assert(skill3AfterSub1 !== undefined, 'Skill 3 result returned in masteryResults')
    assert(skill3AfterSub1.consecutiveErrors === 1, 'Skill 3 consecutiveErrors = 1')
    assert(skill3AfterSub1.status === 'needs_review', 'Skill 3 status is needs_review (< 60)')
    assertApprox(skill3AfterSub1.masteryScore, 42.57, 1.0, 'Skill 3 score calculated correctly for single failure')

    console.log('\n--- 6. Error Streak Penalty & Remediation State Verification ---')
    // ──────────────────────────────────────────────────────────────────────────
    // 6. Error Streak Penalty ($E_s$)
    // ──────────────────────────────────────────────────────────────────────────

    // Create second exam where student fails Skill 3 AGAIN (consecutiveErrors = 2)
    const exam2 = await prisma.exams.create({
      data: {
        code: `EXAM2_${uniqueSuffix}`,
        title: `اختبار المتابعة 2 ${uniqueSuffix}`,
        course: 'تفاضل وتكامل',
        duration: 15,
        questions: 1,
        status: 'منشور',
        branch_id: branchId,
        stage_id: stageId,
      },
    })
    exam2Id = exam2.id

    const eq3_2 = await prisma.exam_questions.create({
      data: {
        exam_id: exam2Id,
        question_text: 'مسألة أخرى على المعدلات الزمنية',
        options: ['أ', 'ب', 'ج', 'د'],
        correct_answer: 'أ',
        points: 5,
        question_type: 'mcq',
      },
    })

    await linkQuestionSkills(eq3_2.id, [{ skillId: skill3Id, weight: 1.0 }], 'exam')

    const sub2 = await prisma.exam_submissions.create({
      data: {
        exam_id: exam2Id,
        student_id: studentId,
        score: 0,
        total: 5,
        status: 'راسب',
        grading_status: 'graded',
        exam_answers: {
          create: [
            {
              question_id: eq3_2.id,
              selected_option: 'ب', // wrong answer
              awarded_points: 0,
              is_correct: false,
              needs_manual: false,
            },
          ],
        },
      },
    })

    const sub2Result = await processExamSubmission(sub2.id)
    const skill3AfterSub2 = sub2Result.masteryResults.find((s) => s.skillId === skill3Id)
    assert(skill3AfterSub2.consecutiveErrors === 2, 'Skill 3 consecutive error streak is now 2')
    // Penalty: min(50, 2*15 + 2*3) = 36 => Es = 64
    assertApprox(skill3AfterSub2.errorStability, 64.0, 0.1, 'Error stability dropped to 64.0 due to consecutive errors streak')
    assert(skill3AfterSub2.status === 'needs_review', 'Status strictly maintained as needs_review')

    console.log('\n--- 7. Achieving "Mastered" Status via Repeated Success ($k \\ge 3, \\kappa \\ge 0.6$) ---')
    // ──────────────────────────────────────────────────────────────────────────
    // 7. Mastering a Skill
    // ──────────────────────────────────────────────────────────────────────────

    // Simulate 5 additional correct attempts on Skill 1 to bring k = 6 and high confidence
    for (let i = 1; i <= 5; i++) {
      const extraExam = await prisma.exams.create({
        data: {
          code: `EXAM_P_${i}_${uniqueSuffix}`,
          title: `اختبار تعزيز ${i} ${uniqueSuffix}`,
          course: 'تفاضل وتكامل',
          duration: 10,
          questions: 1,
          status: 'منشور',
          branch_id: branchId,
        },
      })
      const extraQ = await prisma.exam_questions.create({
        data: {
          exam_id: extraExam.id,
          question_text: `سؤال إتقان ${i}`,
          options: ['صح', 'خطأ'],
          correct_answer: 'صح',
          points: 2,
        },
      })
      await linkQuestionSkills(extraQ.id, [{ skillId: skill1Id, weight: 1.0 }], 'exam')

      const extraSub = await prisma.exam_submissions.create({
        data: {
          exam_id: extraExam.id,
          student_id: studentId,
          score: 2,
          total: 2,
          status: 'ناجح',
          grading_status: 'graded',
          exam_answers: {
            create: [
              {
                question_id: extraQ.id,
                selected_option: 'صح',
                awarded_points: 2,
                is_correct: true,
              },
            ],
          },
        },
      })
      await processExamSubmission(extraSub.id)
    }

    const skill1Final = await calculateStudentSkillMastery(studentId, skill1Id)
    assert(skill1Final.totalAttempted === 6, 'Skill 1 total attempted = 6 attempts')
    assert(skill1Final.correctCount === 6, 'Skill 1 correct count = 6 (100% accuracy)')
    assertApprox(skill1Final.confidenceScore, 0.7769, 0.02, 'Confidence score kappa >= 0.60')
    assert(skill1Final.masteryScore >= 85.0, `Skill 1 mastery score >= 85 (got ${skill1Final.masteryScore})`)
    assert(skill1Final.status === 'mastered', 'Skill 1 achieved "mastered" status')

    console.log('\n--- 8. Student Mastery Map Hierarchy & Weakest Skills Query ---')
    // ──────────────────────────────────────────────────────────────────────────
    // 8. Student Mastery Map Output
    // ──────────────────────────────────────────────────────────────────────────

    const finalMasteryMap = await getStudentMasteryMap(studentId, branchId)
    assert(finalMasteryMap.totalSkillsCount === 3, 'Map totalSkillsCount = 3')
    assert(finalMasteryMap.masteredCount === 1, 'Map masteredCount = 1 (Skill 1)')
    assert(finalMasteryMap.needsReviewCount >= 1, 'Map needsReviewCount >= 1 (Skill 3)')
    assert(finalMasteryMap.weakestSkills.length > 0, 'Map weakestSkills populated')
    assert(finalMasteryMap.weakestSkills[0].skillId === skill3Id, 'Weakest skill correctly identified as Skill 3 (Related Rates)')
    assert(finalMasteryMap.masteredSkills.length === 1 && finalMasteryMap.masteredSkills[0].skillId === skill1Id, 'Mastered skills correctly contains Skill 1')
    assert(finalMasteryMap.domains.length === 1, 'Domain results present in map')
    assert(finalMasteryMap.domains[0].topics.length === 2, 'Topics present in domain')

    console.log('\n--- 9. History Audit Log Verification ---')
    // ──────────────────────────────────────────────────────────────────────────
    // 9. Audit History Log Verification
    // ──────────────────────────────────────────────────────────────────────────

    const historyLogs = await prisma.student_skill_history.findMany({
      where: { student_id: studentId, skill_id: skill1Id },
      orderBy: { created_at: 'desc' },
    })
    assert(historyLogs.length > 0, 'Audit history log records created for Skill 1')
    assert(historyLogs.some((h) => h.trigger_type === 'lesson_progress'), 'History log contains lesson_progress trigger')
    assert(historyLogs.some((h) => h.trigger_type === 'exam_submission'), 'History log contains exam_submission trigger')

    console.log('\n==============================================================================')
    console.log(`✅ VERIFICATION COMPLETE: ${testsPassed} passed, ${testsFailed} failed`)
    console.log('==============================================================================')

    if (testsFailed > 0) {
      process.exitCode = 1
    }
  } catch (error) {
    console.error('❌ UNCAUGHT ERROR IN TEST SUITE:', error)
    process.exitCode = 1
  } finally {
    // ──────────────────────────────────────────────────────────────────────────
    // Cleanup Fixtures
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Cleaning up test fixtures ---')
    try {
      if (branchId) {
        await prisma.branches.delete({ where: { id: branchId } }).catch(() => {})
      }
      if (stageId) {
        await prisma.stages.delete({ where: { id: stageId } }).catch(() => {})
      }
      if (studentId && typeof createdStudent !== 'undefined' && createdStudent) {
        await prisma.students.delete({ where: { id: studentId } }).catch(() => {})
      }
      // Cleanup test user created for student (if any were created)
      await prisma.user.deleteMany({
        where: { email: { startsWith: 'student_', endsWith: '@example.com' } }
      }).catch(() => {})
      console.log('Cleanup completed.')
    } catch (cleanupErr) {
      console.warn('Warning during cleanup:', cleanupErr)
    } finally {
      await prisma.$disconnect()
    }
  }
}

runTestSuite()
