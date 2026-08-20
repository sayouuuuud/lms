# تقرير الاستكشاف الشامل: نظام الامتحانات وإدارة الحالات الطرفية (R1 - Exams Edge Cases)
**المستكشف**: Survey Explorer 1 (Exams System Specialist)  
**التاريخ**: 2026-08-20  
**حالة التقرير**: مكتمل وشامل (Authoritative & Verified)

---

## 1. الملخص التنفيذي (Executive Summary)

تم فحص ومطابقة كود منصة LMS بالكامل فيما يتعلق بمنظومة الامتحانات (`exams`)، الأسئلة (`exam_questions`)، التسليمات (`exam_submissions`)، وإجابات الطلاب (`exam_answers`)، بالإضافة إلى بنك الأسئلة (`question_bank`)، شجرة الفروع والمراحل (`stages`, `branches`, `lectures`)، وآليات المصادقة وتأمين الأجهزة (`auth-guard`, `device-guard`, `prisma RLS`).

### النتيجة الرئيسية:
النظام الحالي يحتوي على هيكل بيانات أولي جيد لإدارة الامتحانات والتسليم، لكنه **يفتقر كليًا إلى مفهوم "جلسة/محاولة الامتحان النشطة" (`Exam Attempt Lifecycle`)**. حاليًا، إدارة المحاولة بالكامل (الوقت، الإجابات، بدء الامتحان) تتم محليًا في ذاكرة المتصفح (React State) دون أي وجود على الخادم حتى لحظة الضغط على زر "تسليم الاختبار".

هذا التصميم ينتج عنه 4 ثغرات حرجة تتطابق مع متطلبات **R1**:
1. **انقطاع الاتصال (Disconnects)**: لا يوجد استئناف آلي؛ أي إعادة تحميل للصفحة أو انقطاع في الشبكة يعيد ضبط الامتحان ويمحو إجابات الطالب ويعيد ضبط العداد.
2. **التحكم بالوقت (Timer Security)**: العداد يعمل بـ JavaScript من طرف العميل (`useEffect` + `setTimeout`) دون أي حساب أو تحقق من الخادم، مما يتيح التلاعب بساعة الجهاز أو إيقاف السكربت للحصول على وقت غير محدود.
3. **التسليم المتكرر (Double Submit)**: لا توجد مفاتيح تطابق فريدة (`Idempotency Keys`) أو أقفال ذرية (`Atomic Transitions`). عند حدوث نقر مزدوج متزامن، ينهار الاستعلام الثاني بخطأ قاعدة بيانات `P2002 Unique Constraint Violation` وتظهر رسالة خطأ للطالب توهمه بفشل التسليم.
4. **تعديل الأسئلة بعد النشر (Question Mutation & Cascade Data Loss)**: ترتبط إجابات الطلاب بمفاتيح أجنبية حية (`exam_questions.id`) مع خاصية `onDelete: Cascade`. إذا عدّل المدرس السؤال أو الخيارات أو الإجابة الصحيحة أو حذفه، تتغير نتائج الطلاب السابقة أو تُمحى إجاباتهم بالكامل من قاعدة البيانات.

---

## 2. المسح المعماري وخريطة الملفات الحالية (Codebase Map)

### 2.1 مسارات الملفات الحيوية (Key File Paths)
| المسار | النوع | المسؤولية والوظيفة الحالية |
|---|---|---|
| `prisma/schema.prisma` | DB Schema | تعريف جداول `exams`, `exam_questions`, `exam_submissions`, `exam_answers` |
| `lib/prisma.ts` | ORM / Session | تهيئة Prisma Client مع دعم الـ RLS وعزل الجلسات (`runWithUserContext`, `withUserTx`) |
| `app/student/exams/actions.ts` | Server Actions | `getStudentExam(code)`, `submitExam(code, answers)` (منطق جلب وتسليم الامتحانات للطالب) |
| `app/student/exams/[id]/page.tsx` | Server Component | صفحة تفاصيل الامتحان للطالب (تستدعي `getStudentExam`) |
| `components/student/exams/exam-detail.tsx` | Client Component | واجهة خوض الامتحان، العداد، حفظ الإجابات في State، وعرض النتيجة |
| `components/student/exams/student-exams-page.tsx` | Client Component | صفحة قائمة امتحانات الطالب والفلترة |
| `app/student/actions/exams-assignments.ts` | Server Actions | استعلامات قائمة الامتحانات والواجبات المستحقة للطالب (`getStudentExams`, `getStudentAssignments`) |
| `app/admin/exams/actions.ts` | Server Actions | دوال إنشاء وإدارة الامتحانات من لوحة التحكم (`saveExam`, `getExams`, `getExamsStats`) |
| `app/admin/exams/[id]/actions.ts` | Server Actions | دوال تفاصيل وتعديل وتصحيح الامتحان يدوياً (`getExamDetails`, `getSubmissionForGrading`, `gradeSubmission`, `updateExam`) |
| `lib/exam-builder.ts` | Utility / Types | أنواع وهياكل بناء الأسئلة (`mcq`, `essay`, `file`) والخيارات |
| `lib/exams-data.ts` | Types / Constants | ثوابت وفلاتر حالات الامتحانات |
| `lib/question-bank.ts` | Utility / Engine | محول الأسئلة من بنك الأسئلة إلى الامتحانات وإحصائيات الصعوبة |
| `lib/auth-guard.ts` | Auth / Context | التحقق من صلاحيات الطالب والمشرف (`getCurrentStudent`, `hasResourceAccess`) |
| `lib/device-guard.ts` | Security Guard | التحقق من بصمة الجهاز والجلسات المتزامنة (`assertDeviceAllowed`) |

---

## 3. تحليل الجداول ونماذج البيانات الحالية (Existing DB Schema Analysis)

### 3.1 جدول الامتحانات (`exams`)
```prisma
model exams {
  id               String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  code             String             @unique
  title            String
  course           String
  duration         Int                // المدة بالدقائق
  questions        Int                // عدد الأسئلة الإجمالي
  participants     Int                @default(0)
  avg_score        Decimal            @default(0) @db.Decimal
  status           String             // 'منشور' | 'مسودة' | 'منتهي'
  created_at       DateTime           @default(now()) @db.Timestamptz(6)
  pass_mark        Int                @default(50)
  description      String?
  shuffle          Boolean            @default(false)
  branch_id        String?            @db.Uuid
  stage_id         String?            @db.Uuid
  exam_questions   exam_questions[]
  exam_submissions exam_submissions[]
  branches         branches?          @relation(fields: [branch_id], references: [id], onUpdate: NoAction)
  stages           stages?            @relation(fields: [stage_id], references: [id], onUpdate: NoAction)

  @@index([branch_id], map: "exams_branch_idx")
  @@schema("public")
}
```

### 3.2 جدول أسئلة الامتحانات (`exam_questions`)
```prisma
model exam_questions {
  id                    String                        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  exam_id               String                        @db.Uuid
  question_text         String
  options               Json?                         // مصفوفة نصوص الخيارات (string[])
  correct_answer        String?                       // نص الخيار الصحيح (لـ mcq)
  points                Int                           @default(1)
  created_at            DateTime                      @default(now()) @db.Timestamptz(6)
  question_type         String                        @default("mcq") // mcq | essay | file
  content_mode          String                        @default("text") // text | image
  image_url             String?
  model_answer          String?                       // الإجابة النموذجية للأسئلة المقالية
  order_index           Int                           @default(0)
  bank_question_id      String?                       @db.Uuid
  exam_answers          exam_answers[]
  exams                 exams                         @relation(fields: [exam_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  question_bank_questions question_bank_questions?    @relation(fields: [bank_question_id], references: [id], onDelete: SetNull, onUpdate: NoAction)

  @@index([bank_question_id], map: "idx_exam_questions_bank")
  @@schema("public")
}
```

### 3.3 جدول التسليمات (`exam_submissions`)
```prisma
model exam_submissions {
  id             String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  exam_id        String         @db.Uuid
  student_id     String         @db.Uuid
  score          Int
  total          Int
  status         String         // 'ناجح' | 'راسب' | 'قيد التصحيح'
  submitted_at   DateTime       @default(now()) @db.Timestamptz(6)
  grading_status String         @default("graded") // 'graded' | 'pending'
  auto_score     Int            @default(0)
  manual_score   Int            @default(0)
  exam_answers   exam_answers[]
  exams          exams          @relation(fields: [exam_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  students       students       @relation(fields: [student_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@unique([exam_id, student_id]) // يسمح بتسليم واحد فقط لكل طالب
  @@schema("public")
}
```

### 3.4 جدول إجابات الطلاب (`exam_answers`)
```prisma
model exam_answers {
  id               String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  submission_id    String           @db.Uuid
  question_id      String           @db.Uuid
  answer_text      String?          // إجابة الأسئلة المقالية
  selected_option  String?          // الخيار المختار في أسئلة الاختيار من متعدد
  file_url         String?          // رابط الملف المرفوع في أسئلة الملفات
  awarded_points   Int              @default(0)
  is_correct       Boolean?
  needs_manual     Boolean          @default(false)
  created_at       DateTime         @default(now()) @db.Timestamptz(6)
  exam_questions   exam_questions   @relation(fields: [question_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  exam_submissions exam_submissions @relation(fields: [submission_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([question_id], map: "exam_answers_question_idx")
  @@index([submission_id], map: "exam_answers_submission_idx")
  @@schema("public")
}
```

---

## 4. التحليل التفصيلي للثغرات الحالية (Deep-Dive Gap Analysis for R1)

### 4.1 الثغرة الأولى: انعدام الجلسة النشطة والاستئناف الآلي (Disconnects & Auto-Resume)
- **الوضع الفعلي**:
  في `components/student/exams/exam-detail.tsx`:
  ```tsx
  const [phase, setPhase] = useState<Phase>(alreadySubmitted ? 'result' : 'intro')
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({})
  const [secondsLeft, setSecondsLeft] = useState(exam.durationMinutes * 60)
  ```
  عند ضغط الطالب "بدء الاختبار الآن":
  - تتغير `phase` إلى `'taking'` في الـ state المحلي فقط.
  - لا يتم إرسال أي طلب للخادم لإنشاء جلسة محاولة (`No DB Write`).
  - تُخزن الإجابات في كائن React state فقط (`answers`).
- **المخاطر**:
  1. إذا أغلق الطالب الصفحة أو انقطع الاتصال أو أجرى Refresh، تفقد الذاكرة كل الإجابات ويعود إلى مرحلة `'intro'`.
  2. لا يوجد حفظ تلقائي مسوداتي (`Draft Auto-Save`) للإجابات على الخادم أثناء الحل.
  3. لا توجد طبقة تخزين احتياطية في العميل (`localStorage fallback`).

### 4.2 الثغرة الثانية: التلاعب بالوقت وحساب العداد محلياً (Server-Side Timer & Clock Tampering)
- **الوضع الفعلي**:
  في `components/student/exams/exam-detail.tsx`:
  ```tsx
  useEffect(() => {
    if (phase !== 'taking') return
    if (secondsLeft <= 0) {
      void handleSubmit()
      return
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, secondsLeft])
  ```
  وفي `app/student/exams/actions.ts` دالة `submitExam`:
  - الدالة لا تفحص نهائياً الوقت المستغرق ولا متى بدأ الطالب!
  - لا يوجد حقل `started_at` أو `expires_at`.
- **المخاطر**:
  1. يمكن للطالب فتح الامتحان، تجميد المتصفح، أو تغيير ساعة جهازه، والحل بعد ساعات أو أيام دون أي اعتراض من الخادم.
  2. عند إعادة تحميل الصفحة، يُعاد ضبط العداد إلى `exam.durationMinutes * 60` مجدداً.

### 4.3 الثغرة الثالثة: التسليم المتكرر وسباق البيانات (Double Submit & Concurrency)
- **الوضع الفعلي**:
  في `components/student/exams/exam-detail.tsx`:
  - حماية التسليم محصورة في `const [submitting, setSubmitting] = useState(false)` التي يسهل تخطيها بتكرار النقر السريع قبل اكتمال الـ Render أو فتح تبويبين.
  في `app/student/exams/actions.ts`:
  ```tsx
  const existing = await prisma.exam_submissions.findFirst({
    where: { exam_id: exam.id, student_id: student.id },
    select: { id: true }
  })
  if (existing) return { success: false, error: 'لقد قمت بتسليم هذا الاختبار من قبل.' }
  // ... حساب الدرجات ...
  const submission = await prisma.exam_submissions.create({ ... })
  ```
- **المخاطر**:
  1. في حال وصول طلبين متزامنين (`Concurrent Requests`)، سينجح كلا الاستعلامين `findFirst` لأن السجل لم يُنشأ بعد في الـ DB.
  2. سيفشل الاستعلام الثاني عند `prisma.exam_submissions.create` بسبب القيد الفريد `@@unique([exam_id, student_id])` وسيقوم الـ Catch Block بإرجاع رسالة خطأ للطالب (`تعذر تسليم الاختبار`).
  3. غياب مفتاح المطابقة الفريد (`Idempotency Key`) وغياب المعاملة الشاملة (`prisma.$transaction`).

### 4.4 الثغرة الرابعة: تعديل الأسئلة وفقدان البيانات التاريخية (Question Snapshotting)
- **الوضع الفعلي**:
  - عند تسليم الامتحان، يتم إنشاء سجلات في `exam_answers` تشير إلى `question_id` في جدول `exam_questions`.
  - عند استعراض نتيجة الطالب `getStudentExam` (السطور 142-144):
    ```tsx
    const questions = await prisma.exam_questions.findMany({ where: { exam_id: exam.id }, ... })
    const keyMap = new Map(questions.map((k) => [k.id, { correct: k.correct_answer, model: k.model_answer }]))
    ```
  - في `prisma/schema.prisma` (السطر 836):
    ```prisma
    exam_questions exam_questions @relation(fields: [question_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
    ```
- **المخاطر**:
  1. **محو تاريخي كارثي (`Cascade Delete`)**: إذا قام المدرس بحذف سؤال من الامتحان عبر لوحة التحكم، ستقوم قاعدة بيانات PostgreSQL تلقائيًا وبصمت بحذف كافة إجابات الطلاب المرتبطة بهذا السؤال من جدول `exam_answers`!
  2. **تحريف الإجابات النموذجية**: إذا عدّل المدرس نص السؤال أو الخيارات أو الإجابة الصحيحة بعد تسليم الطلاب، ستظهر مراجعة النتيجة للطالب بناءً على السؤال المعدل الجديد، مما يخلق تضارباً بين الدرجة المحسوبة والخيارات المعروضة.
  3. **تغيير محتوى الامتحان أثناء خوضه**: إذا عدّل المدرس الامتحان أثناء وجود طلاب في مرحلة `'taking'`، سيتلقى الطالب أسئلة مختلفة أو يُقيّم آلياً ضد إجابات صحيحة غير التي رآها.

---

## 5. خطة التطوير والمواصفات الفنية المطلوبة (Technical Specification for R1)

### 5.1 نموذج بيانات جلسة المحاولة (`exam_attempts`)
يجب إضافة جدول جديد `exam_attempts` إلى قاعدة البيانات (عبر Migration SQL صريح) لتمثيل المحاولة وتجميد لقطة الأسئلة والوقت:

```sql
CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'submitted', 'expired', 'abandoned'
    started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expires_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    idempotency_key VARCHAR(100),
    questions_snapshot JSONB NOT NULL, -- تجميد كامل للأسئلة والخيارات والدرجات والإجابات الصحيحة لحظة البدء
    draft_answers JSONB NOT NULL DEFAULT '{}'::jsonb, -- المسودة المحفوظة آلياً
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_student_exam ON public.exam_attempts (student_id, exam_id, status);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_expires ON public.exam_attempts (expires_at) WHERE status = 'in_progress';
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_attempts_idempotency ON public.exam_attempts (idempotency_key) WHERE idempotency_key IS NOT NULL;
```

### 5.2 عزل الارتباط في `exam_answers` وتأمين لقطة الأسئلة
لحماية تاريخ إجابات الطلاب من الحذف التسلسلي (`Cascade`):
1. تعديل القيد في `exam_answers`: تغيير `onDelete: Cascade` على `question_id` إلى `onDelete: SetNull` أو جعل `question_id` حقلاً مرجعياً غير مقيد بقيد حذف صارم، أو تخزين `question_snapshot` مباشرة داخل صف `exam_submissions` / `exam_answers`.
2. إضافة حقل `attempt_id UUID REFERENCES public.exam_attempts(id)` في `exam_submissions`.
3. إضافة حقل `questions_snapshot JSONB` في `exam_submissions` للرجوع إليه دائمًا عند استعراض النتائج والتصحيح اليدوي دون المساس بجدول الأسئلة الحي.

### 5.3 عقد الدوال البرمجية (Server Actions Interface Contract)

#### 1. دالة بدء / استئناف المحاولة (`startOrResumeExamAttempt`)
```ts
export type ExamAttemptResponse = {
  success: boolean
  error?: string
  attemptId: string
  examCode: string
  title: string
  course: string | null
  description: string | null
  durationMinutes: number
  passMark: number
  totalPoints: number
  startedAt: string
  expiresAt: string
  remainingSeconds: number // محسوبة من الخادم: Math.max(0, Math.floor((expiresAt - now()) / 1000))
  questions: StudentExamQuestion[] // مستخرجة من questions_snapshot المجمدة
  draftAnswers: Record<string, LocalAnswer> // الإجابات المستعادة
  status: 'in_progress' | 'submitted' | 'expired'
  submission?: StudentExam['submission']
}

export async function startOrResumeExamAttempt(examCode: string): Promise<ExamAttemptResponse>
```

#### 2. دالة الحفظ التلقائي للمسودة (`saveDraftAnswersAction`)
```ts
export async function saveDraftAnswersAction(
  attemptId: string,
  draftAnswers: Record<string, { selectedOption?: string | null; answerText?: string | null; fileUrl?: string | null }>
): Promise<{ success: boolean; remainingSeconds: number; error?: string }>
```

#### 3. دالة التسليم الآمن المحصن ضد التكرار (`submitExamAttemptAction`)
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
  gradingStatus?: 'graded' | 'pending'
  score?: number
  total?: number
  status?: string
  alreadySubmitted?: boolean
}

export async function submitExamAttemptAction(payload: SubmitExamPayload): Promise<SubmitExamResult>
```

### 5.4 تفاصيل المنطق الحسابي والأقفال الذرية (Concurrency & Timer Logic)

#### حساب الوقت من طرف الخادم:
- عند البدء: `expires_at = now() + (exam.duration * 60 + GRACE_PERIOD_SECONDS) * 1000` (حيث `GRACE_PERIOD_SECONDS = 30s` لتغطية تأخيرات الشبكة).
- عند أي طلب: `remainingSeconds = Math.max(0, Math.floor((new Date(attempt.expires_at).getTime() - Date.now()) / 1000))`.
- عند التسليم:
  - التحقق: إذا كان `Date.now() > new Date(attempt.expires_at).getTime() + (GRACE_PERIOD_SECONDS * 1000)`:
    - إما قبول الإجابات المسجلة في الـ Draft حتى وقت الانتهاء وتقييمها، أو رفض التعديلات المتأخرة واعتماد المسودة الأخيرة.

#### منع الـ Double Submit باستخدام المعاملة الذرية (`Atomic Transition`):
```ts
return await prisma.$transaction(async (tx) => {
  // 1. محاولة تحديث حالة المحاولة ذرياً
  const updatedAttempt = await tx.$executeRaw`
    UPDATE public.exam_attempts
    SET status = 'submitted', submitted_at = clock_timestamp(), updated_at = clock_timestamp()
    WHERE id = ${attemptId}::uuid AND status = 'in_progress'
  `

  // إذا كانت النتيجة 0، فهذا يعني أن المحاولة تم تسليمها بالفعل في طلب متزامن آخر
  if (updatedAttempt === 0) {
    const existingSub = await tx.exam_submissions.findFirst({
      where: { exam_id: exam.id, student_id: student.id },
      select: { id: true, score: true, total: true, status: true, grading_status: true }
    })
    if (existingSub) {
      return {
        success: true,
        gradingStatus: existingSub.grading_status as any,
        score: existingSub.score,
        total: existingSub.total,
        status: existingSub.status,
        alreadySubmitted: true
      }
    }
  }

  // 2. تقييم الإجابات ضد questions_snapshot المجمدة في المحاولة
  // 3. إنشاء سجل exam_submissions مع questions_snapshot
  // 4. إنشاء سجلات exam_answers
  // 5. تحديث إحصائيات participants في جدول exams
})
```

#### الاستئناف التلقائي في واجهة العميل (`Client Auto-Resume`):
- عند تحميل صفحة الامتحان:
  - استدعاء `startOrResumeExamAttempt(examCode)`.
  - إذا عادت المحاولة بحالة `in_progress` و `remainingSeconds > 0`:
    - الانتقال فوراً إلى مرحلة `phase = 'taking'`.
    - ضبط العداد على `remainingSeconds` القادم من الخادم.
    - تهيئة `answers` بالمسودة المحفوظة في `draftAnswers` مدمجة مع أي مسودة محلية في `localStorage`.
  - تشغيل `useEffect` للحفظ التلقائي كل 10 ثوانٍ أو عند كل اختيار إجابة عبر `saveDraftAnswersAction`.
  - الاستماع لحدث `window.addEventListener('online')` لإعادة مزامنة المسودة عند عودة الإنترنت.

---

## 6. خطة التحقق والاختبار البرمجي (Verification & Testing Plan)

لإثبات تلبية متطلبات R1 بنسبة 100%، يجب بناء سكربتات تحقق مستقلة:

1. **سكربت محاكاة الانقطاع والاستئناف (`test_exam_resume.mjs`)**:
   - ينشئ امتحان تجريبي.
   - يستدعي `startOrResumeExamAttempt` ويبدأ المحاولة ويحفظ مسودة إجابات لبعض الأسئلة.
   - يحاكي إغلاق المتصفح أو انقطاع الاتصال (انتظار 5 ثوانٍ ثم استدعاء دالة الاستئناف من جلسة/سياق جديد).
   - يتحقق أن الخادم أعاد المحاولة مع الوقت المتبقي المنقوص بدقة والمسودة المحفوظة كاملة.
2. **سكربت منع التلاعب بالوقت (`test_exam_server_timer.mjs`)**:
   - يبدأ محاولة بامتحان مدته دقيقة واحدة (أو مدة قصيرة في بيئة الاختبار).
   - ينتظر انتهاء المدة + فترة السماح.
   - يحاول إرسال تسليم متأخر، ويثبت أن الخادم يرفض التعديلات المتأخرة ويغلق المحاولة تلقائيًا بناءً على توقيت الخادم (`clock_timestamp()`).
3. **سكربت منع التسليم المتكرر المتزامن (`test_exam_double_submit.mjs`)**:
   - يطلق 10 طلبات تسليم متزامنة لنفس المحاولة باستخدام `Promise.all`.
   - يتحقق من تسجيل تسليم واحد فقط في قاعدة البيانات دون أي استثناءات `P2002` وبأن جميع الطلبات تعود بنتيجة نجاح متسقة (`Idempotent`).
4. **سكربت تجميد لقطة الأسئلة ومقاومة التعديل والحذف (`test_exam_snapshot_integrity.mjs`)**:
   - ينشئ امتحان مع سؤال تجريبي بخيارات وإجابة صحيحة محددة.
   - ينشئ طالب محاولة ويجيب على السؤال.
   - يقوم المشرف بتعديل نص السؤال والإجابة الصحيحة أو حذف السؤال تماماً من جدول `exam_questions`.
   - يقوم الطالب بتسليم المحاولة، ويتحقق السكربت من أن التصحيح تم بناءً على اللقطة المجمدة، وأن إجابات الطالب ومراجعة النتيجة لم تتأثر بتعديل المشرف ولم تُحذف.

---

## 7. الخلاصة وجاهزية التنفيذ (Conclusion & Readiness)

- تم تشخيص وتوثيق كافة جوانب نظام الامتحانات الحالي ونقاط القصور بدقة.
- متطلبات **R1** واضحة ومحددة تقنياً، والتعديلات المطلوبة تشمل:
  1. إنشاء ملف Migration لقاعدة البيانات لجدول `exam_attempts` وتحديث قيود `exam_answers`.
  2. تحديث `prisma/schema.prisma`.
  3. إعادة صياغة `app/student/exams/actions.ts` بالدوال الجديدة المحصنة.
  4. تحديث مكون `components/student/exams/exam-detail.tsx` ليدعم الاستئناف التلقائي، عداد الخادم، والحفظ الدوري.
  5. كتابة سكربتات التحقق الشاملة.
- تقرير التسليم جاهز للمشرف العام والفرق المنفذة.
