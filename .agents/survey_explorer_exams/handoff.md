# Handoff Report — Survey Explorer 1 (Exams System Specialist)
**Status**: Task Complete (Hard Handoff)  
**Agent**: Survey Explorer 1 (Exams System Specialist)  
**Target Milestone**: R1 (Exams Edge Cases)  
**Date**: 2026-08-20  

---

## 1. Observation

1. **غياب جدول جلسات المحاولات (`exam_attempts`)**:
   - في `prisma/schema.prisma` (السطور 824-914)، النماذج الموجودة هي `exams` و `exam_questions` و `exam_submissions` و `exam_answers`. لا يوجد أي نموذج أو جدول يمثل محاولة جارية (`attempt in progress`).
2. **إدارة المحاولة بالكامل محلياً داخل المتصفح**:
   - في `components/student/exams/exam-detail.tsx` (السطور 48-65):
     ```tsx
     const [phase, setPhase] = useState<Phase>(alreadySubmitted ? 'result' : 'intro')
     const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({})
     const [secondsLeft, setSecondsLeft] = useState(exam.durationMinutes * 60)
     ```
     وعند الضغط على "بدء الاختبار الآن" (السطر 188): `onClick={() => setPhase('taking')}`. لا يتم استدعاء أي Server Action ولا يتم تسجيل أي بيانات في قاعدة البيانات.
3. **حساب العداد من طرف العميل فقط**:
   - في `components/student/exams/exam-detail.tsx` (السطور 56-65): العداد يعمل بـ `setTimeout(() => setSecondsLeft(s => s - 1), 1000)`، بينما في `app/student/exams/actions.ts` دالة `submitExam` (السطور 186-295) لا تتحقق من الوقت المنقضي ولا توقيت البدء، مما يسمح بتسليم الامتحان في أي وقت.
4. **التسليم المتكرر وسباق العمليات**:
   - في `app/student/exams/actions.ts` (السطور 206-213):
     ```tsx
     const existing = await prisma.exam_submissions.findFirst({
       where: { exam_id: exam.id, student_id: student.id },
       select: { id: true }
     })
     if (existing) return { success: false, error: 'لقد قمت بتسليم هذا الاختبار من قبل.' }
     ```
     وفي `prisma/schema.prisma` (السطر 884): `@@unique([exam_id, student_id])`. في حال تزامن طلبين، يمر كلاهما من `findFirst` ويفشل الثاني عند `prisma.exam_submissions.create` مع خطأ `P2002` غير معالج بصورة متسامحة.
5. **ارتباط الأسئلة الحي وخطر الحذف التسلسلي (`Cascade Data Loss`)**:
   - في `prisma/schema.prisma` (السطر 836):
     ```prisma
     exam_questions exam_questions @relation(fields: [question_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
     ```
     وفي `app/student/exams/actions.ts` (السطور 142-144 و 215-220)، يتم جلب الأسئلة والإجابات الصحيحة ونصوصها ومطابقتها مباشرة من جدول `exam_questions` الحي، مما يعني أن تعديل المدرس للسؤال لاحقاً يغير نتائج المراجعة، وحذف السؤال يحذف إجابات الطلاب تاريخياً عبر `onDelete: Cascade`.

---

## 2. Logic Chain

1. **استنتاج 1 (فقدان البيانات عند الانقطاع)**:
   - من الملاحظة 2 (حفظ الإجابات والحالة في ذاكرة React فقط دون أي كتابة في قاعدة البيانات قبل التسليم) → يؤدي إغلاق المتصفح أو انقطاع الاتصال أو تحديث الصفحة إلى مسح الحالة بالكامل والعودة لمرحلة `'intro'` دون أي إمكانية للاستئناف التلقائي.
2. **استنتاج 2 (ثغرة التلاعب بساعة الجهاز والوقت المفتوح)**:
   - من الملاحظة 3 (اعتماد العداد على `secondsLeft` داخل المتصفح وغياب أي فحص للوقت في `submitExam`) → يمكن لأي طالب التلاعب بساعة جهازه أو إيقاف السكربت أو تجميد الجلسة والحصول على وقت مفتوح لحل الامتحان دون رقابة من الخادم.
3. **استنتاج 3 (فشل تجربة المستخدم عند النقر المزدوج)**:
   - من الملاحظة 4 (استخدام `findFirst` ثم `create` دون معاملات ذرية أو Idempotency Key مع وجود قيد فريد في قاعدة البيانات) → أي نقر مزدوج متزامن أو إعادة إرسال من الشبكة سيؤدي لفشل أحد الطلبين برمز خطأ `P2002` وظهور رسالة "تعذر تسليم الاختبار" للطالب رغم نجاح التسليم الآخر.
4. **استنتاج 4 (تضارب ومحو البيانات التاريخية عند تعديل الأسئلة)**:
   - من الملاحظة 5 (اعتماد `exam_answers` على المفتاح الأجنبي الحي `exam_questions.id` مع `onDelete: Cascade`) → أي تعديل يجريه المشرف على الأسئلة أو حذفها سينعكس فوراً على المحاولات السابقة أو يمسح إجابات الطلاب تاريخياً، مما يوجب تطبيق تجميد لقطة الأسئلة (`Question Snapshotting`).

---

## 3. Caveats

1. **الواجبات (`assignments`)**: تركزت هذه الدراسة على نظام الامتحانات (`exams`) وفقاً لنطاق R1. توجد بنية موازية للواجبات (`assignments`) تم فحصها كمرجع ولم يُقترح تعديلها في نطاق R1.
2. **حدود وقت الامتحانات المنشورة مسبقاً**: البيانات القديمة في `exam_submissions` لا تحتوي على `attempt_id`، لذا يجب أن يدعم النظام التوافق الرجعي (`Backward Compatibility`) للنتائج القديمة دون كسر صفحات العرض.
3. **بيئة قاعدة البيانات**: الفحص تم على ملفات المخطط `prisma/schema.prisma` وكود التطبيق؛ تطبيق الجداول الجديدة يتطلب تنفيذ Migration SQL على بيئة العمل.

---

## 4. Conclusion

نظام الامتحانات في منصة LMS يتطلب التحديثات الهيكلية التالية لتلبية متطلبات **R1**:
1. **إنشاء جدول `exam_attempts`**: لتتبع دورة حياة المحاولة (`in_progress`, `submitted`, `expired`)، تسجيل توقيت البدء والانتهاء الحقيقيين من الخادم (`started_at`, `expires_at`)، تجميد لقطة الأسئلة (`questions_snapshot`)، وحفظ مسودة الإجابات التراكمية (`draft_answers`).
2. **حساب ومزامنة الوقت من الخادم (Server-Side Timer)**: احتساب `remainingSeconds` ديناميكياً على الخادم ورفض التسليمات بعد `expires_at + 30s grace period`.
3. **معاملات ذرية وتطابق فريد (Idempotent Submissions)**: تحويل حالة المحاولة ذرياً (`Atomic UPDATE`) والتعامل مع التسليم المتكرر بإرجاع النتيجة بنجاح وتسامح دون إظهار أخطاء للعميل.
4. **عزل وتجميد الأسئلة (Snapshotting & Cascade Prevention)**: تقييم ومراجعة إجابات الطلاب استناداً إلى `questions_snapshot`، وتعديل قيود الحذف لمنع فقدان البيانات التاريخية.

---

## 5. Verification Method

لإثبات جاهزية وصحة النظام المستقبلي بعد التنفيذ، يمكن تشغيل الاختبارات التالية:
1. **التحقق من الكود المصدري**:
   - مراجعة وجود جدول `exam_attempts` في `prisma/schema.prisma`.
   - مراجعة استدعاء `startOrResumeExamAttempt` و `saveDraftAnswersAction` في `app/student/exams/actions.ts` و `components/student/exams/exam-detail.tsx`.
2. **سكربتات التحقق البرمجية**:
   - تشغيل `node scripts/test_exam_resume.mjs` لإثبات استئناف المحاولة وحفظ المسودة بنفس الوقت المتبقي.
   - تشغيل `node scripts/test_exam_server_timer.mjs` لإثبات رفض التعديل بعد انتهاء الوقت المحدد من الخادم.
   - تشغيل `node scripts/test_exam_double_submit.mjs` لإثبات استقرار المعاملات المتزامنة ومنع الـ Double Submit.
   - تشغيل `node scripts/test_exam_snapshot_integrity.mjs` لإثبات ثبات النتيجة والإجابات عند تعديل أو حذف السؤال من لوحة التحكم.
3. **شرط البطلان (Invalidation Condition)**:
   - يُعتبر الحل غير مستوفٍ إذا تمكن الطالب من الاستمرار في الحل بعد انقضاء الوقت المحسوب على الخادم، أو إذا أدى حذف سؤال في لوحة التحكم إلى إتلاف سجلات الطلاب السابقة.
