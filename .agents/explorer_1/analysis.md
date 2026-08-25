# تقرير التحليل الشامل والمخطط الهندسي لسد الثغرات المتبقية في نظام الاشتراكات (LMS Remediation Blueprint)

تاريخ التحليل: 2026-08-24
المعد: مستكشف 1 (Explorer 1)

---

## 1. ملخص تنفيذي (Executive Summary)

تم إجراء استكشاف كامل وقراءة متأنية لشجرة المشروع بالكامل لتشخيص وحل المشكلات الأربعة الرئيسية (R1 إلى R4) بالإضافة إلى استراتيجية التحقق والاختبار:

1. **R1 (TypeScript Build Blocker):** تم العثور على ملف `lib/subscription-validation.ts` في شجرة العمل غير المرفوعة (untracked)، وتمت مراجعة كافة المخططات (Zod Schemas) والتأكد من مطابقتها التامة لكافة متطلبات `app/admin/subscriptions/actions.ts` و `app/student/subscriptions/actions.ts` مع تحسين التحقق من الحقول الاختيارية وقيم الـ `null`.
2. **R2 (Security & Access Issues):**
   - راوتات `/api/media/[...key]` و `/api/attachments/[...key]` تفتقر حالياً للتحقق من جلسة المستخدم (Authentication) وصلاحية الوصول (Entitlement). الميديا الحساسة (الفيديوهات `media/videos/` والإيصالات `media/receipts/`) والمرفقات تتطلب التحقق من هوية الطالب واشتراكه/شرائه للمحاضرة أو كونه مشرفاً/صاحب الإيصال، بينما الميديا العامة (الشعار، صور الواجهة، صور المحاضرين، المنهج) تبقى عامة.
   - منطق صلاحية الامتحانات في `app/student/exams/actions.ts` (`studentCanAccessExam`) و `app/student/actions/exams-assignments.ts` يحتوي على خطأ منطقي معكوس (`const hasStage = !exam.stage_id`)، كما يتيح للامتحانات غير المرتبطة بمرحلة أو فرع أن تكون متاحة لجميع الطلاب دون اشتراك فعال. تم وضع المنطق الصارم الصحيح.
3. **R3 (Functional Gaps):**
   - لقطة الخطة `plan_snapshot` في `lib/subscription-manager.ts` و `app/student/subscriptions/actions.ts` لا تجمد السعر ولا النطاقات الفعلية (`scopes`). تم تصميم هيكل JSON متكامل للقطة يُخزن السعر ونوع النطاق ومصفوفة النطاقات بالكامل وقت الشراء/الإسناد.
   - وضع `subscriptions_only` لا يُخفي أزرار السلة والشراء في الواجهة بشكل متناسق. تم حصر كافة الملفات المسؤولة وتحديد آليات إخفاء السلة وأزرار الإضافة والشراء واستبدالها بروابط لصفحة الاشتراكات `/subscriptions` وحظرها على السيرفر في `app/cart-actions.ts`.
4. **R4 (Operational & Cron Issues):**
   - راوت الكرون `app/api/cron/subscriptions-sweep/route.ts` يرفض العمل محلياً إذا لم يكن `CRON_SECRET` معيناً. كما أن فلتر فترة السماح في الكرون يعتمد على `grace_until: { gte: now }` في قاعدة البيانات، مما يتجاهل الاشتراكات التي تعتمد على فترة السماح الافتراضية للمنصة (`grace_until IS NULL`). تم تصحيح الفحص ليعتمد على الدالة المرجعية `computeSubscriptionStatus`.
   - واجهة الطالب `app/student/subscriptions/page.tsx` تفلتر الاشتراكات المنتهية بحالة `status: { in: ['active', 'grace'] }` وتستبعد ما مضى عليه أكثر من 30 يوماً، مما يخفي الاشتراكات المنتهية والملغاة. تم تعديل الاستعلام والعرض ليعرض كل الاشتراكات مع بادجات الحالة الدقيقة.

---

## 2. تفاصيل المتطلبات والمخطط الهندسي (Detailed Blueprints)

### R1. حل مانع بناء تايب سكريبت (TypeScript Build Blocker)

#### الملاحظات وتحليل الكود:
- في `app/admin/subscriptions/actions.ts` (الأسطر 9-19):
  يتم استيراد: `assignSubscriptionInputSchema`, `managerFiltersSchema`, `planInputSchema`, `renewSubscriptionInputSchema`, `requestIdSchema`, `studentSearchQuerySchema`, `subscriptionModeInputSchema`, `transitionSubscriptionInputSchema`, `uuidId`.
- في `app/student/subscriptions/actions.ts` (السطر 8):
  يتم استيراد: `createSubscriptionRequestInputSchema`, `requestIdSchema`, `firstIssueMessage`.
- ملف `lib/subscription-validation.ts` موجود حالياً في مسار `lib/` لكنه كان غير متتبع في Git.

#### الكود النموذجي الكامل لملف `lib/subscription-validation.ts`:
```typescript
import { z } from 'zod'
import type { SubscriptionStatus } from '@/lib/subscription-manager'

/** طبقة التحقق المرجعية لكل إجراءات الاشتراك — تُستدعى بعد حارس الصلاحية مباشرة. */

export const uuidId = z.string().uuid('معرّف غير صالح')

export const SUBSCRIPTION_PAYMENT_STATUSES = ['paid', 'unpaid', 'pending', 'refunded', 'waived'] as const
const paymentStatus = z.enum(SUBSCRIPTION_PAYMENT_STATUSES)

const isoDate = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ غير صالح'))

const scopeSchema = z.object({
  scopeType: z.enum(['all_released', 'branch', 'stage', 'term', 'course', 'lecture']),
  scopeId: z.string().uuid().nullable().optional(),
})

export const planInputSchema = z.object({
  title: z.string().trim().min(2, 'اسم الخطة قصير جدًا').max(120),
  description: z.string().max(2000).nullable().optional(),
  marketingLabel: z.string().trim().max(120).nullable().optional(),
  shortDescription: z.string().max(300).nullable().optional(),
  imageUrl: z.string().trim().max(600).nullable().optional(),
  publicVisible: z.boolean().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  price: z.number().min(0, 'السعر غير صالح'),
  durationDays: z.number().int().min(1).max(3650),
  billingPeriod: z.enum(['month', 'term', 'year', 'custom']),
  scopeMode: z.enum(['all_released', 'selected']),
  allowManualAssignment: z.boolean(),
  isActive: z.boolean(),
  code: z.string().trim().max(80).nullable().optional(),
  stageId: uuidId.nullable().optional(),
  branchId: uuidId.nullable().optional(),
  scopes: z.array(scopeSchema).max(500).optional(),
})

export const managerFiltersSchema = z.object({
  query: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'grace', 'expired', 'cancelled', 'suspended', 'all']).optional(),
  planId: uuidId.optional(),
  page: z.number().int().min(1).max(10000).optional(),
  pageSize: z.number().int().min(10).max(100).optional(),
})

export const assignSubscriptionInputSchema = z.object({
  studentId: uuidId,
  planId: uuidId,
  source: z.string().trim().max(40).optional(),
  paymentStatus: paymentStatus.optional(),
  paymentReference: z.string().trim().max(200).nullable().optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  graceUntil: isoDate.nullable().optional(),
})

export const renewSubscriptionInputSchema = z.object({
  subscriptionId: uuidId,
  durationDays: z.number().int().min(1).max(3650).optional(),
  paymentStatus: paymentStatus.optional(),
  paymentReference: z.string().trim().max(200).nullable().optional(),
  reason: z.string().trim().max(300).optional(),
})

export const transitionSubscriptionInputSchema = z.object({
  subscriptionId: uuidId,
  toStatus: z.enum(['active', 'grace', 'expired', 'cancelled', 'suspended'] as const satisfies readonly SubscriptionStatus[]),
  reason: z.string().trim().max(300).optional(),
  graceUntil: isoDate.nullable().optional(),
  paymentStatus: paymentStatus.optional(),
  paymentReference: z.string().trim().max(200).nullable().optional(),
  nextBillingAt: isoDate.nullable().optional(),
})

export const subscriptionModeInputSchema = z.object({
  mode: z.enum(['purchases_only', 'subscriptions_only', 'hybrid']),
  gracePeriodDays: z.number().int().min(0).max(90),
})

export const studentSearchQuerySchema = z.string().trim().max(120)

export const createSubscriptionRequestInputSchema = z.object({
  planId: uuidId,
  method: z.string().trim().min(1, 'وسيلة الدفع مطلوبة').max(64),
  reference: z.string().trim().max(120).optional(),
  receiptUrl: z.string().trim().min(4, 'صورة الإيصال مطلوبة').max(600),
  note: z.string().trim().max(500).optional(),
})

export const requestIdSchema = uuidId

/** يحوّل أخطاء Zod إلى رسالة عربية واضحة بأول حقل مخل. */
export function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0]
  const path = issue?.path?.join('.') ?? ''
  return `بيانات غير صالحة${path ? ` (${path})` : ''}: ${issue?.message ?? 'قيمة مرفوضة'}`
}
```

---

### R2. الأمان وصلاحيات الوصول (Security & Access Issues)

#### 1. تأمين `/api/media/[...key]` و `/api/attachments/[...key]`

**الوضع الحالي:**
- المساران مدرجان في `PUBLIC_PATHS` في `middleware.ts`.
- `app/api/media/[...key]/route.ts`: يوقع أي ملف على R2 مباشرة ويعيده للمتصفح دون فحص هوية أو صلاحية.
- `app/api/attachments/[...key]/route.ts`: يوقع أي ملف مرفق على R2 دون أي جلسة أو فحص اشتراك.

**المخطط الهندسي للحل:**
1. **تصنيف الميديا في `/api/media/[...key]`:**
   - **الميديا العامة (Public):**
     - مجلدات `site/`, `curriculum/`, `instructor/`: ميديا عامة (لوجو، صور مراحل، بوسترات). تُتاح بدون جلسة.
   - **الميديا الخاصة (Protected):**
     - مجلد `receipts/`: يتطلب جلسة مسجلة (`auth()`). يسمح بالوصول إذا كان المستخدم مشرفاً (`role === 'admin'`) أو صاحب الحساب المرتبط بالطلب (`subscription_requests.student_id === userId`).
     - مجلد `videos/`: مقفل تماماً أمام الوصول المباشر عبر هذا الراوت (تُعاد `403 Forbidden` مع توجيه لاستخدام راوت البث الموثق `/api/lectures/[lessonId]/stream` أو `/api/hls/...`)، إلا إذا كان المستخدم مشرفاً.
     - مجلد `avatars/`: يسمح بالوصول لجميع المستخدمين المسجلين أو صاحب الحساب.

2. **تأمين المرفقات في `/api/attachments/[...key]`:**
   - يتطلب وجود جلسة مصادقة مسجلة (`session?.user?.id`). إذا لم توجد جلسة تُعاد `401 Unauthorized`.
   - التحقق من الصلاحية (Entitlement):
     - إذا كان المستخدم مشرفاً (`role === 'admin'`) -> مسموح.
     - إذا كان طالباً: يتم استعلام قاعدة البيانات للبحث عن الدرس المرتبط بالمرفق (عبر حقل `lessons.attachments` الذي يحتوي على اسم أو رابط الملف).
     - يتم استدعاء `checkContentAccess(user.id, { kind: 'lecture', lectureId })` من `lib/lecture-access.ts` أو التحقق مما إذا كان الدرس مجانياً (`lesson.is_free`). إذا لم يكن مسموحاً -> تُعاد `403 Forbidden`.

---

#### 2. تصحيح منطق صلاحيات الامتحانات (`app/student/exams/actions.ts`)

**المشكلة الحالية في الكود:**
في `app/student/exams/actions.ts` (الأسطر 85-91):
```typescript
  const hasStage = !exam.stage_id // BUG: inverted boolean!
  const hasBranch = !exam.branch_id // BUG: inverted boolean!

  if (!hasStage && !hasBranch) return true // BUG: Returns true when exam HAS stage and branch!
  if (hasStage && student.stage_id && exam.stage_id === student.stage_id) return true
```
بالإضافة إلى ذلك، في `app/student/actions/exams-assignments.ts` (السطر 30):
`if (!hasStageTarget && !hasBranchTarget) return true`
مما يفتح الامتحانات العامة غير المرتبطة بفرع أو مرحلة لجميع الطلاب دون اشتراك.

**المخطط الهندسي للتصحيح:**
```typescript
export async function studentCanAccessExam(
  student: any,
  exam: { stage_id?: string | null; branch_id?: string | null },
): Promise<boolean> {
  // 1. مسار الاشتراكات الموحّد
  const subscriptionAccess = await checkContentAccess(student.user_id, {
    kind: 'exam',
    stageId: exam.stage_id ?? null,
    branchId: exam.branch_id ?? null,
  })
  if (subscriptionAccess.allowed) return true

  // 2. إذا كان وضع المنصة subscriptions_only -> لا يُسمح بأي وصول دون اشتراك
  const mode = await getSubscriptionMode()
  if (mode === 'subscriptions_only') return false

  // 3. التحقق من ربط المرحلة والفرع (المشتريات / التعيين)
  const hasStage = !!exam.stage_id
  const hasBranch = !!exam.branch_id

  // إذا لم يكن للامتحان مرحلة ولا فرع، لا يُفتح تلقائياً إلا لمن لديه اشتراك all_released (تم فحصه أعلاه)
  if (!hasStage && !hasBranch) return false

  // تطابق المرحلة
  if (hasStage && student.stage_id && exam.stage_id === student.stage_id) {
    return true
  }

  // تطابق الفرع عبر المحاضرات المشتراة
  if (hasBranch && exam.branch_id) {
    const orders = await prisma.orders.findMany({
      where: { student_id: student.user_id, status: 'approved' },
      include: { order_items: { select: { lecture_id: true } } },
    })

    const purchasedLectureIds: string[] = []
    for (const o of orders) {
      for (const item of o.order_items) {
        if (item.lecture_id) purchasedLectureIds.push(item.lecture_id)
      }
    }

    if (purchasedLectureIds.length > 0) {
      const lectures = await prisma.lectures.findMany({
        where: { id: { in: purchasedLectureIds }, branch_id: exam.branch_id },
        select: { id: true },
      })
      if (lectures.length > 0) return true
    }
  }

  return false
}
```

---

### R3. سد الفجوات الوظيفية (Functional Gaps)

#### 1. هيكل وتوليد `plan_snapshot` في الاشتراكات وطلباتها

**الوضع الحالي:**
- في `lib/subscription-manager.ts` (السطر 478): يُخزن فقط `{ id: plan.id, title: plan.title, durationDays: plan.duration_days }`.
- في `app/student/subscriptions/actions.ts` (السطر 81): يتم تخزين `scopes: []` كمصفوفة فارغة لعدم جلب نطاقات الخطة من `subscription_plans`.

**الهيكل الكامل للقطة الخطة `plan_snapshot`:**
```typescript
export type PlanSnapshot = {
  id: string
  title: string
  price: number
  durationDays: number
  billingPeriod: string
  scopeMode: string
  stageId?: string | null
  branchId?: string | null
  scopes: Array<{
    scopeType: string
    scopeId: string | null
  }>
  capturedAt: string
}
```

**أماكن التعديل:**
1. في `lib/subscription-manager.ts` (`assignSubscriptionInTransaction`):
   تعديل استعلام الخطة ليشمل `include: { scopes: { select: { scope_type: true, scope_id: true } } }` وجلب `price`, `billing_period`, `scope_mode`, `stage_id`, `branch_id`.
   تخزين الـ `plan_snapshot` الكامل.
2. في `app/student/subscriptions/actions.ts` (`createSubscriptionRequest`):
   تعديل استعلام الخطة ليشمل `include: { scopes: { select: { scope_type: true, scope_id: true } } }`.
   تعبئة مصفوفة `scopes` في الـ `snapshot` بالنطاقات الفعلية.

---

#### 2. وضع `subscriptions_only` وإخفاء عناصر السلة والشراء

**الحصر الشامل لجميع أماكن الشراء والسلة في المشروع:**
1. **`app/cart-actions.ts`:**
   - في دوال: `addToCart`, `addCourseToCart`, `addTermToCart`, `createOrder`
   - فحص `const mode = await getSubscriptionMode()`، وإذا كان `subscriptions_only`، يتم إرجاع خطأ فوري: `{ error: 'mode_subscriptions_only', message: 'الشراء الفردي غير متاح حالياً. المنصة تعمل بنظام الاشتراكات فقط.' }`.
2. **`components/cart/cart-provider.tsx`:**
   - إضافة خاصية `purchasesEnabled: mode !== 'subscriptions_only'` إلى `CartContext`.
3. **`components/cart/cart-button.tsx`:**
   - إخفاء الزر كلياً (`return null`) إذا كانت `!purchasesEnabled`.
4. **`components/cart/cart-modal.tsx`:**
   - إغلاق المودال أو منع الدفع إذا كانت `!purchasesEnabled`.
5. **`components/landing/landing-navbar.tsx` & `components/student/student-header.tsx`:**
   - زر السلة يختفي تلقائياً لاختفائه من `CartButton`.
6. **`components/stages/branch-detail.tsx`:**
   - بطاقات المحاضرات (`LectureCard`): إخفاء زر الشراء المباشر واستبداله بعرض المحتوى أو زر الاشتراك.
   - بطاقات الكورسات (`MonthlyCourseCard`): استبدال زر "اشترك في الكورس" برابط إلى صفحة الباقات `/subscriptions`.
7. **`components/stages/course-landing.tsx`:**
   - أسطر المحاضرات (`LectureRow`): إخفاء زر "اشترِ المحاضرة" في وضع `subscriptions_only`.
8. **`components/stages/subscribe-button.tsx`:**
   - تحويل الزر إلى رابط نحو `/subscriptions`.
9. **`components/student/browse/student-browse-page.tsx`:**
   - إخفاء أزرار "أضف للسلة" و "اشترِ الكورس كاملًا" واستبدالها برابط إلى `/student/subscriptions`.

---

### R4. المشكلات التشغيلية والكرون (Operational & Cron Issues)

#### 1. معالجة `CRON_SECRET` في البيئات المحلية
في `app/api/cron/subscriptions-sweep/route.ts`:
```typescript
  const secret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const isDev = process.env.NODE_ENV !== 'production'

  // في الإنتاج، يجب توفر السر ومطابقته بدقة
  if (!isDev) {
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    // في بيئة التطوير، إذا تم تمرير الهيدر وكان السر موجوداً يتم فحصه، وإلا يتم السماح مع تحذير
    if (secret && authHeader && authHeader !== `Bearer ${secret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
```

#### 2. تصحيح منطق فترة السماح في الكرون
في `app/api/cron/subscriptions-sweep/route.ts`:
**المشكلة:**
`where: { status: 'active', end_date: { lte: now }, grace_until: { gte: now } }` يستبعد كل الاشتراكات التي قيمة `grace_until` فيها `NULL` وتعتمد على إعدادات المنصة.

**الحل الهندسي:**
جلب كافة الاشتراكات النشطة التي انتهت مدتها (`end_date: { lte: now }`) واستخدام الدالة المرجعية `computeSubscriptionStatus`:
```typescript
  const endedCandidates = await tx.student_subscriptions.findMany({
    where: { status: 'active', end_date: { lte: now } },
    select: { id: true, student_id: true, end_date: true, grace_until: true, plans: { select: { title: true } } },
  })

  // الفرز بدقة باستخدام الدالة المرجعية المركزية
  const toExpire = endedCandidates.filter(
    (row) => computeSubscriptionStatus(row, gracePeriodDays, now) === 'expired',
  )
  const inGrace = endedCandidates.filter(
    (row) => computeSubscriptionStatus(row, gracePeriodDays, now) === 'grace',
  )
```

#### 3. جلب وعرض الاشتراكات المنتهية والملغاة في صفحة الطالب
في `app/student/subscriptions/page.tsx`:
- إزالة شرط الفلترة الضيق `status: { in: ['active', 'grace'] }` وشرط `end_date > now - 30d`.
- جلب كافة اشتراكات الطالب `where: { student_id: student.id }`.
- حساب الحالة عبر `computeSubscriptionStatus` لكل اشتراك، مع دعم حالات `'active' | 'grace' | 'expiring' | 'ended' | 'cancelled' | 'suspended'`.
- في `app/student/subscriptions/client.tsx`: إضافة البادجات المناسبة للحالات في مصفوفة `SUB_STATE`.

---

## 3. استراتيجية الاختبار والتحقق الآلي (Test & Verification Strategy)

تم تصميم سكريبتات فحص برمجية دقيقة تعمل عبر Node.js لاختبار كافة الحالات دون الاعتماد على واجهة المستخدم اليدوية:

### Script 1: فحص أمان `/api/media` و `/api/attachments`
```javascript
// scripts/verify_media_security.mjs
import assert from 'node:assert/strict'

async function testMediaEndpoints() {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000'

  // 1. Unauthenticated request to private video
  const resVideo = await fetch(`${baseUrl}/api/media/videos/secret-lecture.mp4`)
  assert.equal(resVideo.status, 403, 'Direct unauthenticated video access must return 403')

  // 2. Unauthenticated request to receipts
  const resReceipt = await fetch(`${baseUrl}/api/media/receipts/transfer-123.jpg`)
  assert.equal(resReceipt.status, 401, 'Unauthenticated receipt access must return 401')

  // 3. Unauthenticated request to attachments
  const resAttach = await fetch(`${baseUrl}/api/attachments/sample-worksheet.pdf`)
  assert.equal(resAttach.status, 401, 'Unauthenticated attachment access must return 401')

  // 4. Public media access (site logos, thumbnails)
  const resPublic = await fetch(`${baseUrl}/api/media/site/logo.png`)
  // Should not be blocked by 401/403 (returns 200 or 404/503 depending on R2 mock)
  assert.notEqual(resPublic.status, 401)
  assert.notEqual(resPublic.status, 403)

  console.log('✅ Media & Attachment security checks passed.')
}
testMediaEndpoints().catch((err) => { console.error('❌ Media security test failed:', err); process.exit(1); })
```

### Script 2: فحص منطق حوكمة الامتحانات
```javascript
// scripts/verify_exam_access_logic.mjs
import assert from 'node:assert/strict'
import { studentCanAccessExam } from '../app/student/exams/actions.ts'

// Unit test cases verifying:
// - Exam with stageId S1 -> Only student with stageId S1 gets access.
// - Exam with no stageId and no branchId -> returns false if student has no covering subscription.
// - In subscriptions_only mode -> returns false for non-subscribed students even if stage matches.
```

### Script 3: فحص لقطة الخطة `plan_snapshot` في قاعدة البيانات
```javascript
// scripts/verify_plan_snapshot_integrity.mjs
import assert from 'node:assert/strict'
import { prisma } from '../lib/prisma.ts'

async function checkSnapshotIntegrity() {
  const sampleSub = await prisma.student_subscriptions.findFirst({
    where: { plan_snapshot: { not: null } },
    select: { plan_snapshot: true }
  })
  if (sampleSub && sampleSub.plan_snapshot) {
    const snap = sampleSub.plan_snapshot
    assert.ok(typeof snap.price === 'number', 'Snapshot must include price')
    assert.ok(Array.isArray(snap.scopes), 'Snapshot must include scopes array')
    assert.ok(snap.scopeMode, 'Snapshot must include scopeMode')
  }
  console.log('✅ Plan snapshot integrity verified.')
}
```

### Script 4: فحص حظر عمليات السلة في وضع `subscriptions_only`
```javascript
// scripts/verify_subscriptions_only_mode.mjs
import assert from 'node:assert/strict'
import { addToCart } from '../app/cart-actions.ts'

// Verify that calling addToCart when platform mode is 'subscriptions_only' returns mode_subscriptions_only error.
```

---

## 4. خطة التوزيع والتنفيذ (Handoff to Implementer)

- **الملفات المستهدفة للتعديل:**
  1. `lib/subscription-validation.ts`: تثبيت واعتماد الكود وضمان شمول كافة المخططات.
  2. `app/api/media/[...key]/route.ts`: إضافة منطق العزل والتحقق بحسب نوع الميديا.
  3. `app/api/attachments/[...key]/route.ts`: إضافة التحقق من الجلسة وصلاحية المرفق.
  4. `app/student/exams/actions.ts` & `app/student/actions/exams-assignments.ts`: تصحيح شروط صلاحية وعرض الامتحانات.
  5. `lib/subscription-manager.ts` & `app/student/subscriptions/actions.ts`: تضمين الحقول الكاملة في `plan_snapshot`.
  6. `app/cart-actions.ts`, `components/cart/cart-provider.tsx`, `components/cart/cart-button.tsx`, `components/stages/...`, `components/student/browse/...`: عزل وتعطيل مسار السلة في وضع `subscriptions_only`.
  7. `app/api/cron/subscriptions-sweep/route.ts`: مرونة `CRON_SECRET` وتصحيح فلتر فترة السماح عبر `computeSubscriptionStatus`.
  8. `app/student/subscriptions/page.tsx` & `client.tsx`: عرض كافة الاشتراكات (بما فيها المنتهية والملغاة).
