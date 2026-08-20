import { prisma } from './prisma.ts'
import { logError } from './logger.ts'
import type { DifficultyLevel } from './taxonomy.ts'

export type MasteryStatus = 'not_started' | 'needs_review' | 'developing' | 'mastered'

export interface SkillMasteryResult {
  skillId: string
  skillTitle: string
  skillCode: string
  topicId: string
  topicTitle: string
  domainId: string
  domainTitle: string
  masteryScore: number
  baseMasteryScore: number
  status: MasteryStatus
  confidenceScore: number
  totalAttempted: number
  correctCount: number
  consecutiveErrors: number
  totalErrors: number
  contentCompletionRate: number
  assessmentPerformance: number
  errorStability: number
  lastAttemptAt: Date | null
  lastCorrectAt: Date | null
}

export interface StudentMasteryMapDTO {
  overallScore: number
  totalSkillsCount: number
  masteredCount: number
  developingCount: number
  needsReviewCount: number
  notStartedCount: number
  domains: {
    id: string
    code: string
    title: string
    score: number
    topics: {
      id: string
      code: string
      title: string
      score: number
      skills: SkillMasteryResult[]
    }[]
  }[]
  weakestSkills: SkillMasteryResult[]
  masteredSkills: SkillMasteryResult[]
}

// ─── Mathematical Constants ──────────────────────────────────────────────────
const WEIGHT_PERFORMANCE = 0.55
const WEIGHT_ERROR_STABILITY = 0.20
const WEIGHT_COMPLETION = 0.25

// Exponential decay half-life = 30 days => lambda = ln(2) / 30
const LAMBDA_DECAY = Math.LN2 / 30.0 // ~0.023104906

// Confidence calibration constant k0 = 4
const K0_CONFIDENCE = 4.0

// Difficulty multipliers
const DIFFICULTY_WEIGHTS: Record<string, number> = {
  easy: 0.8,
  medium: 1.0,
  hard: 1.3,
}

interface AttemptItem {
  id: string
  awardedPoints: number
  maxPoints: number
  isCorrect: boolean
  difficulty: string
  weight: number
  createdAt: Date
}

/**
 * Pure calculation helper for mastery math.
 * Computes Ps, Es, Cs, Ms, kappa, FinalMastery, and Status given attempt data and lesson completions.
 */
export function computeMasteryMath(params: {
  attempts: AttemptItem[]
  lessonCompletionRates: number[] // array of completion factors [0..100] for linked lessons
  now?: Date
}): {
  assessmentPerformance: number
  errorStability: number
  contentCompletionRate: number
  baseMastery: number
  confidenceScore: number
  finalMastery: number
  consecutiveErrors: number
  totalErrors: number
  correctCount: number
  totalAttempted: number
  status: MasteryStatus
} {
  const now = params.now || new Date()
  const attempts = [...params.attempts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const totalAttempted = attempts.length
  let correctCount = 0
  let totalErrors = 0
  let consecutiveErrors = 0
  let streakCounted = false

  for (const att of attempts) {
    if (att.isCorrect) {
      correctCount += 1
      if (!streakCounted) {
        streakCounted = true
      }
    } else {
      totalErrors += 1
      if (!streakCounted) {
        consecutiveErrors += 1
      }
    }
  }

  // 1. Assessment Performance (Ps) over last 10 attempts
  const recentAttempts = attempts.slice(0, 10)
  let weightedScoreSum = 0
  let weightSum = 0

  for (const att of recentAttempts) {
    const elapsedDays = Math.max(0, (now.getTime() - new Date(att.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    const diffMultiplier = DIFFICULTY_WEIGHTS[att.difficulty.toLowerCase()] ?? 1.0
    const timeDecay = Math.exp(-LAMBDA_DECAY * elapsedDays)
    const combinedWeight = timeDecay * diffMultiplier * (att.weight > 0 ? att.weight : 1.0)

    const scoreRatio = att.maxPoints > 0 ? Math.min(1.0, Math.max(0.0, att.awardedPoints / att.maxPoints)) : (att.isCorrect ? 1.0 : 0.0)

    weightedScoreSum += combinedWeight * scoreRatio
    weightSum += combinedWeight
  }

  const assessmentPerformance = weightSum > 0 ? (weightedScoreSum / weightSum) * 100.0 : 0.0

  // 2. Error Stability (Es)
  const errorPenalty = Math.min(50.0, (consecutiveErrors * 15.0) + Math.min(20.0, totalErrors * 3.0))
  const errorStability = Math.max(0.0, 100.0 - errorPenalty)

  // 3. Content Completion (Cs)
  let contentCompletionRate = 0.0
  if (params.lessonCompletionRates.length > 0) {
    const sum = params.lessonCompletionRates.reduce((acc, curr) => acc + curr, 0)
    contentCompletionRate = sum / params.lessonCompletionRates.length
  } else {
    // If no lessons linked to this skill, Cs = Ps
    contentCompletionRate = assessmentPerformance
  }

  // 4. Base Composite Mastery (Ms)
  const baseMastery =
    WEIGHT_PERFORMANCE * assessmentPerformance +
    WEIGHT_ERROR_STABILITY * errorStability +
    WEIGHT_COMPLETION * contentCompletionRate

  // 5. Confidence Calibration (kappa)
  const confidenceScore = 1.0 - Math.exp(-totalAttempted / K0_CONFIDENCE)
  const finalMastery = confidenceScore * baseMastery + (1.0 - confidenceScore) * 50.0

  // 6. Status Determination
  let status: MasteryStatus = 'developing'
  if (totalAttempted === 0 && (params.lessonCompletionRates.length === 0 || contentCompletionRate === 0)) {
    status = 'not_started'
  } else if (finalMastery < 60.0 || consecutiveErrors >= 2) {
    status = 'needs_review'
  } else if (finalMastery >= 85.0 && totalAttempted >= 3 && confidenceScore >= 0.6 && consecutiveErrors < 2) {
    status = 'mastered'
  } else {
    status = 'developing'
  }

  return {
    assessmentPerformance: Number(assessmentPerformance.toFixed(2)),
    errorStability: Number(errorStability.toFixed(2)),
    contentCompletionRate: Number(contentCompletionRate.toFixed(2)),
    baseMastery: Number(baseMastery.toFixed(2)),
    confidenceScore: Number(confidenceScore.toFixed(4)),
    finalMastery: Number(finalMastery.toFixed(2)),
    consecutiveErrors,
    totalErrors,
    correctCount,
    totalAttempted,
    status,
  }
}

/**
 * Calculate and persist the mastery state of a specific skill for a student.
 */
export async function calculateStudentSkillMastery(
  studentId: string,
  skillId: string,
  options?: { triggerType?: string; triggerId?: string }
): Promise<SkillMasteryResult> {
  try {
    // 1. Fetch skill with topic & domain metadata
    const skill = await prisma.taxonomy_skills.findUnique({
      where: { id: skillId },
      include: {
        topic: {
          include: {
            domains: true,
          },
        },
        lesson_skills: {
          select: { lesson_id: true, is_primary: true },
        },
      },
    })

    if (!skill) {
      throw new Error(`Skill with ID ${skillId} not found`)
    }

    // 2. Query student attempts linked to this skill via exam_question_skills or question_bank_question_skills
    // A) Direct exam questions linked to skill
    const directExamAnswers = await prisma.exam_answers.findMany({
      where: {
        exam_submissions: {
          student_id: studentId,
        },
        exam_questions: {
          exam_question_skills: {
            some: { skill_id: skillId },
          },
        },
      },
      select: {
        id: true,
        awarded_points: true,
        is_correct: true,
        created_at: true,
        exam_questions: {
          select: {
            points: true,
            exam_question_skills: {
              where: { skill_id: skillId },
              select: { weight: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    // B) Exam questions linked to question bank questions that are linked to skill
    const bankExamAnswers = await prisma.exam_answers.findMany({
      where: {
        exam_submissions: {
          student_id: studentId,
        },
        exam_questions: {
          exam_question_skills: {
            none: { skill_id: skillId }, // avoid double counting if already linked directly
          },
          question_bank_questions: {
            question_skills: {
              some: { skill_id: skillId },
            },
          },
        },
      },
      select: {
        id: true,
        awarded_points: true,
        is_correct: true,
        created_at: true,
        exam_questions: {
          select: {
            points: true,
            question_bank_questions: {
              select: {
                difficulty: true,
                question_skills: {
                  where: { skill_id: skillId },
                  select: { weight: true },
                },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    // Unify attempts
    const attempts: AttemptItem[] = []

    for (const ans of directExamAnswers) {
      const eq = ans.exam_questions
      const weight = eq.exam_question_skills[0]?.weight ?? 1.0
      const isCorrect = ans.is_correct === true || (ans.awarded_points > 0 && ans.awarded_points >= (eq.points || 1))
      attempts.push({
        id: ans.id,
        awardedPoints: ans.awarded_points,
        maxPoints: eq.points || 1,
        isCorrect,
        difficulty: skill.difficulty_level || 'medium',
        weight,
        createdAt: ans.created_at,
      })
    }

    for (const ans of bankExamAnswers) {
      const eq = ans.exam_questions
      const qbq = eq.question_bank_questions
      const weight = qbq?.question_skills[0]?.weight ?? 1.0
      const difficulty = qbq?.difficulty || skill.difficulty_level || 'medium'
      const isCorrect = ans.is_correct === true || (ans.awarded_points > 0 && ans.awarded_points >= (eq.points || 1))
      attempts.push({
        id: ans.id,
        awardedPoints: ans.awarded_points,
        maxPoints: eq.points || 1,
        isCorrect,
        difficulty,
        weight,
        createdAt: ans.created_at,
      })
    }

    // 3. Query lesson progress for linked lessons
    const linkedLessonIds = skill.lesson_skills.map((ls) => ls.lesson_id)
    const lessonCompletionRates: number[] = []

    if (linkedLessonIds.length > 0) {
      // Find student user_id
      const student = await prisma.students.findUnique({
        where: { id: studentId },
        select: { user_id: true },
      })

      const watchProgressList = await prisma.lesson_watch_progress.findMany({
        where: {
          lesson_id: { in: linkedLessonIds },
          OR: [
            { student_id: studentId },
            ...(student?.user_id ? [{ user_id: student.user_id }] : []),
          ],
        },
      })

      const progressByLesson = new Map<string, number>()
      for (const wp of watchProgressList) {
        const current = progressByLesson.get(wp.lesson_id) ?? 0
        progressByLesson.set(wp.lesson_id, Math.max(current, wp.max_percent || 0))
      }

      for (const lId of linkedLessonIds) {
        const maxPercent = progressByLesson.get(lId) ?? 0
        // Min(1.0, watched_percent / 85) * 100
        const completionFactor = Math.min(1.0, maxPercent / 85.0) * 100.0
        lessonCompletionRates.push(completionFactor)
      }
    }

    // 4. Compute mathematical scores
    const mathResult = computeMasteryMath({
      attempts,
      lessonCompletionRates,
    })

    const latestAttempt = attempts.length > 0
      ? attempts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      : null

    const latestCorrectAttempt = attempts.filter((a) => a.isCorrect).length > 0
      ? attempts.filter((a) => a.isCorrect).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      : null

    // 5. Fetch existing mastery to get previous score for history log
    const existingMastery = await prisma.student_skill_mastery.findUnique({
      where: {
        student_id_skill_id: {
          student_id: studentId,
          skill_id: skillId,
        },
      },
    })

    const previousScore = existingMastery ? existingMastery.mastery_score : 0.0
    const historyLog = Array.isArray(existingMastery?.history_log)
      ? [...(existingMastery.history_log as any[])]
      : []

    historyLog.push({
      timestamp: new Date().toISOString(),
      score: mathResult.finalMastery,
      status: mathResult.status,
      trigger: options?.triggerType || 'recalculation',
      triggerId: options?.triggerId || null,
    })

    // Trim history log to last 50 events
    if (historyLog.length > 50) {
      historyLog.splice(0, historyLog.length - 50)
    }

    // 6. Upsert student_skill_mastery
    await prisma.student_skill_mastery.upsert({
      where: {
        student_id_skill_id: {
          student_id: studentId,
          skill_id: skillId,
        },
      },
      create: {
        student_id: studentId,
        skill_id: skillId,
        mastery_score: mathResult.finalMastery,
        status: mathResult.status,
        confidence_score: mathResult.confidenceScore,
        total_questions_attempted: mathResult.totalAttempted,
        correct_answers_count: mathResult.correctCount,
        consecutive_errors: mathResult.consecutiveErrors,
        total_error_repetition: mathResult.totalErrors,
        content_completion_rate: mathResult.contentCompletionRate,
        last_attempt_at: latestAttempt ? latestAttempt.createdAt : null,
        last_correct_at: latestCorrectAttempt ? latestCorrectAttempt.createdAt : null,
        history_log: historyLog,
      },
      update: {
        mastery_score: mathResult.finalMastery,
        status: mathResult.status,
        confidence_score: mathResult.confidenceScore,
        total_questions_attempted: mathResult.totalAttempted,
        correct_answers_count: mathResult.correctCount,
        consecutive_errors: mathResult.consecutiveErrors,
        total_error_repetition: mathResult.totalErrors,
        content_completion_rate: mathResult.contentCompletionRate,
        last_attempt_at: latestAttempt ? latestAttempt.createdAt : null,
        last_correct_at: latestCorrectAttempt ? latestCorrectAttempt.createdAt : null,
        history_log: historyLog,
        updated_at: new Date(),
      },
    })

    // 7. Insert audit record in student_skill_history
    if (options?.triggerType) {
      await prisma.student_skill_history.create({
        data: {
          student_id: studentId,
          skill_id: skillId,
          previous_score: previousScore,
          new_score: mathResult.finalMastery,
          trigger_type: options.triggerType,
          trigger_id: options.triggerId || null,
          metadata: {
            assessmentPerformance: mathResult.assessmentPerformance,
            errorStability: mathResult.errorStability,
            contentCompletionRate: mathResult.contentCompletionRate,
            baseMastery: mathResult.baseMastery,
            confidenceScore: mathResult.confidenceScore,
            status: mathResult.status,
          },
        },
      })
    }

    return {
      skillId: skill.id,
      skillTitle: skill.title,
      skillCode: skill.code,
      topicId: skill.topic.id,
      topicTitle: skill.topic.title,
      domainId: skill.topic.domains.id,
      domainTitle: skill.topic.domains.title,
      masteryScore: mathResult.finalMastery,
      baseMasteryScore: mathResult.baseMastery,
      status: mathResult.status,
      confidenceScore: mathResult.confidenceScore,
      totalAttempted: mathResult.totalAttempted,
      correctCount: mathResult.correctCount,
      consecutiveErrors: mathResult.consecutiveErrors,
      totalErrors: mathResult.totalErrors,
      contentCompletionRate: mathResult.contentCompletionRate,
      assessmentPerformance: mathResult.assessmentPerformance,
      errorStability: mathResult.errorStability,
      lastAttemptAt: latestAttempt ? latestAttempt.createdAt : null,
      lastCorrectAt: latestCorrectAttempt ? latestCorrectAttempt.createdAt : null,
    }
  } catch (error: any) {
    logError('calculateStudentSkillMastery', error)
    throw error
  }
}

/**
 * Recalculate mastery for all skills affected by an exam submission.
 */
export async function processExamSubmission(
  submissionId: string
): Promise<{ updatedSkillsCount: number; masteryResults: SkillMasteryResult[] }> {
  try {
    const submission = await prisma.exam_submissions.findUnique({
      where: { id: submissionId },
      include: {
        exam_answers: {
          include: {
            exam_questions: {
              include: {
                exam_question_skills: { select: { skill_id: true } },
                question_bank_questions: {
                  include: {
                    question_skills: { select: { skill_id: true } },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!submission) {
      throw new Error(`Submission with ID ${submissionId} not found`)
    }

    const studentId = submission.student_id
    const affectedSkillIds = new Set<string>()

    for (const ans of submission.exam_answers) {
      const eq = ans.exam_questions
      if (eq.exam_question_skills && eq.exam_question_skills.length > 0) {
        for (const eqs of eq.exam_question_skills) {
          affectedSkillIds.add(eqs.skill_id)
        }
      } else if (eq.question_bank_questions?.question_skills) {
        for (const qbs of eq.question_bank_questions.question_skills) {
          affectedSkillIds.add(qbs.skill_id)
        }
      }
    }

    const masteryResults: SkillMasteryResult[] = []

    for (const skillId of affectedSkillIds) {
      const result = await calculateStudentSkillMastery(studentId, skillId, {
        triggerType: 'exam_submission',
        triggerId: submissionId,
      })
      masteryResults.push(result)
    }

    return {
      updatedSkillsCount: masteryResults.length,
      masteryResults,
    }
  } catch (error: any) {
    logError('processExamSubmission', error)
    return { updatedSkillsCount: 0, masteryResults: [] }
  }
}

/**
 * Handle student video watch progress and update content completion for linked skills.
 */
export async function processLessonProgress(
  studentId: string,
  lessonId: string,
  watchPercent: number
): Promise<{ updatedSkillsCount: number; masteryResults: SkillMasteryResult[] }> {
  try {
    // 1. Ensure lesson_watch_progress is updated
    const student = await prisma.students.findUnique({
      where: { id: studentId },
      select: { user_id: true },
    })

    const lesson = await prisma.lessons.findUnique({
      where: { id: lessonId },
      select: { lecture_id: true },
    })

    if (student && lesson) {
      const userId = student.user_id || studentId
      const lectureId = lesson.lecture_id

      const existingLwp = await prisma.lesson_watch_progress.findUnique({
        where: {
          user_id_lesson_id: {
            user_id: userId,
            lesson_id: lessonId,
          },
        },
      })

      const newMax = Math.max(existingLwp?.max_percent || 0, Math.round(watchPercent))

      await prisma.lesson_watch_progress.upsert({
        where: {
          user_id_lesson_id: {
            user_id: userId,
            lesson_id: lessonId,
          },
        },
        create: {
          user_id: userId,
          student_id: studentId,
          lesson_id: lessonId,
          lecture_id: lectureId,
          max_percent: newMax,
          completed: newMax >= 85,
          last_viewed_at: new Date(),
        },
        update: {
          student_id: studentId,
          max_percent: newMax,
          completed: newMax >= 85,
          last_viewed_at: new Date(),
        },
      })
    }

    // 2. Find skills linked to this lesson
    const linkedSkills = await prisma.lesson_skills.findMany({
      where: { lesson_id: lessonId },
      select: { skill_id: true },
    })

    const masteryResults: SkillMasteryResult[] = []

    for (const ls of linkedSkills) {
      const res = await calculateStudentSkillMastery(studentId, ls.skill_id, {
        triggerType: 'lesson_progress',
        triggerId: lessonId,
      })
      masteryResults.push(res)
    }

    return {
      updatedSkillsCount: masteryResults.length,
      masteryResults,
    }
  } catch (error: any) {
    logError('processLessonProgress', error)
    return { updatedSkillsCount: 0, masteryResults: [] }
  }
}

/**
 * Retrieve the full mastery map for a student, optionally filtered by branch.
 * Returns domain scores, topic scores, skill details, weakest skills, and mastered skills.
 */
export async function getStudentMasteryMap(
  studentId: string,
  branchId?: string
): Promise<StudentMasteryMapDTO> {
  try {
    // 1. Fetch domain hierarchy
    const domains = await prisma.taxonomy_domains.findMany({
      where: branchId ? { branch_id: branchId } : undefined,
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
      include: {
        topics: {
          orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
          include: {
            skills: {
              where: { parent_skill_id: null },
              orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
              include: {
                sub_skills: {
                  orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
                },
              },
            },
          },
        },
      },
    })

    // 2. Collect all skill IDs across tree
    const allSkillIds: string[] = []
    for (const d of domains) {
      for (const t of d.topics) {
        for (const s of t.skills) {
          allSkillIds.push(s.id)
          if (s.sub_skills) {
            for (const sub of s.sub_skills) {
              allSkillIds.push(sub.id)
            }
          }
        }
      }
    }

    // 3. Fetch existing mastery records in batch
    const masteryRecords = await prisma.student_skill_mastery.findMany({
      where: {
        student_id: studentId,
        skill_id: { in: allSkillIds },
      },
    })

    const masteryMap = new Map(masteryRecords.map((m) => [m.skill_id, m]))

    let totalMasterySum = 0
    let totalSkillsCount = 0
    let masteredCount = 0
    let developingCount = 0
    let needsReviewCount = 0
    let notStartedCount = 0

    const allCalculatedSkills: SkillMasteryResult[] = []

    const domainResults = domains.map((domain) => {
      let domainScoreSum = 0
      let domainTopicCount = 0

      const topicResults = domain.topics.map((topic) => {
        let topicScoreSum = 0
        let topicSkillCount = 0

        const skillList: SkillMasteryResult[] = []

        const processSkill = (skill: any) => {
          topicSkillCount += 1
          totalSkillsCount += 1

          const record = masteryMap.get(skill.id)
          let result: SkillMasteryResult

          if (record) {
            result = {
              skillId: skill.id,
              skillTitle: skill.title,
              skillCode: skill.code,
              topicId: topic.id,
              topicTitle: topic.title,
              domainId: domain.id,
              domainTitle: domain.title,
              masteryScore: record.mastery_score,
              baseMasteryScore: record.mastery_score,
              status: (record.status as MasteryStatus) || 'not_started',
              confidenceScore: record.confidence_score,
              totalAttempted: record.total_questions_attempted,
              correctCount: record.correct_answers_count,
              consecutiveErrors: record.consecutive_errors,
              totalErrors: record.total_error_repetition,
              contentCompletionRate: record.content_completion_rate,
              assessmentPerformance: record.total_questions_attempted > 0 ? (record.correct_answers_count / record.total_questions_attempted) * 100 : 0,
              errorStability: Math.max(0, 100 - record.consecutive_errors * 15),
              lastAttemptAt: record.last_attempt_at,
              lastCorrectAt: record.last_correct_at,
            }
          } else {
            result = {
              skillId: skill.id,
              skillTitle: skill.title,
              skillCode: skill.code,
              topicId: topic.id,
              topicTitle: topic.title,
              domainId: domain.id,
              domainTitle: domain.title,
              masteryScore: 0.0,
              baseMasteryScore: 0.0,
              status: 'not_started',
              confidenceScore: 0.0,
              totalAttempted: 0,
              correctCount: 0,
              consecutiveErrors: 0,
              totalErrors: 0,
              contentCompletionRate: 0.0,
              assessmentPerformance: 0.0,
              errorStability: 100.0,
              lastAttemptAt: null,
              lastCorrectAt: null,
            }
          }

          topicScoreSum += result.masteryScore
          skillList.push(result)
          allCalculatedSkills.push(result)

          if (result.status === 'mastered') masteredCount += 1
          else if (result.status === 'needs_review') needsReviewCount += 1
          else if (result.status === 'developing') developingCount += 1
          else notStartedCount += 1
        }

        for (const skill of topic.skills) {
          processSkill(skill)
          if (skill.sub_skills) {
            for (const sub of skill.sub_skills) {
              processSkill(sub)
            }
          }
        }

        const topicAvg = topicSkillCount > 0 ? topicScoreSum / topicSkillCount : 0.0
        domainScoreSum += topicAvg
        domainTopicCount += 1

        return {
          id: topic.id,
          code: topic.code,
          title: topic.title,
          score: Number(topicAvg.toFixed(2)),
          skills: skillList,
        }
      })

      const domainAvg = domainTopicCount > 0 ? domainScoreSum / domainTopicCount : 0.0
      totalMasterySum += domainAvg

      return {
        id: domain.id,
        code: domain.code,
        title: domain.title,
        score: Number(domainAvg.toFixed(2)),
        topics: topicResults,
      }
    })

    const overallScore = domains.length > 0 ? Number((totalMasterySum / domains.length).toFixed(2)) : 0.0

    // Identify weakest skills (needs_review or lowest mastery score with attempts)
    const weakestSkills = [...allCalculatedSkills]
      .filter((s) => s.status !== 'not_started')
      .sort((a, b) => {
        // Prioritize needs_review
        if (a.status === 'needs_review' && b.status !== 'needs_review') return -1
        if (b.status === 'needs_review' && a.status !== 'needs_review') return 1
        return a.masteryScore - b.masteryScore
      })
      .slice(0, 5)

    // Identify mastered skills (highest mastery score)
    const masteredSkills = [...allCalculatedSkills]
      .filter((s) => s.status === 'mastered')
      .sort((a, b) => b.masteryScore - a.masteryScore)
      .slice(0, 5)

    return {
      overallScore,
      totalSkillsCount,
      masteredCount,
      developingCount,
      needsReviewCount,
      notStartedCount,
      domains: domainResults,
      weakestSkills,
      masteredSkills,
    }
  } catch (error) {
    logError('getStudentMasteryMap', error)
    return {
      overallScore: 0,
      totalSkillsCount: 0,
      masteredCount: 0,
      developingCount: 0,
      needsReviewCount: 0,
      notStartedCount: 0,
      domains: [],
      weakestSkills: [],
      masteredSkills: [],
    }
  }
}
