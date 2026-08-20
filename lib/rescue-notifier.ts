import { prisma } from './prisma.ts'
import { normalizeEgyptPhone } from './phone.ts'
import type { RescueTriggerType } from './rescue.ts'

export interface PlatformRescueSettings {
  cooldownHours: number
  hourlyLimit: number
  autoNotify: boolean
}

export interface CooldownCheckResult {
  allowed: boolean
  cooldownActive: boolean
  remainingHours: number
  lastContactedAt?: Date | null
}

export interface RateLimitCheckResult {
  allowed: boolean
  currentCount: number
  limit: number
}

export interface DispatchWhatsAppResult {
  success: boolean
  messageId?: string
  error?: string
  cooldownBlocked?: boolean
  remainingHours?: number
  rateLimitBlocked?: boolean
  sandbox?: boolean
}

/**
 * Reads platform settings for WhatsApp Rescue rules with fallback defaults.
 */
export async function getPlatformRescueSettings(): Promise<PlatformRescueSettings> {
  try {
    const settings = await prisma.platform_settings.findFirst({
      where: { id: 1 },
      select: {
        rescue_whatsapp_cooldown_hours: true,
        rescue_hourly_limit: true,
        rescue_auto_notify: true,
      },
    })

    return {
      cooldownHours: settings?.rescue_whatsapp_cooldown_hours ?? 72,
      hourlyLimit: settings?.rescue_hourly_limit ?? 50,
      autoNotify: settings?.rescue_auto_notify ?? false,
    }
  } catch {
    return {
      cooldownHours: 72,
      hourlyLimit: 50,
      autoNotify: false,
    }
  }
}

/**
 * Checks if a WhatsApp message was sent to the student within the cooldown window (e.g. 72h).
 */
export async function checkStudentCooldown(
  studentId: string,
  customCooldownHours?: number
): Promise<CooldownCheckResult> {
  const settings = await getPlatformRescueSettings()
  const cooldownHours = customCooldownHours ?? settings.cooldownHours
  const cooldownMs = cooldownHours * 60 * 60 * 1000
  const thresholdDate = new Date(Date.now() - cooldownMs)

  // 1. Check whatsapp_messages sent/queued to this student
  const recentMessage = await prisma.whatsapp_messages.findFirst({
    where: {
      student_id: studentId,
      status: { in: ['sent', 'queued'] },
      created_at: { gte: thresholdDate },
    },
    orderBy: { created_at: 'desc' },
  })

  // 2. Also check rescue_cases last_contacted_at
  const recentContactCase = await prisma.rescue_cases.findFirst({
    where: {
      student_id: studentId,
      last_contacted_at: { gte: thresholdDate },
    },
    orderBy: { last_contacted_at: 'desc' },
  })

  let mostRecentContact: Date | null = null
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

/**
 * Checks platform-wide hourly burst rate limit to prevent WhatsApp provider bans.
 */
export async function checkHourlyRateLimit(customLimit?: number): Promise<RateLimitCheckResult> {
  const settings = await getPlatformRescueSettings()
  const limit = customLimit ?? settings.hourlyLimit
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const currentCount = await prisma.whatsapp_messages.count({
    where: {
      created_at: { gte: oneHourAgo },
      status: { in: ['sent', 'queued'] },
    },
  })

  return {
    allowed: currentCount < limit,
    currentCount,
    limit,
  }
}

/**
 * Generates personalized, high quality Arabic motivational messages for each trigger type.
 */
export function generateRescueMessage(
  type: RescueTriggerType,
  data: {
    studentName: string
    courseTitle?: string
    daysInactive?: number
    examTitle?: string
    [key: string]: any
  }
): string {
  const name = data.studentName ? data.studentName.trim() : 'يا بطل'

  switch (type) {
    case 'PURCHASED_INACTIVE':
      return [
        'منصة أكاديمية شفاء العليل 🌟',
        '',
        `أهلاً بك يا ${name} 👋`,
        `لاحظنا إنك اشتركت في "${data.courseTitle || 'الكورس التعليمي'}" من ${data.daysInactive || 3} أيام ولحد دلوقتي مبدأتش أول درس.`,
        '',
        'المحتوى جاهز ومستنيك، خطوة واحدة بتفرق كتير في مستواك! ادخل دلوقتي وابدأ أول فيديو:',
        '🔗 منصة شفاء العليل - كورساتي',
        '',
        'لو عندك أي مشكلة أو استفسار، فريق المنصة جاهز لمساعدتك في أي وقت.',
      ].join('\n')

    case 'RECURRING_FAILURE':
      return [
        'منصة أكاديمية شفاء العليل 📚',
        '',
        `أهلاً يا ${name} 👋`,
        'شفنا محاولاتك الأخيرة في الاختبارات، وبنحب نفكرك إن الغلط هو أول طريق الفهم والإتقان!',
        '',
        'متقلقش خالص، جهزنالك مراجعة لأهم النقاط وفريق التدريس متاح لمساعدتك في أي سؤال مش واضح.',
        'ادخل على المنصة وراجع أخطاء الاختبار أو تواصل مع الدعم الفني والأكاديمي.',
        '',
        'بالتوفيق دايمًا، واثقين في قدرتك على التفوق! 💪',
      ].join('\n')

    case 'ABANDONED_FLOW':
      return [
        'منصة أكاديمية شفاء العليل 🎯',
        '',
        `أهلاً يا ${name} 👋`,
        `أنت قطعت شوط ممتاز وخلصت دروس "${data.courseTitle || 'المحاضرة'}"، وباقي لك فقط ${data.examTitle ? `"${data.examTitle}"` : 'الاختبار التقييمي'} عشان تثبت المعلومة!`,
        '',
        'ادخل دلوقتي وجرب الاختبار، خطوة واحدة متبقية لإتمام المحتوى بنجاح.',
        '🔗 بالتوفيق والدرجات العالية بإذن الله.',
      ].join('\n')

    case 'INACTIVE_STUDENT':
      return [
        'منصة أكاديمية شفاء العليل 💫',
        '',
        `أهلاً يا ${name} 👋`,
        'وحشتنا على المنصة! بقالك فترة مش ظاهر ومستنيين رجوعك واستكمال جدول المذاكرة والتفوق.',
        '',
        'يلا افتح المنصة وكمّل من المكان اللي وقفت عنده، خطوة كل يوم بتصنع الفارق!',
        '🔗 ننتظرك دائمًا يا بطل.',
      ].join('\n')

    case 'MANUAL':
    default:
      return [
        'منصة أكاديمية شفاء العليل 🌟',
        '',
        `أهلاً بك يا ${name} 👋`,
        'نتمنى لك دوام التوفيق والنجاح في دراستك، فريق أكاديمية شفاء العليل متواجد دائمًا لدعمك ومساعدتك.',
        '',
        'لا تتردد في التواصل معنا لأي استفسار أو مساعدة.',
      ].join('\n')
  }
}

/**
 * Dispatches a WhatsApp message for a rescue case, enforcing anti-spam cooldown,
 * burst rate limits, phone normalization, sandbox mock handling, and audit logging.
 */
export async function dispatchRescueWhatsApp(
  caseId: string,
  options?: {
    customText?: string
    force?: boolean
    sandbox?: boolean
    redactBody?: boolean
  }
): Promise<DispatchWhatsAppResult> {
  const rescueCase = await prisma.rescue_cases.findUnique({
    where: { id: caseId },
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
  })

  if (!rescueCase || !rescueCase.students) {
    return { success: false, error: 'case_or_student_not_found' }
  }

  const student = rescueCase.students
  const normalizedPhone = normalizeEgyptPhone(student.phone)

  if (!normalizedPhone) {
    return { success: false, error: 'invalid_egypt_phone' }
  }

  // 1. Cooldown enforcement (unless force = true)
  if (!options?.force) {
    const cooldown = await checkStudentCooldown(student.id)
    if (cooldown.cooldownActive) {
      return {
        success: false,
        error: 'cooldown_active',
        cooldownBlocked: true,
        remainingHours: cooldown.remainingHours,
      }
    }

    // 2. Hourly rate limit check
    const rateLimit = await checkHourlyRateLimit()
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: 'hourly_limit_exceeded',
        rateLimitBlocked: true,
      }
    }
  }

  // 3. Prepare message content
  const details = (rescueCase.details as Record<string, any>) || {}
  const messageText =
    options?.customText?.trim() ||
    generateRescueMessage(rescueCase.trigger_type as RescueTriggerType, {
      studentName: student.name,
      courseTitle: details.courseTitle || details.lectureTitle,
      daysInactive: details.daysInactive,
      examTitle: details.pendingExamTitle || details.examTitle,
    })

  // 4. Sandbox / Mock Mode Check
  const isSandbox =
    options?.sandbox ??
    (process.env.WHATSAPP_SANDBOX === 'true' ||
      process.env.NODE_ENV === 'test' ||
      !process.env.EVOLUTION_API_URL)

  if (isSandbox) {
    const mockMessageId = `mock_sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    // Log message to outbox
    await prisma.whatsapp_messages.create({
      data: {
        to_phone: normalizedPhone,
        template: 'custom',
        body: options?.redactBody ? '[redacted]' : messageText.slice(0, 2000),
        status: 'sent',
        provider_message_id: mockMessageId,
        student_id: student.id,
        sent_at: new Date(),
      },
    })

    // Update rescue case status
    await prisma.rescue_cases.update({
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

  // 5. Live Mode: Evolution API Dispatch
  const baseUrl = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '')
  const apiKey = process.env.EVOLUTION_API_KEY || ''
  const instance = process.env.EVOLUTION_INSTANCE || ''

  const logRow = await prisma.whatsapp_messages
    .create({
      data: {
        to_phone: normalizedPhone,
        template: 'custom',
        body: options?.redactBody ? '[redacted]' : messageText.slice(0, 2000),
        status: 'queued',
        student_id: student.id,
      },
      select: { id: true },
    })
    .catch(() => null)

  try {
    const res = await fetch(
      `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({ number: normalizedPhone, text: messageText }),
      }
    )

    const json: any = await res.json().catch(() => ({}))

    if (!res.ok) {
      const errorMsg = `http_${res.status}: ${JSON.stringify(json).slice(0, 300)}`
      if (logRow) {
        await prisma.whatsapp_messages
          .update({
            where: { id: logRow.id },
            data: { status: 'failed', error: errorMsg },
          })
          .catch(() => {})
      }
      return { success: false, error: errorMsg }
    }

    const providerId = json?.key?.id ?? json?.messageId ?? `evo_${Date.now()}`

    if (logRow) {
      await prisma.whatsapp_messages
        .update({
          where: { id: logRow.id },
          data: {
            status: 'sent',
            sent_at: new Date(),
            provider_message_id: providerId,
          },
        })
        .catch(() => {})
    }

    await prisma.rescue_cases.update({
      where: { id: caseId },
      data: {
        status: 'contacted',
        last_contacted_at: new Date(),
        updated_at: new Date(),
      },
    })

    return {
      success: true,
      messageId: providerId,
    }
  } catch (err: any) {
    const errorMsg = `network: ${String(err?.message ?? err).slice(0, 300)}`
    if (logRow) {
      await prisma.whatsapp_messages
        .update({
          where: { id: logRow.id },
          data: { status: 'failed', error: errorMsg },
        })
        .catch(() => {})
    }
    return { success: false, error: errorMsg }
  }
}
