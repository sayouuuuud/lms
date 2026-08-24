/**
 * ⚠️ DEV / TEST ONLY — لا يشغَّل على قاعدة بيانات الإنتاج إطلاقًا ⚠️
 *
 * Seed idempotent لنظام الاشتراكات:
 *   • 3 خطط: وصول كامل شهري، خطة مرحلة (ترم)، خطة كورس واحد.
 *   • 3 طلاب تجريبيون باشتراكات بحالات محسوبة مختلفة: فعّال / فترة سماح / منتهي.
 *   • طلبا اشتراك: معلّق + مرفوض (بسبب ظاهر للطالب).
 *
 * آمن لإعادة التشغيل: كل الكيانات بمفاتيح حتمية (أكواد/إيميلات ثابتة) وتُحدَّث
 * تواريخها عند وجودها بدل التكرار. كل تغيير حالة يكتب حدثًا في subscription_events.
 *
 * التشغيل الجاف (افتراضي — لا يكتب شيئًا):
 *   node scripts/seed-subscriptions.ts
 * التنفيذ الفعلي يتطلب تأكيدًا صريحًا:
 *   SEED_SUBSCRIPTIONS_CONFIRM=yes node scripts/seed-subscriptions.ts
 */
import { PrismaClient } from '@prisma/client'

const CONFIRMED = process.env.SEED_SUBSCRIPTIONS_CONFIRM === 'yes'
const prisma = new PrismaClient()
const DAY = 24 * 60 * 60 * 1000

function iso(offsetDays: number, base = new Date()): Date {
  return new Date(base.getTime() + offsetDays * DAY)
}

type PlanSeed = {
  code: string
  title: string
  description: string
  price: number
  durationDays: number
  billingPeriod: string
  scopeMode: string
}

const PLANS: PlanSeed[] = [
  { code: 'SEED-FULL-M', title: '[تجريبي] وصول كامل — شهر', description: 'خطة اختبار: كل المحتوى المنشور لمدة شهر.', price: 350, durationDays: 30, billingPeriod: 'month', scopeMode: 'all_released' },
  { code: 'SEED-STAGE-T', title: '[تجريبي] خطة مرحلة — ترم', description: 'خطة اختبار: نطاق مرحلة دراسية واحدة لمدة ترم.', price: 600, durationDays: 120, billingPeriod: 'term', scopeMode: 'selected' },
  { code: 'SEED-COURSE-C', title: '[تجريبي] خطة كورس — شهر', description: 'خطة اختبار: كورس شهري واحد فقط.', price: 180, durationDays: 30, billingPeriod: 'month', scopeMode: 'selected' },
]

async function ensurePlan(seed: PlanSeed, scope: { scopeType: string; scopeId: string | null }[]): Promise<string> {
  const existing = await prisma.subscription_plans.findFirst({
    where: { code: seed.code },
    include: { scopes: true },
  })
  if (existing) {
    await prisma.subscription_plans.update({
      where: { id: existing.id },
      data: {
        title: seed.title,
        description: seed.description,
        price: seed.price,
        duration_days: seed.durationDays,
        billing_period: seed.billingPeriod,
        scope_mode: seed.scopeMode,
        is_active: true,
        public_visible: true,
        allow_manual_assignment: true,
        updated_at: new Date(),
      },
    })
    return existing.id
  }
  const created = await prisma.subscription_plans.create({
    data: {
      code: seed.code,
      title: seed.title,
      description: seed.description,
      short_description: 'خطة تجريبية مولّدة بسكربت الاختبار.',
      price: seed.price,
      duration_days: seed.durationDays,
      billing_period: seed.billingPeriod,
      scope_mode: seed.scopeMode,
      allow_manual_assignment: true,
      is_active: true,
      public_visible: true,
      scopes: { create: scope.map((s) => ({ scope_type: s.scopeType, scope_id: s.scopeId })) },
    },
  })
  return created.id
}

async function ensureTestStudent(code: string, email: string, name: string): Promise<{ studentId: string; userId: string }> {
  const existingStudent = await prisma.students.findFirst({
    where: { OR: [{ code }, { email }] },
    select: { id: true, user_id: true },
  })
  if (existingStudent?.user_id) {
    return { studentId: existingStudent.id, userId: existingStudent.user_id }
  }

  const userId = crypto.randomUUID()
  const existingUser = await prisma.user.findFirst({ where: { email }, select: { id: true } })
  const user = existingUser
    ? existingUser
    : await prisma.user.create({
        data: {
          id: userId,
          email,
          encrypted_password: '$2a$10$CwTycUXWue0Thq9StjUM0uJ8DsVoMscmKJHzFgHNTpRYUhDm8mE9i', // Test#12345
          aud: 'authenticated',
          role: 'authenticated',
          emailVerified: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      })

  await prisma.profiles.upsert({
    where: { id: user.id },
    update: { full_name: name, role: 'student' },
    create: { id: user.id, email, full_name: name, role: 'student' },
  })

  const student = await prisma.students.upsert({
    where: { code },
    update: { user_id: user.id },
    create: { code, user_id: user.id, name, email },
  })
  return { studentId: student.id, userId: user.id }
}

async function ensureSubscription(params: {
  studentId: string
  planId: string
  planTitle: string
  key: string
  endDate: Date
  graceUntil: Date | null
  status?: string
}): Promise<void> {
  const existing = await prisma.student_subscriptions.findFirst({
    where: { student_id: params.studentId, plan_id: params.planId },
    select: { id: true },
  })
  const data = {
    start_date: iso(-25),
    end_date: params.endDate,
    grace_until: params.graceUntil,
    status: params.status ?? 'active',
    source: 'seed',
    payment_status: 'waived',
  }
  if (existing) {
    await prisma.student_subscriptions.update({ where: { id: existing.id }, data })
    return
  }
  await prisma.student_subscriptions.create({
    data: {
      ...data,
      student_id: params.studentId,
      plan_id: params.planId,
      next_billing_at: params.endDate,
      plan_snapshot: { id: params.planId, title: params.planTitle, durationDays: 30, seededKey: params.key },
      events: { create: { event_type: 'created', to_status: data.status, reason: 'إسناد تجريبي من السيدر' } },
    },
  })
}

async function ensureRequest(params: {
  code: string
  studentUserId: string
  studentName: string
  planId: string
  planTitle: string
  status: 'pending' | 'rejected'
  adminNote?: string
}): Promise<void> {
  const existing = await prisma.subscription_requests.findUnique({ where: { code: params.code }, select: { id: true } })
  const data = {
    student_id: params.studentUserId,
    student_name: params.studentName,
    plan_id: params.planId,
    plan_title: params.planTitle,
    plan_snapshot: { id: params.planId, title: params.planTitle, price: 0, seeded: true },
    status: params.status,
    receipt_url: 'https://example.com/seed-receipt.png',
    payment_method: 'فودافون كاش',
    admin_note: params.adminNote ?? null,
  }
  if (existing) {
    await prisma.subscription_requests.update({ where: { id: existing.id }, data })
    return
  }
  await prisma.subscription_requests.create({ data: { ...data, code: params.code } })
}

async function main() {
  console.log('⚠️  DEV/TEST ONLY seed — subscriptions module')
  if (!CONFIRMED) {
    console.log('DRY RUN (لم يُمرَّر SEED_SUBSCRIPTIONS_CONFIRM=yes) — لن يُكتب أي شيء. سيتم فحص المتطلبات فقط.')
  }

  // أهداف النطاقات: أول مرحلة وأول كورس شهري متاحين في القاعدة.
  const [stage, monthlyCourse] = await Promise.all([
    prisma.stages.findFirst({ orderBy: { sort_order: 'asc' }, select: { id: true, title: true } }),
    prisma.monthly_courses.findFirst({ where: { is_published: true }, select: { id: true, title: true } }),
  ])
  console.log(`scope stage: ${stage ? stage.title : '(لا توجد مراحل — خطة المرحلة ستُنشأ بنطاق all_released مؤقت)'}`)
  console.log(`scope course: ${monthlyCourse ? monthlyCourse.title : '(لا يوجد كورس شهري — خطة الكورس ستُنشأ بنطاق all_released مؤقت)'}`)

  const actions: string[] = []

  const fullPlanId = await (async () => {
    const id = PLANS[0]
    if (!CONFIRMED) { actions.push(`upsert plan ${id.code}`); return 'dryrun-full' }
    return ensurePlan(id, [])
  })()

  const stagePlanId = await (async () => {
    const id = PLANS[1]
    const scope = stage ? [{ scopeType: 'stage', scopeId: stage.id }] : []
    if (!CONFIRMED) { actions.push(`upsert plan ${id.code}${stage ? ' (stage scope)' : ''}`); return 'dryrun-stage' }
    return ensurePlan(id, scope)
  })()

  const coursePlanId = await (async () => {
    const id = PLANS[2]
    const scope = monthlyCourse ? [{ scopeType: 'course', scopeId: monthlyCourse.id }] : []
    if (!CONFIRMED) { actions.push(`upsert plan ${id.code}${monthlyCourse ? ' (course scope)' : ''}`); return 'dryrun-course' }
    return ensurePlan(id, scope)
  })()

  const students = [
    { code: 'STD-SEED-ACT', email: 'seed-sub-active@test.local', name: 'طالب تجريبي — فعال' },
    { code: 'STD-SEED-GRA', email: 'seed-sub-grace@test.local', name: 'طالب تجريبي — فترة سماح' },
    { code: 'STD-SEED-EXP', email: 'seed-sub-expired@test.local', name: 'طالب تجريبي — منتهي' },
  ]

  if (!CONFIRMED) {
    for (const s of students) actions.push(`upsert student ${s.code} (${s.email})`)
    actions.push('subscription ACTIVE  (full plan, ends +20d)')
    actions.push('subscription GRACE   (full plan, ended -2d, grace until +5d)')
    actions.push('subscription EXPIRED (stage plan, ended -10d)')
    actions.push('request PENDING  (course plan, REQ-SEED-PEND)')
    actions.push('request REJECTED (course plan, REQ-SEED-REJD, note)')
    console.log('\nالعمليات المخططة:')
    for (const action of actions) console.log('  - ' + action)
    console.log('\nللتنفيذ الفعلي: SEED_SUBSCRIPTIONS_CONFIRM=yes node scripts/seed-subscriptions.ts')
    return
  }

  // تنفيذ فعلي
  const active = await ensureTestStudent(students[0].code, students[0].email, students[0].name)
  const grace = await ensureTestStudent(students[1].code, students[1].email, students[1].name)
  const expired = await ensureTestStudent(students[2].code, students[2].email, students[2].name)
  void expired

  await ensurePlan(PLANS[0], [])
  const stagePlanReal = stage ? await ensurePlan(PLANS[1], [{ scopeType: 'stage', scopeId: stage.id }]) : await ensurePlan(PLANS[1], [])
  const coursePlanReal = monthlyCourse ? await ensurePlan(PLANS[2], [{ scopeType: 'course', scopeId: monthlyCourse.id }]) : await ensurePlan(PLANS[2], [])
  void stagePlanReal
  void coursePlanReal

  await ensureSubscription({ studentId: active.studentId, planId: fullPlanId === 'dryrun-full' ? '' : fullPlanId, planTitle: PLANS[0].title, key: 'active', endDate: iso(20), graceUntil: null })
  await ensureSubscription({ studentId: grace.studentId, planId: fullPlanId === 'dryrun-full' ? '' : fullPlanId, planTitle: PLANS[0].title, key: 'grace', endDate: iso(-2), graceUntil: iso(5) })
  await ensureSubscription({ studentId: expired.studentId, planId: stagePlanId === 'dryrun-stage' ? '' : stagePlanId, planTitle: PLANS[1].title, key: 'expired', endDate: iso(-10), graceUntil: null, status: 'expired' })

  await ensureRequest({ code: 'REQ-SEED-PEND', studentUserId: active.userId, studentName: students[0].name, planId: coursePlanId === 'dryrun-course' ? '' : coursePlanId, planTitle: PLANS[2].title, status: 'pending' })
  await ensureRequest({ code: 'REQ-SEED-REJD', studentUserId: grace.userId, studentName: students[1].name, planId: coursePlanId === 'dryrun-course' ? '' : coursePlanId, planTitle: PLANS[2].title, status: 'rejected', adminNote: 'صورة الإيصال غير واضحة — أعد الرفع (بيانات تجريبية)' })

  console.log('✅ Seed مكتمل: 3 خطط، 3 طلاب بحالات فعّال/سماح/منتهٍ، طلب معلّق + مرفوض.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
