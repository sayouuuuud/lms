# Handoff Report — Explorer 3 (UI, Server Actions & Standalone Verification Scripts)

**المستكشف**: Explorer 3  
**المرحلة**: Milestone 1 (Exams Edge Cases)  
**تاريخ التسليم**: 2026-08-20  
**نوع التسليم**: Hard Handoff (Task Complete)

---

## 1. Observation (الملاحظات المباشرة)

- **ملف `components/student/exams/exam-detail.tsx`**:
  - السطور 48-51: `const [phase, setPhase] = useState<Phase>(alreadySubmitted ? 'result' : 'intro')` و `const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({})` و `const [secondsLeft, setSecondsLeft] = useState(exam.durationMinutes * 60)`.
  - السطور 56-65: العداد يعمل بـ `setTimeout` محلي في المتصفح، ولا يتصل بالخادم إطلاقاً.
  - السطور 86-111: دالة `handleSubmit` ترسل الإجابات دفعة واحدة فقط عند الضغط على الزر، مع غياب الحفظ التلقائي للمسودة وغياب دعم انقطاع الإنترنت.
- **ملف `app/student/exams/actions.ts`**:
  - السطور 86-177 (`getStudentExam`): تجلب أسئلة الامتحان الحية مباشرة من `exam_questions` دون التحقق من وجود محاولة نشطة أو جلب مسودة محفوظة.
  - السطور 186-295 (`submitExam`): لا تفحص وقت بدء الامتحان ولا مدة المحاولة ولا تدعم `idempotencyKey` لمنع الـ Double Submit.
- **ملفات الاختبارات الحالية في `scripts/`**:
  - تفحص الـ RLS و Prisma Transactions (مثل `scripts/test_atomicity.mjs`, `scripts/test_adversarial.mjs`, `scripts/integration_test_server_actions.mjs`)، لكن لا توجد أي سكربتات متخصصة بحالات R1 للامتحانات (`test_exam_resume.mjs`, `test_exam_server_timer.mjs`, `test_exam_double_submit.mjs`, `test_exam_snapshot_integrity.mjs`).

---

## 2. Logic Chain (سلسلة الاستنتاج المنطقي)

1. بالاستناد إلى الملاحظات في `exam-detail.tsx` و `actions.ts`، فإن إدارة جلسة الامتحان الحالية محصورة بذاكرة المتصفح للعميل، مما يؤدي إلى:
   - فقدان إجابات الطالب والوقت المستغرق بالكامل بمجرد حدوث انقطاع اتصال أو إعادة تحميل للصفحة.
   - إمكانية التلاعب بساعة العميل للحصول على وقت غير محدود.
   - احتمال حدوث أخطاء `P2002` عند النقر المزدوج المتزامن أثناء التسليم.
2. لمعالجة هذه الثغرات، يجب ربط مكون الواجهة `exam-detail.tsx` وإجراءات `actions.ts` بدورة حياة المحاولة على الخادم (`lib/exams.ts` و `exam_attempts`):
   - تفعيل الاستئناف التلقائي عند التحميل (`Resume on Mount`) باستعادة `activeAttempt` ومسودة الإجابات والوقت المتبقي الفعلي.
   - تفعيل الحفظ التلقائي المسوداتي (`Debounced Auto-Save` كل 800ms) ونبضات المزامنة (`Heartbeat` كل 15 ثانية).
   - تفعيل الصمود المحلي عند انقطاع الإنترنت بالاعتماد على أحداث `online`/`offline` وتخزين `localStorage`.
   - الاعتماد الحصري على عداد الخادم المحسوب من `expires_at`.
   - قفل النقر المزدوج في العميل والخادم عبر `submitting` state ومفتاح المطابقة `idempotencyKey`.
3. لضمان جودة النظام ومطابقة معايير القبول (Acceptance Criteria)، تم تصميم 4 سكربتات تحقق برمجية حتمية ومستقلة تعمل مباشرة على قاعدة البيانات لتوثيق واختبار كافة الحالات الطرفية (انقطاع واستئناف، تلاعب بالوقت، تسليم متزامن، سلامة اللقطة المجمدة).

---

## 3. Caveats (التحفظات والافتراضات)

- **الاعتمادية على جداول قاعدة البيانات**: يفترض التصميم تطبيق الميجريشن الخاص بجدول `exam_attempts` (`scripts/001_exam_attempts.sql`) وتحديث قيود جدول `exam_answers` قبل تشغيل سكربتات التحقق.
- **تكامل الخدمة**: تفترض إجراءات `app/student/exams/actions.ts` وجود دوال `lib/exams.ts` وفق العقد المصمم في تقرير Explorer 2.
- **فترة السماح (Grace Period)**: تم اعتماد فترة سماح افتراضية قدرها 30 ثانية لتسليم الامتحانات لاستيعاب بطء شبكات المحمول دون الإخلال بصرامة العداد.

---

## 4. Conclusion (الخلاصة والقرارات الفنية)

1. تم الانتهاء بالكامل من تصميم طبقة الـ Server Actions في `app/student/exams/actions.ts` لتتكامل بسلاسة مع `lib/exams.ts` وتوفر حماية للبيانات الحساسة وتدعم الاستئناف والحفظ الدوري والتسليم المحصن.
2. تم تصميم مكون `components/student/exams/exam-detail.tsx` ليصبح عالي الصمود والاعتمادية مع دعم الـ Offline Mode، الحفظ التلقائي، عداد الخادم، ومؤشرات المزامنة المرئية.
3. تم وضع المعمارية الدقيقة والكود الكامل لسكربتات التحقق الأربعة:
   - `scripts/test_exam_resume.mjs`
   - `scripts/test_exam_server_timer.mjs`
   - `scripts/test_exam_double_submit.mjs`
   - `scripts/test_exam_snapshot_integrity.mjs`
4. التقرير الفني الكامل متوفر في:
   `d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_3/report.md`.

---

## 5. Verification Method (طريقة التحقق المستقلة)

للتحقق من سلامة التصميم وصلاحية السكربتات عند بدء مرحلة التنفيذ (Implementation):

1. **فحص التقرير الفني والمخططات**:
   - معاينة ملف `report.md` ومراجعة تواقيع الدوال وحالات واجهة المستخدم ومخططات تدفق البيانات.
2. **أوامر تشغيل سكربتات التحقق بعد التنفيذ**:
   ```bash
   node --env-file-if-exists=.env scripts/test_exam_resume.mjs
   node --env-file-if-exists=.env scripts/test_exam_server_timer.mjs
   node --env-file-if-exists=.env scripts/test_exam_double_submit.mjs
   node --env-file-if-exists=.env scripts/test_exam_snapshot_integrity.mjs
   ```
3. **شرط النجاح**:
   - عودة كل سكربت بـ exit code `0` ومرور 100% من بنود الفحص بدون أي خطأ `P2002` أو تسريب بيانات أو فقدان للمسودة والوقت.
