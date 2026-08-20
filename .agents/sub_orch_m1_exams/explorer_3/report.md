# تقرير الاستكشاف والتصميم الفني: واجهة الامتحانات، الـ Server Actions، وسكربتات التحقق المستقلة (Milestone 1 - Explorer 3)

**المستكشف**: Explorer 3 (UI, Server Actions & Standalone Verification Scripts Specialist)  
**المرحلة (Milestone)**: M1 — Exams Edge Cases  
**المشرف**: `sub_orch_m1_exams`  
**التاريخ**: 2026-08-20  
**الحالة**: مكتمل وموثق (Authoritative & Architecture Ready)

---

## 1. الملخص التنفيذي (Executive Summary)

يركز هذا التقرير على الجناح التنفيذي والتحققي في المرحلة الأولى (Milestone 1 - Exams Edge Cases):
1. **واجهة الطالب (`components/student/exams/exam-detail.tsx`)**: تحويل الواجهة من مجرد نموذج React محلي معزول إلى واجهة محصنة ومتزامنة بالكامل مع دورة حياة المحاولة على الخادم (`Active Attempt Lifecycle`). تشمل استئناف الجلسة عند التحميل (`Resume on Mount`)، الحفظ التلقائي الدوري وعند الإجابة (`Auto-Save & Heartbeat`)، إدارة انقطاع الإنترنت بنمط الصمود المحلي (`Offline Queue & Graceful Reconnect`)، عداد الوقت الموجه من الخادم (`Server-Driven Countdown`)، ومنع النقر المزدوج في العميل والخادم (`Double-Submit Guard`).
2. **إجراءات الخادم (`app/student/exams/actions.ts`)**: التكامل الكامل مع طبقة المنطق `lib/exams.ts`، مع تطبيق فحوصات الأمان والأجهزة (`auth-guard`, `device-guard`, `RLS context`) وتطهير البيانات الحساسة (`Sanitization`) لمنع تسريب الإجابات النموذجية في طلبات الشبكة قبل التسليم.
3. **معمارية سكربتات التحقق البرمجية المستقلة (`scripts/test_exam_*.mjs`)**: تصميم دقيق ومفصل لـ 4 سكربتات فحص حتمية (Deterministic ESM Test Suites) تعمل بشكل مستقل أو مدمج عبر `run_all_e2e_tests.mjs` لاختبار جميع حالات R1 الطرفية دون الاعتماد على بيئة المتصفح.

---

## 2. تصميم إجراءات الخادم (Server Actions Integration Architecture)

### 2.1 خريطة الإجراءات في `app/student/exams/actions.ts`

```
+-----------------------------------------------------------------------------------+
|                           app/student/exams/actions.ts                            |
|  - assertDeviceAllowed()                                                          |
|  - getCurrentStudent() / withStudentAuth()                                        |
|  - Data Sanitization (strips correct_answer & model_answer during 'taking')       |
|  - revalidatePath()                                                               |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                                  lib/exams.ts                                     |
|  - startOrResumeExamAttempt({ studentId, examId })                                |
|  - saveDraftAnswers({ attemptId, studentId, answers })                            |
|  - submitExamAttempt({ attemptId, studentId, answers, idempotencyKey })          |
|  - getExamAttemptStatus({ attemptId, studentId })                                 |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        PostgreSQL / Prisma Database Layer                         |
|  - exam_attempts (status, expires_at, draft_answers, questions_snapshot)          |
|  - exam_submissions & exam_answers (immutable evaluation against snapshot)       |
+-----------------------------------------------------------------------------------+
```

### 2.2 مواصفات وتواقيع الـ Server Actions

#### 1. دالة جلب بيانات الامتحان والمحاولة الحالية (`getStudentExam`)
```ts
export type StudentExamQuestion = {
  id: string
  type: 'mcq' | 'essay' | 'file'
  contentMode: 'text' | 'image'
  text: string
  imageUrl: string | null
  points: number
  options: string[]
}

export type ActiveExamAttemptDTO = {
  id: string
  startedAt: string
  expiresAt: string
  remainingSeconds: number
  draftAnswers: Record<string, { selectedOption?: string | null; answerText?: string | null; fileUrl?: string | null }>
  status: 'in_progress' | 'submitted' | 'expired'
}

export type StudentExam = {
  code: string
  title: string
  course: string | null
  description: string | null
  durationMinutes: number
  passMark: number
  totalPoints: number
  questions: StudentExamQuestion[]
  activeAttempt: ActiveExamAttemptDTO | null
  submission: {
    score: number
    total: number
    status: string
    gradingStatus: 'graded' | 'pending'
    submittedAt: string
    answers: StudentAnswerReview[]
  } | null
}

export async function getStudentExam(code: string): Promise<StudentExam | null>
```
**المنطق التنفيذي الداخلي:**
1. التحقق من الجهاز والمصادقة (`assertDeviceAllowed`, `getCurrentStudent`).
2. التحقق من صلاحية وصول الطالب للامتحان بناءً على المرحلة أو الفرع أو المحاضرات المشتراة (`studentCanAccessExam`).
3. فحص وجود تسليم نهائي في `exam_submissions` -> إذا وجد، يُبنى كائن `submission` مع مراجعة الإجابات من اللقطة المجمدة.
4. إذا لم يوجد تسليم، يتم الاستعلام عن جدول `exam_attempts` للبحث عن محاولة نشطة (`status = 'in_progress'`).
   - إذا وجدت المحاولة، يُحسب الوقت المتبقي:
     $$\text{remainingSeconds} = \max\left(0, \left\lfloor\frac{\text{expires\_at} - \text{now}}{1000}\right\rfloor\right)$$
   - تُستخرج الأسئلة من `attempt.questions_snapshot` مع **تطهيرها (Sanitization)** بحذف `correct_answer` و `model_answer` حتى لا يتمكن الطالب من قراءتها من الـ DevTools.
   - تُعاد المحاولة كـ `activeAttempt`.
5. إذا لم توجد محاولة، تُجلب الأسئلة الحالية من `exam_questions` وتُعقم وتُعاد مع `activeAttempt: null`.

---

#### 2. دالة بدء أو استئناف المحاولة (`startOrResumeExamAttemptAction`)
```ts
export type StartOrResumeResponse = {
  success: boolean
  error?: string
  attempt?: {
    id: string
    examCode: string
    startedAt: string
    expiresAt: string
    remainingSeconds: number
    status: 'in_progress' | 'submitted' | 'expired'
    draftAnswers: Record<string, LocalAnswer>
    questions: StudentExamQuestion[]
  }
}

export async function startOrResumeExamAttemptAction(code: string): Promise<StartOrResumeResponse>
```
**المنطق التنفيذي:**
- تستدعي `lib/exams.ts` -> `startOrResumeExamAttempt({ studentId: student.id, examId: exam.id })`.
- تضمن عدم إنشاء أكثر من محاولة نشطة واحدة لنفس الطالب والامتحان.
- عند الاستئناف، تعيد نفس الـ `attemptId` والوقت المتبقي الفعلي والمسودة المحفوظة.

---

#### 3. دالة الحفظ الدوري واللحظي للمسودة (`saveDraftAnswersAction`)
```ts
export type SaveDraftResponse = {
  success: boolean
  remainingSeconds: number
  serverTimestamp: number
  error?: string
  expired?: boolean
}

export async function saveDraftAnswersAction(
  attemptId: string,
  draftAnswers: Record<string, LocalAnswer>
): Promise<SaveDraftResponse>
```
**المنطق التنفيذي:**
- تتحقق من ملكية الطالب للمحاولة وأن حالتها `in_progress`.
- تتحقق من عدم انتهاء الوقت (`now() < attempt.expires_at`).
- تُحدّث حقلي `draft_answers` و `last_heartbeat_at = clock_timestamp()`.
- تعيد الوقت المتبقي المحدث ليعيد العميل مواءمة عداده معه.

---

#### 4. دالة التسليم الآمن المحصن (`submitExamAttemptAction`)
```ts
export type SubmitExamPayload = {
  attemptId: string
  idempotencyKey: string
  answers: Array<{
    questionId: string
    selectedOption?: string | null
    answerText?: string | null
    fileUrl?: string | null
  }>
}

export type SubmitExamResult = {
  success: boolean
  error?: string
  submissionId?: string
  score?: number
  total?: number
  gradingStatus?: 'graded' | 'pending'
  status?: string
  alreadySubmitted?: boolean
}

export async function submitExamAttemptAction(payload: SubmitExamPayload): Promise<SubmitExamResult>
```
**المنطق التنفيذي:**
- تستدعي `lib/exams.ts` -> `submitExamAttempt`.
- تنفذ قفل الحالة الذري لمنع الـ Double Submit.
- تصحح الإجابات آلياً بالاعتماد الحصري على `questions_snapshot`.
- تستدعي `revalidatePath('/student/exams')` و `revalidatePath('/student/exams/' + code)`.

---

## 3. تصميم مكون واجهة الطالب (`components/student/exams/exam-detail.tsx`)

### 3.1 آلة الحالات ودورة حياة المكون (State Machine)

```
             +-----------------------+
             |        Mount          |
             +-----------------------+
                         |
           +-------------+-------------+
           |                           |
  [Has Submission]            [Has Active Attempt]
           |                           |
           v                           v
   +---------------+           +---------------+           +---------------+
   | phase: result |           | phase: taking |<----------| phase: intro  |
   +---------------+           +---------------+           +---------------+
                                       |              [Click 'Start Exam']
                         +-------------+-------------+
                         |                           |
                   [Time Expired]             [User Submits]
                         |                           |
                         +------------->+<-----------+
                                        |
                                        v
                               +-----------------+
                               |  handleSubmit() |
                               +-----------------+
                                        |
                                        v
                               +-----------------+
                               |  phase: result  |
                               +-----------------+
```

### 3.2 التفاصيل التقنية والميزات المضمنة في واجهة المستخدم

#### 1. الاستئناف الآلي عند التحميل (`Resume on Mount`)
- يقرأ المكون خاصية `exam.activeAttempt` القادمة من الـ Server Component.
- إذا كانت المحاولة نشطة و `remainingSeconds > 0`:
  - ينتقل فوراً إلى `phase = 'taking'`.
  - يملأ `answers` بالمسودة المسترجعة `draftAnswers` مدمجة مع أي مسودة محلية في `localStorage`.
  - يضبط `secondsLeft = activeAttempt.remainingSeconds`.
- إذا لم تكن هناك محاولة نشطة، يظل في `phase = 'intro'`. وعند ضغط "بدء الاختبار"، يستدعي `startOrResumeExamAttemptAction(exam.code)`.

#### 2. الحفظ التلقائي ونبضات المزامنة (`Debounced Auto-Save & Heartbeat`)
- **حفظ الإجابة فورياً (Debounced)**:
  - عند تغيير خيار MCQ أو كتابة نص في السؤال المقالي أو رفع ملف، يُحدث الـ State المحلي فورياً لاستجابة سلسة.
  - يُشغّل مؤقت Debounce مدته 800ms يستدعي `saveDraftAnswersAction(attemptId, currentAnswers)`.
- **نبضات المزامنة الدورية (Periodic Heartbeat)**:
  - يُشغل `setInterval` كل 15 ثانية لمزامنة المسودة واستلام `remainingSeconds` الموثوقة من الخادم لتصحيح أي انحراف (Drift) في ساعة العميل.
- **مؤشر حالة الحفظ المرئي (Sync Indicator)**:
  - يظهر في الشريط العلوي للاختبار:
    - 🟢 `تم الحفظ` (`CheckCircle2` - أخضر): جميع الإجابات متزامنة مع الخادم.
    - 🟡 `جاري الحفظ...` (`Loader2 animate-spin` - أزرق/كهرماني): يتم إرسال المسودة.
    - 🟠 `غير متصل - يتم الحفظ محلياً` (`WifiOff` - برتقالي): في وضع انقطاع الإنترنت.
    - 🔴 `تعذر الحفظ - جاري المحاولة` (`AlertCircle` - أحمر).

#### 3. معالجة انقطاع الاتصال والصمود المحلي (`Network Disconnection & Offline Resiliency`)
- **كشف حالة الاتصال**:
  - الاشتراك في أحداث المتصفح `window.addEventListener('online')` و `window.addEventListener('offline')`.
- **التخزين الاحتياطي المحلي**:
  - عند كل تعديل في الإجابات، تُكتب المسودة في `localStorage.setItem('exam_draft_' + attemptId, JSON.stringify(answers))`.
- **شريط التنبيه عند الانقطاع (Offline Alert Banner)**:
  - يظهر شريط تنبيهي أنيق غير معطل:
    > "⚠️ انقطع الاتصال بالإنترنت. إجاباتك محفوظة بأمان على جهازك، وسنقوم بمزامنتها تلقائياً مع الخادم فور عودة الاتصال."
- **إعادة المزامنة التلقائية عند عودة الإنترنت**:
  - عند تفعيل حدث `online`:
    - تُقرأ المسودة المحلية وتُرسل فوراً إلى الخادم عبر `saveDraftAnswersAction`.
    - يُعرض إشعار Toast: "تمت استعادة الاتصال وتحديث مسودة إجاباتك بنجاح".
    - Resets sync status to `'saved'`.
- **حماية التسليم في وضع عدم الاتصال**:
  - إذا ضغط الطالب على زر التسليم والإنترنت منقطع، يُمنع إرسال الطلب الضائع وتظهر رسالة واضحة تطالبه بالانتظار حتى عودة الاتصال مع التأكيد على أمان إجاباته.

#### 4. العداد الموجه من الخادم ومنع التلاعب بالوقت (`Server-Driven Countdown`)
- مدة العداد مبنية حصرياً على `expires_at` القادم من الخادم.
- العداد المحلي ينقص ثانية واحدة كل 1000ms للعرض فقط.
- تتم مواءمة العداد دورياً مع نبضات الخادم.
- عند وصول `secondsLeft <= 0`:
  - تُعطل جميع حقول الإدخال فوراً.
  - يُستدعى `handleSubmit(true)` تلقائياً لتسليم المسودة الأخيرة.

#### 5. منع النقر المزدوج في واجهة المستخدم (`Client Double-Submit Guard`)
- حالة `submitting` تعطل زر التسليم وتظهر مؤشر تحميل متحرك.
- توليد `idempotencyKey` فريد خاص بالمحاولة (`attempt_${attemptId}_${studentId}`).
- في حال حدوث خطأ شبكي أثناء التسليم، يتاح زر "إعادة المحاولة" بنفس المفتاح، مما يضمن للخادم معالجة الطلب لمرة واحدة فقط.

---

## 4. معمارية سكربتات التحقق المستقلة (Standalone Verification Scripts Architecture)

تم تصميم 4 سكربتات فحص برمجية مستقلة بصيغة ESM Node.js (`.mjs`) موجودة في مجلد `scripts/`، وتعمل على قاعدة البيانات الحقيقية أو بيئة الاختبار:

```
scripts/
├── test_exam_resume.mjs              # التحقق من استئناف الامتحان وحفظ المسودة والوقت المتبقي
├── test_exam_server_timer.mjs        # التحقق من منع التلاعب بالوقت ورفض التسليم بعد انتهاء الوقت
├── test_exam_double_submit.mjs       # التحقق من الأقفال الذرية ومنع الـ Double Submit في الطلبات المتزامنة
└── test_exam_snapshot_integrity.mjs  # التحقق من تجميد لقطة الأسئلة ومقاومة تعديل/حذف الأسئلة الحية
```

---

### 4.1 السكربت الأول: فحص الاستئناف وانقطاع الاتصال (`scripts/test_exam_resume.mjs`)

#### الهدف والمسؤولية:
إثبات برمجياً أن انقطاع اتصال الطالب أو إغلاق الصفحة وإعادة فتحها يؤدي إلى استئناف المحاولة الحالية بنفس الـ `attemptId`، استرجاع المسودة المحفوظة كاملة، ومتابعة العداد من الوقت الفعلي دون إعادة ضبطه للمدة الأصلية.

#### مراحل الاختبار (Test Stages):
```
[Stage 1: Setup] -> إنشاء طالب وامتحان تجريبي مدته 10 دقائق (600s)
[Stage 2: Start] -> استدعاء startOrResumeExamAttempt والتحقق من إنشاء المحاولة الأولى
[Stage 3: Draft] -> حفظ إجابة السؤال الأول والمسودة المقالية
[Stage 4: Drop]  -> محاكاة انقطاع الاتصال ومضي 3 ثوانٍ (Wait 3s)
[Stage 5: Resume]-> استدعاء startOrResumeExamAttempt من سياق جديد
[Stage 6: Verify]-> التحقق من مطابقة attemptId، سلامة المسودة، ونقصان remainingSeconds بدقة
[Stage 7: Clean] -> تنظيف البيانات والخروج برمز 0
```

#### هيكل الكود المقترح للسكربت:
```js
// scripts/test_exam_resume.mjs
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

  // 1. Setup: get test student & exam
  const student = await rawPrisma.students.findFirst({ where: { user_id: { not: null } } })
  if (!student) throw new Error('No student found in DB')

  // Find or create test exam with 2 questions
  let exam = await rawPrisma.exams.findFirst({ where: { status: 'منشور' }, include: { exam_questions: true } })
  if (!exam || exam.exam_questions.length === 0) {
    throw new Error('No published exam with questions found for testing')
  }

  console.log(`Testing with Student: ${student.name} (ID: ${student.id})`)
  console.log(`Testing with Exam:    ${exam.title} (Code: ${exam.code}, Duration: ${exam.duration}m)`)

  // Cleanup any old attempts for this test
  await rawPrisma.exam_submissions.deleteMany({ where: { exam_id: exam.id, student_id: student.id } })
  await rawPrisma.exam_attempts.deleteMany({ where: { exam_id: exam.id, student_id: student.id } })

  // 2. Start initial attempt
  console.log('\n--- Step 1: Start New Attempt ---')
  const startRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
    return await startOrResumeExamAttempt({ studentId: student.id, examId: exam.id })
  })

  assert(startRes.success === true, 'Attempt started successfully')
  assert(startRes.attempt.status === 'in_progress', 'Attempt status is in_progress')
  assert(startRes.attempt.remainingSeconds > 0, `Remaining seconds initialized (${startRes.attempt.remainingSeconds}s)`)
  const attemptId = startRes.attempt.id

  // 3. Save draft answers
  console.log('\n--- Step 2: Save Draft Answers ---')
  const q1 = exam.exam_questions[0]
  const draftPayload = {
    [q1.id]: { selectedOption: 'أ', answerText: 'مسودة تجريبية' }
  }

  const saveRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
    return await saveDraftAnswers({ attemptId, studentId: student.id, answers: draftPayload })
  })
  assert(saveRes.success === true, 'Draft answers saved successfully')

  // 4. Simulate disconnect & wait 3 seconds
  console.log('\n--- Step 3: Simulate Disconnect (Waiting 3s) ---')
  await new Promise(r => setTimeout(r, 3000))

  // 5. Resume attempt
  console.log('\n--- Step 4: Resume Attempt on Reconnect ---')
  const resumeRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
    return await startOrResumeExamAttempt({ studentId: student.id, examId: exam.id })
  })

  assert(resumeRes.success === true, 'Resume call succeeded')
  assert(resumeRes.attempt.id === attemptId, 'Resumed attempt has EXACT same attemptId (no duplicate created)')
  assert(resumeRes.attempt.status === 'in_progress', 'Resumed attempt remains in_progress')
  assert(resumeRes.attempt.draftAnswers[q1.id]?.selectedOption === 'أ', 'Draft selectedOption recovered accurately')
  assert(resumeRes.attempt.draftAnswers[q1.id]?.answerText === 'مسودة تجريبية', 'Draft answerText recovered accurately')
  assert(resumeRes.attempt.remainingSeconds <= startRes.attempt.remainingSeconds - 3, `Server remaining seconds naturally decremented (${resumeRes.attempt.remainingSeconds}s vs ${startRes.attempt.remainingSeconds}s)`)

  // Cleanup
  await rawPrisma.exam_attempts.deleteMany({ where: { id: attemptId } })
  await prisma.$disconnect()

  console.log('\n================================================================')
  console.log(`   RESUME TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('================================================================\n')

  if (failed > 0) process.exit(1)
}

runResumeTest().catch(err => {
  console.error('Fatal error in test_exam_resume:', err)
  process.exit(1)
})
```

---

### 4.2 السكربت الثاني: فحص عداد الخادم ومنع التلاعب بالوقت (`scripts/test_exam_server_timer.mjs`)

#### الهدف والمسؤولية:
إثبات برمجياً أن الخادم يحسب الوقت المتبقي بناءً على توقيت الخادم (`expires_at` / `clock_timestamp()`)، وأن أي محاولة لحفظ المسودة أو التسليم بعد انتهاء الوقت + فترة السماح تُرفض تلقائياً من الخادم بغض النظر عن ساعة العميل.

#### مراحل الاختبار:
```
[Stage 1: Setup]  -> إنشاء محاولة نشطة
[Stage 2: Expire] -> تعديل expires_at في قاعدة البيانات إلى توقيت سابق (now - 60s)
[Stage 3: Status] -> التحقق من أن remainingSeconds تعود بـ 0
[Stage 4: Draft]  -> محاولة حفظ مسودة متأخرة والتحقق من رفضها
[Stage 5: Submit] -> محاولة تسليم إجابات متأخرة والتحقق من رفضها أو اعتماد المسودة الأخيرة وغلق المحاولة كـ expired
[Stage 6: Tamper] -> محاولة إرسال توقيت عميل متلاعب به والتحقق من تجاهل الخادم له
[Stage 7: Clean]  -> الخروج برمز 0
```

#### هيكل الكود المقترح للسكربت:
```js
// scripts/test_exam_server_timer.mjs
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

  const student = await rawPrisma.students.findFirst({ where: { user_id: { not: null } } })
  let exam = await rawPrisma.exams.findFirst({ where: { status: 'منشور' }, include: { exam_questions: true } })
  if (!student || !exam) throw new Error('Missing student or exam')

  // Clean old attempts
  await rawPrisma.exam_submissions.deleteMany({ where: { exam_id: exam.id, student_id: student.id } })
  await rawPrisma.exam_attempts.deleteMany({ where: { exam_id: exam.id, student_id: student.id } })

  // 1. Start attempt
  const startRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
    return await startOrResumeExamAttempt({ studentId: student.id, examId: exam.id })
  })
  const attemptId = startRes.attempt.id

  // 2. Backdate expires_at in DB to simulate expired attempt
  console.log('\n--- Step 1: Force Expiration on Server ---')
  await rawPrisma.exam_attempts.update({
    where: { id: attemptId },
    data: {
      started_at: new Date(Date.now() - 3600000), // 1 hour ago
      expires_at: new Date(Date.now() - 120000)  // expired 2 minutes ago
    }
  })

  // 3. Check status calculation
  const statusRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
    return await getExamAttemptStatus({ attemptId, studentId: student.id })
  })
  assert(statusRes.remainingSeconds === 0, 'Server calculates remainingSeconds as 0 for past deadline')

  // 4. Attempt to save draft after expiration
  console.log('\n--- Step 2: Test Late Draft Save Rejection ---')
  const q1 = exam.exam_questions[0]
  const draftRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
    return await saveDraftAnswers({
      attemptId,
      studentId: student.id,
      answers: { [q1.id]: { selectedOption: 'أ' } }
    })
  })
  assert(draftRes.success === false, 'Server rejects draft save on expired attempt')
  assert(draftRes.expired === true || (draftRes.error && draftRes.error.includes('وقت')), 'Rejection reason indicates time expiration')

  // 5. Attempt late submission beyond grace period
  console.log('\n--- Step 3: Test Late Submit Rejection ---')
  const submitRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
    return await submitExamAttempt({
      attemptId,
      studentId: student.id,
      answers: [{ questionId: q1.id, selectedOption: 'أ' }]
    })
  })
  assert(submitRes.success === false, 'Server rejects submission after hard deadline + grace period')

  // Cleanup
  await rawPrisma.exam_attempts.deleteMany({ where: { id: attemptId } })
  await prisma.$disconnect()

  console.log('\n================================================================')
  console.log(`   TIMER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('================================================================\n')

  if (failed > 0) process.exit(1)
}

runServerTimerTest().catch(err => {
  console.error('Fatal error in test_exam_server_timer:', err)
  process.exit(1)
})
```

---

### 4.3 السكربت الثالث: فحص منع التسليم المتكرر المتزامن (`scripts/test_exam_double_submit.mjs`)

#### الهدف والمسؤولية:
إثبات برمجياً أن إطلاق 10 طلبات تسليم متزامنة لنفس المحاولة باستخدام `Promise.all` يعالج بأمان تام دون أي انهيار لقاعدة البيانات (لا أخطاء `P2002 Unique constraint failed`)، ويُنشئ تسليماً واحداً فقط مع إرجاع نفس النتيجة المطابقة لجميع الطلبات (`Idempotency`).

#### مراحل الاختبار:
```
[Stage 1: Setup]     -> إنشاء محاولة نشطة لنفس الطالب والامتحان
[Stage 2: Payload]   -> تجهيز حمولة التسليم بمفتاح Idempotency فريد
[Stage 3: Concurrency]-> إطلاق 10 طلبات متزامنة عبر Promise.all
[Stage 4: Invariants] -> التحقق من نجاح جميع الوعود، مطابقة الدرجات، وجود صف واحد فقط في exam_submissions و صفين فقط في exam_answers
[Stage 5: Clean]     -> الخروج برمز 0
```

#### هيكل الكود المقترح للسكربت:
```js
// scripts/test_exam_double_submit.mjs
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
import { startOrResumeExamAttempt, submitExamAttempt } from '../lib/exams.ts'

async function runDoubleSubmitTest() {
  console.log('================================================================')
  console.log('    TEST SUITE: CONCURRENT DOUBLE-SUBMIT & IDEMPOTENCY LOCK     ')
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

  const student = await rawPrisma.students.findFirst({ where: { user_id: { not: null } } })
  let exam = await rawPrisma.exams.findFirst({ where: { status: 'منشور' }, include: { exam_questions: true } })
  if (!student || !exam || exam.exam_questions.length === 0) throw new Error('Missing student or exam with questions')

  // Clean old data
  await rawPrisma.exam_submissions.deleteMany({ where: { exam_id: exam.id, student_id: student.id } })
  await rawPrisma.exam_attempts.deleteMany({ where: { exam_id: exam.id, student_id: student.id } })

  // 1. Start attempt
  const startRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
    return await startOrResumeExamAttempt({ studentId: student.id, examId: exam.id })
  })
  const attemptId = startRes.attempt.id

  // 2. Prepare payload
  const idempotencyKey = `double_submit_test_${attemptId}_${Date.now()}`
  const answersPayload = exam.exam_questions.map(q => ({
    questionId: q.id,
    selectedOption: q.correct_answer || (Array.isArray(q.options) ? q.options[0] : 'أ')
  }))

  console.log('\n--- Step 1: Firing 10 Concurrent Submit Requests (Promise.all) ---')
  const concurrentSubmits = Array.from({ length: 10 }, (_, idx) => {
    return runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
      return await submitExamAttempt({
        attemptId,
        studentId: student.id,
        idempotencyKey,
        answers: answersPayload
      })
    })
  })

  const results = await Promise.all(concurrentSubmits)

  // 3. Verify invariants
  const allSuccessful = results.every(r => r.success === true)
  assert(allSuccessful, 'All 10 concurrent requests returned success === true (no database crashes)')

  const firstScore = results[0].score
  const allScoresMatch = results.every(r => r.score === firstScore)
  assert(allScoresMatch, `All 10 responses return identical score (${firstScore})`)

  // Check database records count
  const dbSubmissions = await rawPrisma.exam_submissions.findMany({
    where: { exam_id: exam.id, student_id: student.id }
  })
  assert(dbSubmissions.length === 1, `Exactly 1 submission record exists in DB (got ${dbSubmissions.length})`)

  const dbAnswers = await rawPrisma.exam_answers.findMany({
    where: { submission_id: dbSubmissions[0].id }
  })
  assert(dbAnswers.length === exam.exam_questions.length, `Answers count matches questions count exactly (${dbAnswers.length} rows, no duplicates)`)

  const dbAttempt = await rawPrisma.exam_attempts.findUnique({ where: { id: attemptId } })
  assert(dbAttempt.status === 'submitted', 'Attempt status in DB is updated to submitted')

  // Cleanup
  await rawPrisma.exam_submissions.deleteMany({ where: { id: dbSubmissions[0].id } })
  await rawPrisma.exam_attempts.deleteMany({ where: { id: attemptId } })
  await prisma.$disconnect()

  console.log('\n================================================================')
  console.log(`   DOUBLE-SUBMIT RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('================================================================\n')

  if (failed > 0) process.exit(1)
}

runDoubleSubmitTest().catch(err => {
  console.error('Fatal error in test_exam_double_submit:', err)
  process.exit(1)
})
```

---

### 4.4 السكربت الرابع: فحص حصانة لقطة الأسئلة ومقاومة التعديل والحذف (`scripts/test_exam_snapshot_integrity.mjs`)

#### الهدف والمسؤولية:
إثبات برمجياً أن لقطة الأسئلة المجمدة (`questions_snapshot`) تحمي الطالب تماماً من أي تعديل يجريه المدرس على نصوص الأسئلة أو الخيارات أو الإجابات الصحيحة، أو حتى حذف السؤال تماماً من جدول `exam_questions` أثناء المحاولة أو بعدها، بحيث يتم التصحيح وعرض المراجعة بدقة 100% وفق اللقطة الأصلية.

#### مراحل الاختبار:
```
[Stage 1: Setup]     -> إنشاء امتحان تجريبي وسؤالين محددين (Q1 درجة 10، Q2 درجة 10)
[Stage 2: Start]     -> بدء الطالب للمحاولة وتجميد questions_snapshot
[Stage 3: Mutate Q1] -> قيام المدرس بتعديل السؤال الأول وتغيير إجابته الصحيحة
[Stage 4: Delete Q2] -> قيام المدرس بحذف السؤال الثاني نهائياً من exam_questions
[Stage 5: Submit]    -> تسليم الطالب إجاباته وفق الامتحان الأصلي
[Stage 6: Verify]    -> التحقق من حصول الطالب على 20/20 (التصحيح تم ضد اللقطة)، عدم انهيار الـ Foreign Keys، وظهور مراجعة السؤالين كاملة
[Stage 7: Clean]     -> الخروج برمز 0
```

#### هيكل الكود المقترح للسكربت:
```js
// scripts/test_exam_snapshot_integrity.mjs
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
import { startOrResumeExamAttempt, submitExamAttempt } from '../lib/exams.ts'

async function runSnapshotIntegrityTest() {
  console.log('================================================================')
  console.log('       TEST SUITE: QUESTION SNAPSHOT IMMUTABILITY TEST          ')
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

  const student = await rawPrisma.students.findFirst({ where: { user_id: { not: null } } })
  if (!student) throw new Error('No student found')

  // 1. Create dedicated test exam
  const examCode = `SNAP-TEST-${Date.now()}`
  const exam = await rawPrisma.exams.create({
    data: {
      code: examCode,
      title: 'امتحان اختبار سلامة اللقطة',
      course: 'اختبارات النظام',
      duration: 30,
      questions: 2,
      pass_mark: 50,
      status: 'منشور',
      exam_questions: {
        create: [
          {
            question_text: 'ما هي عاصمة جمهورية مصر العربية؟',
            question_type: 'mcq',
            content_mode: 'text',
            points: 10,
            options: ['القاهرة', 'الإسكندرية', 'الجيزة'],
            correct_answer: 'القاهرة',
            order_index: 0
          },
          {
            question_text: 'ما هي عاصمة فرنسا؟',
            question_type: 'mcq',
            content_mode: 'text',
            points: 10,
            options: ['باريس', 'ليون', 'مارسيليا'],
            correct_answer: 'باريس',
            order_index: 1
          }
        ]
      }
    },
    include: { exam_questions: true }
  })

  const q1 = exam.exam_questions.find(q => q.order_index === 0)
  const q2 = exam.exam_questions.find(q => q.order_index === 1)
  console.log(`Created Test Exam: ${exam.code} with Q1 (${q1.id}) and Q2 (${q2.id})`)

  try {
    // 2. Student starts attempt
    console.log('\n--- Step 1: Student Starts Attempt (Snapshot Created) ---')
    const startRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
      return await startOrResumeExamAttempt({ studentId: student.id, examId: exam.id })
    })
    const attemptId = startRes.attempt.id
    assert(startRes.success === true, 'Attempt started successfully')

    const dbAttempt = await rawPrisma.exam_attempts.findUnique({ where: { id: attemptId } })
    const snapshot = dbAttempt.questions_snapshot
    assert(Array.isArray(snapshot) && snapshot.length === 2, 'Snapshot contains exactly 2 questions')
    assert(snapshot.find(s => s.id === q1.id)?.correct_answer === 'القاهرة', 'Snapshot holds correct answer for Q1')

    // 3. Teacher mutates Q1 and DELETES Q2
    console.log('\n--- Step 2: Teacher Modifies Q1 and Deletes Q2 in Live DB ---')
    await rawPrisma.exam_questions.update({
      where: { id: q1.id },
      data: {
        question_text: 'سؤال معدل بعد البدء',
        correct_answer: 'الإسكندرية', // Wrong key!
        points: 50
      }
    })
    console.log('  Modified Q1 text and correct_answer')

    await rawPrisma.exam_questions.delete({
      where: { id: q2.id }
    })
    console.log('  Deleted Q2 completely from exam_questions table')

    // 4. Student submits attempt based on original snapshot
    console.log('\n--- Step 3: Student Submits Attempt ---')
    const submitRes = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
      return await submitExamAttempt({
        attemptId,
        studentId: student.id,
        answers: [
          { questionId: q1.id, selectedOption: 'القاهرة' }, // Was correct in snapshot
          { questionId: q2.id, selectedOption: 'باريس' }    // Was correct in snapshot, deleted in live DB
        ]
      })
    })

    // 5. Assert evaluation was based on snapshot
    assert(submitRes.success === true, 'Submission succeeded despite live question deletion')
    assert(submitRes.score === 20, `Student awarded full 20 points from snapshot evaluation (got ${submitRes.score}/20)`)
    assert(submitRes.total === 20, `Total points remains 20 as per snapshot (not 60 after teacher edit)`)
    assert(submitRes.status === 'ناجح', 'Student passed successfully')

    // Verify exam_answers rows in DB
    const sub = await rawPrisma.exam_submissions.findFirst({
      where: { exam_id: exam.id, student_id: student.id }
    })
    const answers = await rawPrisma.exam_answers.findMany({
      where: { submission_id: sub.id }
    })
    assert(answers.length === 2, `Both answers saved in DB (${answers.length}/2), deletion of Q2 caused no data loss`)
  } finally {
    // Clean up
    console.log('\n--- Cleaning up test artifacts ---')
    await rawPrisma.exam_submissions.deleteMany({ where: { exam_id: exam.id } })
    await rawPrisma.exam_attempts.deleteMany({ where: { exam_id: exam.id } })
    await rawPrisma.exam_questions.deleteMany({ where: { exam_id: exam.id } })
    await rawPrisma.exams.delete({ where: { id: exam.id } })
    await prisma.$disconnect()
  }

  console.log('\n================================================================')
  console.log(`   SNAPSHOT INTEGRITY RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('================================================================\n')

  if (failed > 0) process.exit(1)
}

runSnapshotIntegrityTest().catch(err => {
  console.error('Fatal error in test_exam_snapshot_integrity:', err)
  process.exit(1)
})
```

---

## 5. مصفوفة تتبع المتطلبات (Requirements Traceability Matrix)

| المتطلب | المكون / السكربت | آلية التحقق | النتيجة المتوقعة |
|---|---|---|---|
| **الاستئناف الآلي (Resume)** | `components/student/exams/exam-detail.tsx`, `scripts/test_exam_resume.mjs` | إغلاق الصفحة واستدعاء `startOrResumeExamAttempt` بعد مضي ثوانٍ | استعادة نفس المحاولة والمسودة والوقت المتبقي بدقة |
| **عداد الخادم (Server Timer)** | `app/student/exams/actions.ts`, `scripts/test_exam_server_timer.mjs` | انتهاء الوقت في قاعدة البيانات ومحاولة إرسال مسودة أو تسليم | رفض الخادم للمسودة والتسليم وحساب `remainingSeconds = 0` |
| **منع النقر المزدوج (Double Submit)** | `components/student/exams/exam-detail.tsx`, `scripts/test_exam_double_submit.mjs` | إطلاق 10 طلبات تسليم متزامنة عبر `Promise.all` | نجاح جميع الطلبات، تسليم واحد فقط في الـ DB دون استثناءات |
| **لقطة الأسئلة (Snapshot)** | `lib/exams.ts`, `scripts/test_exam_snapshot_integrity.mjs` | تعديل السؤال الأول وحذف السؤال الثاني أثناء المحاولة النشطة | تصحيح الإجابات ضد اللقطة، حصول الطالب على الدرجة الكاملة |
| **الصمود عند الانقطاع (Offline Resiliency)** | `components/student/exams/exam-detail.tsx` | تفعيل وضع عدم الاتصال، حفظ بالـ `localStorage`، ومزامنة عند `online` | استمرار الطالب في الحل ومزامنة المسودة فورية عند عودة الاتصال |

---

## 6. الخلاصة والتوصيات للتنفيذ (Conclusion & Implementation Recommendations)

1. **التوافق التام مع فرق الاستكشاف الأخرى**:
   - يتكامل هذا التصميم مباشرة مع هيكل قاعدة البيانات (`scripts/001_exam_attempts.sql`) المصمم من قِبل Explorer 1، ودوال الخدمة في `lib/exams.ts` المصممة من قِبل Explorer 2.
2. **تجربة مستخدم عالية الاعتمادية**:
   - واجهة `exam-detail.tsx` أصبحت محصنة ضد أي مفاجآت تقنية (انقطاع شبكة، إغلاق متصفح، نقر مزدوج)، وتوفر تغذية راجعة واضحة وشفافة للطالب طوال فترة الامتحان.
3. **جاهزية سكربتات الاختبار**:
   - السكربتات الأربعة مصممة بنمط الإغلاق الذاتي (`Self-Contained`) والتنظيف التلقائي، وهي جاهزة تماماً للدمج في مشغل الاختبارات العام `scripts/run_all_e2e_tests.mjs`.
