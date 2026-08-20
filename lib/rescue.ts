import { prisma } from './prisma.ts'
import { checkStudentCooldown } from './rescue-notifier.ts'

export type RescueTriggerType =
  | 'PURCHASED_INACTIVE'
  | 'RECURRING_FAILURE'
  | 'ABANDONED_FLOW'
  | 'INACTIVE_STUDENT'
  | 'MANUAL'

export type RescuePriority = 'urgent' | 'high' | 'medium' | 'low'
export type RescueStatus = 'open' | 'contacted' | 'in_progress' | 'resolved' | 'dismissed'

export interface RiskEvaluationResult {
  triggerType: RescueTriggerType
  priority: RescuePriority
  riskScore: number
  details: Record<string, any>
  suggestedAction: string
}

export interface RescueCaseDTO {
  id: string
  studentId: string
  studentCode: string
  studentName: string
  studentPhone: string
  studentEmail: string
  triggerType: RescueTriggerType
  priority: RescuePriority
  status: RescueStatus
  riskScore: number
  details: Record<string, any>
  suggestedAction: string
  assignedTo?: string | null
  lastContactedAt?: string | null
  resolvedAt?: string | null
  resolutionNotes?: string | null
  createdAt: string
  updatedAt: string
  cooldownActive?: boolean
  cooldownRemainingHours?: number
}

export interface RescueFilters {
  status?: RescueStatus | 'all'
  triggerType?: RescueTriggerType | 'all'
  priority?: RescuePriority | 'all'
  search?: string
  page?: number
  pageSize?: number
}

export interface RescueStats {
  totalOpen: number
  urgentCount: number
  highCount: number
  contactedCount: number
  resolvedCount: number
  dismissedCount: number
  totalCases: number
}

/**
 * Evaluates at-risk status for a specific student across the 4 core detection rules:
 * 1. PURCHASED_INACTIVE: Approved order >= 3 days ago with 0 watch progress on lessons. (Score: 80, Priority: high)
 * 2. RECURRING_FAILURE: >= 2 failed exams in the last 30 days (Score: 85, Priority: high)
 * 3. ABANDONED_FLOW: Completed >= 80% lessons in lecture >= 3 days ago but 0 exam submissions (Score: 70, Priority: medium)
 * 4. INACTIVE_STUDENT: Enrolled/purchased with no presence / activity for >= 14 days (Score: 65, Priority: medium)
 */
export async function evaluateStudentRisk(studentId: string): Promise<RiskEvaluationResult[]> {
  const student = await prisma.students.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      user_id: true,
      code: true,
      name: true,
      phone: true,
      email: true,
      status: true,
      last_seen_at: true,
      created_at: true,
    },
  })

  if (!student) return []

  const detectedRisks: RiskEvaluationResult[] = []
  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const userIds = [student.user_id, student.id].filter(Boolean) as string[]

  // ---------------------------------------------------------------------------
  // RULE 1: PURCHASED_INACTIVE
  // Student has approved order >= 3 days ago with 0 watch progress on course lessons.
  // ---------------------------------------------------------------------------
  const approvedOrders = await prisma.orders.findMany({
    where: {
      status: 'approved',
      created_at: { lte: threeDaysAgo },
      OR: [
        { student_id: { in: userIds } },
        ...(student.email ? [{ student_email: student.email }] : []),
        ...(student.phone ? [{ student_phone: student.phone }] : []),
      ],
    },
    include: {
      order_items: true,
    },
    orderBy: { created_at: 'asc' },
  })

  if (approvedOrders.length > 0) {
    const lectureIds = Array.from(
      new Set(
        approvedOrders
          .flatMap((o) => o.order_items.map((item) => item.lecture_id))
          .filter(Boolean) as string[]
      )
    )

    let totalWatchedSeconds = 0
    if (lectureIds.length > 0) {
      const watchRecords = await prisma.lesson_watch_progress.findMany({
        where: {
          lecture_id: { in: lectureIds },
          OR: [{ user_id: { in: userIds } }, { student_id: student.id }],
        },
        select: { watched_seconds: true, max_percent: true },
      })

      totalWatchedSeconds = watchRecords.reduce(
        (sum, r) => sum + (r.watched_seconds || (r.max_percent > 0 ? 1 : 0)),
        0
      )
    } else {
      // General check across any watch progress
      const anyWatch = await prisma.lesson_watch_progress.findFirst({
        where: {
          OR: [{ user_id: { in: userIds } }, { student_id: student.id }],
          watched_seconds: { gt: 0 },
        },
      })
      if (anyWatch) {
        totalWatchedSeconds = anyWatch.watched_seconds || 1
      }
    }

    if (totalWatchedSeconds === 0) {
      const oldestOrder = approvedOrders[0]
      const daysInactive = Math.max(
        3,
        Math.floor((now.getTime() - new Date(oldestOrder.created_at).getTime()) / (1000 * 60 * 60 * 24))
      )
      const firstItemTitle =
        oldestOrder.order_items?.[0]?.lecture_title ||
        oldestOrder.order_items?.[0]?.branch_title ||
        'المحتوى التعليمي'

      detectedRisks.push({
        triggerType: 'PURCHASED_INACTIVE',
        priority: 'high',
        riskScore: 80,
        details: {
          orderId: oldestOrder.id,
          orderCode: oldestOrder.code,
          courseTitle: firstItemTitle,
          daysInactive,
          orderDate: oldestOrder.created_at.toISOString(),
          approvedOrdersCount: approvedOrders.length,
        },
        suggestedAction: 'إرسال رسالة ترحيب وتشجيع لبدء مشاهدة أول درس في الكورس المشترى',
      })
    }
  }

  // ---------------------------------------------------------------------------
  // RULE 2: RECURRING_FAILURE
  // Student has >= 2 failed exams (status 'راسب' or score < 50%) in last 30 days.
  // ---------------------------------------------------------------------------
  const submissions = await prisma.exam_submissions.findMany({
    where: {
      student_id: student.id,
      submitted_at: { gte: thirtyDaysAgo },
    },
    include: {
      exams: {
        select: { id: true, title: true, pass_mark: true },
      },
    },
    orderBy: { submitted_at: 'desc' },
  })

  const failedSubmissions = submissions.filter((sub) => {
    const isFailStatus = sub.status === 'راسب'
    const isLowPercentage = sub.total > 0 && sub.score / sub.total < 0.5
    const isBelowPassMark =
      sub.exams?.pass_mark !== undefined && sub.score < sub.exams.pass_mark
    return isFailStatus || isLowPercentage || isBelowPassMark
  })

  if (failedSubmissions.length >= 2) {
    const avgScorePercent =
      submissions.length > 0
        ? Math.round(
            (submissions.reduce(
              (acc, s) => acc + (s.total > 0 ? (s.score / s.total) * 100 : 0),
              0
            ) /
              submissions.length)
          )
        : 0

    detectedRisks.push({
      triggerType: 'RECURRING_FAILURE',
      priority: 'high',
      riskScore: 85,
      details: {
        failedCount: failedSubmissions.length,
        totalSubmissionsLast30Days: submissions.length,
        averageScorePercentage: avgScorePercent,
        failedExams: failedSubmissions.map((s) => ({
          submissionId: s.id,
          examId: s.exam_id,
          examTitle: s.exams?.title || 'اختبار',
          score: s.score,
          total: s.total,
          submittedAt: s.submitted_at.toISOString(),
        })),
      },
      suggestedAction: 'التواصل مع الطالب لتقديم الدعم الأكاديمي وجلسة مراجعة للنقاط الصعبة',
    })
  }

  // ---------------------------------------------------------------------------
  // RULE 3: ABANDONED_FLOW
  // Completed >= 80% of lessons in lecture/course >= 3 days ago but 0 exam submissions for that lecture/branch.
  // ---------------------------------------------------------------------------
  const userProgressRecords = await prisma.lesson_watch_progress.findMany({
    where: {
      OR: [{ user_id: { in: userIds } }, { student_id: student.id }],
    },
    select: {
      lecture_id: true,
      lesson_id: true,
      completed: true,
      max_percent: true,
      last_viewed_at: true,
    },
  })

  if (userProgressRecords.length > 0) {
    // Group watch records by lecture_id
    const lectureProgressMap = new Map<
      string,
      {
        completedLessons: number
        latestViewedAt: Date
      }
    >()

    for (const record of userProgressRecords) {
      if (!record.lecture_id) continue
      const isComplete = record.completed || (record.max_percent ?? 0) >= 80
      const current = lectureProgressMap.get(record.lecture_id) || {
        completedLessons: 0,
        latestViewedAt: new Date(0),
      }
      if (isComplete) {
        current.completedLessons += 1
      }
      const recordDate = record.last_viewed_at ? new Date(record.last_viewed_at) : new Date(0)
      if (recordDate > current.latestViewedAt) {
        current.latestViewedAt = recordDate
      }
      lectureProgressMap.set(record.lecture_id, current)
    }

    for (const [lectureId, progress] of lectureProgressMap.entries()) {
      if (progress.completedLessons === 0) continue
      if (progress.latestViewedAt > threeDaysAgo) continue // Must be >= 3 days ago

      // Count total lessons in this lecture
      const totalLessonsCount = await prisma.lessons.count({
        where: { lecture_id: lectureId },
      })

      if (totalLessonsCount > 0) {
        const completionRate = progress.completedLessons / totalLessonsCount
        if (completionRate >= 0.8) {
          // Check lecture and related exams
          const lecture = await prisma.lectures.findUnique({
            where: { id: lectureId },
            select: { id: true, title: true, branch_id: true },
          })

          if (lecture) {
            // Find exams linked to branch or matching lecture
            const relatedExams = await prisma.exams.findMany({
              where: {
                OR: [
                  { branch_id: lecture.branch_id },
                  { course: { contains: lecture.title, mode: 'insensitive' } },
                ],
              },
              select: { id: true, title: true },
            })

            if (relatedExams.length > 0) {
              const examIds = relatedExams.map((e) => e.id)
              const studentExamSubs = await prisma.exam_submissions.count({
                where: {
                  student_id: student.id,
                  exam_id: { in: examIds },
                },
              })

              if (studentExamSubs === 0) {
                const daysSinceCompleted = Math.max(
                  3,
                  Math.floor((now.getTime() - progress.latestViewedAt.getTime()) / (1000 * 60 * 60 * 24))
                )

                detectedRisks.push({
                  triggerType: 'ABANDONED_FLOW',
                  priority: 'medium',
                  riskScore: 70,
                  details: {
                    lectureId: lecture.id,
                    lectureTitle: lecture.title,
                    completedLessonsCount: progress.completedLessons,
                    totalLessonsCount,
                    completionPercentage: Math.round(completionRate * 100),
                    daysSinceLessonsCompleted: daysSinceCompleted,
                    pendingExamTitle: relatedExams[0]?.title || 'الاختبار التقييمي',
                  },
                  suggestedAction: 'تذكير الطالب بإجراء الاختبار التقييمي للمحاضرة بعد إتمامه لمعظم الدروس',
                })
                break // Add one abandoned flow case per scan
              }
            }
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // RULE 4: INACTIVE_STUDENT
  // Enrolled/purchased with no presence (last_seen_at) or learning activity for >= 14 days.
  // ---------------------------------------------------------------------------
  const isLastSeenOld =
    !student.last_seen_at || new Date(student.last_seen_at) <= fourteenDaysAgo
  const isAccountOld = new Date(student.created_at) <= fourteenDaysAgo

  if (isLastSeenOld && isAccountOld) {
    // Check if there was any learning activity in last 14 days
    const recentActivity = await prisma.learning_activity.findFirst({
      where: {
        student_id: student.id,
        activity_date: { gte: fourteenDaysAgo },
        minutes: { gt: 0 },
      },
    })

    // Check if there was any watch activity in last 14 days
    const recentWatch = await prisma.lesson_watch_progress.findFirst({
      where: {
        OR: [{ user_id: { in: userIds } }, { student_id: student.id }],
        last_viewed_at: { gte: fourteenDaysAgo },
      },
    })

    if (!recentActivity && !recentWatch) {
      // Check customer engagement: has active enrollments or approved orders
      const hasPurchases = approvedOrders.length > 0
      const enrollmentsCount = await prisma.enrollments.count({
        where: { student_id: student.id },
      })

      if (hasPurchases || enrollmentsCount > 0 || student.status === 'نشط') {
        const lastDate = student.last_seen_at
          ? new Date(student.last_seen_at)
          : new Date(student.created_at)
        const daysInactive = Math.max(
          14,
          Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        )

        detectedRisks.push({
          triggerType: 'INACTIVE_STUDENT',
          priority: 'medium',
          riskScore: 65,
          details: {
            daysInactive,
            lastSeenAt: student.last_seen_at?.toISOString() || null,
            enrollmentsCount,
            approvedOrdersCount: approvedOrders.length,
          },
          suggestedAction: 'إرسال رسالة تشجيع وافتقاد للطالب لتحفيزه على العودة ومتابعة جدول المذاكرة',
        })
      }
    }
  }

  return detectedRisks
}

/**
 * Creates or updates rescue cases for a student, strictly preventing duplicates
 * for active cases ('open', 'contacted', 'in_progress') with the same trigger.
 */
export async function syncStudentRescueCases(
  studentId: string,
  risks?: RiskEvaluationResult[]
): Promise<{ created: number; existing: number }> {
  const evaluations = risks || (await evaluateStudentRisk(studentId))
  let createdCount = 0
  let existingCount = 0

  for (const risk of evaluations) {
    // Check if an active open/contacted/in_progress case already exists
    const existingActiveCase = await prisma.rescue_cases.findFirst({
      where: {
        student_id: studentId,
        trigger_type: risk.triggerType,
        status: { in: ['open', 'contacted', 'in_progress'] },
      },
    })

    if (existingActiveCase) {
      existingCount++
      // Optionally update risk_score or details if changed
      await prisma.rescue_cases.update({
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
      // Create new open rescue case
      await prisma.rescue_cases.create({
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

/**
 * Full batch rescue scan across all students in the platform.
 */
export async function runRescueScan(): Promise<{
  success: boolean
  evaluatedCount: number
  newCasesCount: number
  totalOpenCases: number
}> {
  const students = await prisma.students.findMany({
    select: { id: true },
  })

  let newCasesCount = 0

  for (const s of students) {
    try {
      const res = await syncStudentRescueCases(s.id)
      newCasesCount += res.created
    } catch (err) {
      console.error(`[RescueScan] Error evaluating student ${s.id}:`, err)
    }
  }

  const totalOpenCases = await prisma.rescue_cases.count({
    where: { status: { in: ['open', 'contacted', 'in_progress'] } },
  })

  return {
    success: true,
    evaluatedCount: students.length,
    newCasesCount,
    totalOpenCases,
  }
}

/**
 * Fetches rescue cases with filtering, pagination, and calculated WhatsApp cooldown status.
 */
export async function getRescueCases(filters: RescueFilters = {}): Promise<{
  cases: RescueCaseDTO[]
  total: number
  page: number
  pageSize: number
  stats: RescueStats
}> {
  const page = Math.max(1, filters.page || 1)
  const pageSize = Math.max(1, Math.min(100, filters.pageSize || 20))
  const skip = (page - 1) * pageSize

  const where: any = {}

  if (filters.status && filters.status !== 'all') {
    where.status = filters.status
  }
  if (filters.triggerType && filters.triggerType !== 'all') {
    where.trigger_type = filters.triggerType
  }
  if (filters.priority && filters.priority !== 'all') {
    where.priority = filters.priority
  }
  if (filters.search) {
    where.students = {
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ],
    }
  }

  const [rawCases, total, stats] = await Promise.all([
    prisma.rescue_cases.findMany({
      where,
      include: {
        students: {
          select: {
            id: true,
            code: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: [{ priority: 'asc' }, { risk_score: 'desc' }, { created_at: 'desc' }],
      skip,
      take: pageSize,
    }),
    prisma.rescue_cases.count({ where }),
    getRescueStats(),
  ])

  // Enhance each case with cooldown status
  const cases: RescueCaseDTO[] = await Promise.all(
    rawCases.map(async (c) => {
      const cooldown = await checkStudentCooldown(c.student_id)
      return {
        id: c.id,
        studentId: c.student_id,
        studentCode: c.students?.code || '',
        studentName: c.students?.name || '',
        studentPhone: c.students?.phone || '',
        studentEmail: c.students?.email || '',
        triggerType: c.trigger_type as RescueTriggerType,
        priority: c.priority as RescuePriority,
        status: c.status as RescueStatus,
        riskScore: c.risk_score,
        details: (c.details as Record<string, any>) || {},
        suggestedAction: c.suggested_action || '',
        assignedTo: c.assigned_to,
        lastContactedAt: c.last_contacted_at?.toISOString() || null,
        resolvedAt: c.resolved_at?.toISOString() || null,
        resolutionNotes: c.resolution_notes,
        createdAt: c.created_at.toISOString(),
        updatedAt: c.updated_at.toISOString(),
        cooldownActive: cooldown.cooldownActive,
        cooldownRemainingHours: cooldown.remainingHours,
      }
    })
  )

  return {
    cases,
    total,
    page,
    pageSize,
    stats,
  }
}

/**
 * Calculates aggregate stats for the rescue dashboard.
 */
export async function getRescueStats(): Promise<RescueStats> {
  const [open, urgent, high, contacted, resolved, dismissed, total] =
    await Promise.all([
      prisma.rescue_cases.count({ where: { status: 'open' } }),
      prisma.rescue_cases.count({
        where: {
          priority: 'urgent',
          status: { in: ['open', 'contacted', 'in_progress'] },
        },
      }),
      prisma.rescue_cases.count({
        where: {
          priority: 'high',
          status: { in: ['open', 'contacted', 'in_progress'] },
        },
      }),
      prisma.rescue_cases.count({ where: { status: 'contacted' } }),
      prisma.rescue_cases.count({ where: { status: 'resolved' } }),
      prisma.rescue_cases.count({ where: { status: 'dismissed' } }),
      prisma.rescue_cases.count(),
    ])

  return {
    totalOpen: open,
    urgentCount: urgent,
    highCount: high,
    contactedCount: contacted,
    resolvedCount: resolved,
    dismissedCount: dismissed,
    totalCases: total,
  }
}

/**
 * Updates a rescue case's status lifecycle, assigning notes or resolved timestamps.
 */
export async function updateRescueCaseStatus(
  caseId: string,
  status: RescueStatus,
  notes?: string,
  assignedTo?: string
): Promise<{ success: boolean; case?: any; error?: string }> {
  try {
    const existing = await prisma.rescue_cases.findUnique({
      where: { id: caseId },
    })

    if (!existing) {
      return { success: false, error: 'case_not_found' }
    }

    const updateData: any = {
      status,
      updated_at: new Date(),
    }

    if (notes !== undefined) {
      updateData.resolution_notes = notes
    }

    if (assignedTo !== undefined) {
      updateData.assigned_to = assignedTo
    }

    if (status === 'resolved' || status === 'dismissed') {
      updateData.resolved_at = new Date()
    } else if (status === 'open') {
      updateData.resolved_at = null
    }

    const updated = await prisma.rescue_cases.update({
      where: { id: caseId },
      data: updateData,
    })

    return { success: true, case: updated }
  } catch (err: any) {
    return { success: false, error: err?.message || 'update_failed' }
  }
}
