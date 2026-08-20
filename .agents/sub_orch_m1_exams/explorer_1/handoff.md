# Handoff Report — Explorer 1 (Schema & DB Migration Specialist)

**Status**: Task Complete (Hard Handoff)  
**Agent**: Explorer 1 (Schema & DB Migration Focus)  
**Milestone**: Milestone 1 (Exams Edge Cases - R1)  
**Parent Sub-Orchestrator**: `sub_orch_m1_exams`  
**Date**: 2026-08-20  

---

## 1. Observation

1. **غياب جدول المحاولات النشطة (`exam_attempts`) في المخطط الحالي**:
   - في `prisma/schema.prisma` (السطور 824-914)، النماذج الموجودة تقتصر على `exams` و `exam_questions` و `exam_submissions` و `exam_answers`. لا يوجد تمثيل لمحاولة جارية (`in_progress`)، ولا حقول لحساب الوقت من الخادم (`started_at`, `expires_at`)، ولا لحفظ المسودات المرحلية (`answers` JSONB) أو تجميد لقطة الأسئلة (`questions_snapshot` JSONB).
2. **عزل الأمان و RLS في المنظومة الحالية**:
   - في `scripts/R01_rls_and_security_setup.sql` (السطور 56-99 و 200-244)، تطبق المنصة RLS عبر دوال `public.is_admin()` و `public.has_permission()` والمطابقة مع معرف الطالب `student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())`.
   - في `lib/prisma.ts` (السطور 28-66)، تُدار جلسات RLS بتمرير سياق المستخدم `withUserTx` و `setupRlsSession`.
3. **مخاطر الحذف المتتالي وتعديل الأسئلة**:
   - في `prisma/schema.prisma` (السطر 836): `exam_questions exam_questions @relation(fields: [question_id], references: [id], onDelete: Cascade, onUpdate: NoAction)` يربط إجابات الطلاب مباشرة بالأسئلة مع `onDelete: Cascade`. إذا حذف المدرس سؤالاً، تُحذف إجابات الطلاب بالكامل وتتغير الدرجات المحسوبة.
4. **تكامل العلاقات مع نماذج النظام**:
   - نموذج `exams` يحتوي على `branch_id` و `stage_id`.
   - نموذج `students` يحتوي على `id` (UUID) و `user_id` (UUID) المرتبط بـ `User` و `auth.users`.
   - نموذج `exam_submissions` يحتوي على قيد فريد `@@unique([exam_id, student_id])`.

---

## 2. Logic Chain

1. **من الملاحظة 1 (غياب تمثيل المحاولة النشطة)**:
   - لبناء نظام استئناف آلي ومنع التلاعب بالوقت، يجب إنشاء جدول `public.exam_attempts` يتضمن:
     - `status` (`in_progress`, `submitted`, `expired`, `abandoned`).
     - `started_at` و `expires_at` لحساب `remainingSeconds` authoritative من الخادم.
     - `questions_snapshot` (JSONB) لتجميد الأسئلة وخياراتها ودرجاتها وإجاباتها النموذجية لحظة البدء.
     - `answers` (JSONB) لتخزين المسودات وحفظ التقدم التراكمي.
     - `is_locked` و `lock_timestamp` و `idempotency_key` لحماية التسليم المتكرر والتزامن.
2. **من الملاحظة 2 (هيكل RLS و Prisma)**:
   - لضمان التوافق الأمني الكامل مع Supabase، يجب تفعيل `ENABLE ROW LEVEL SECURITY` على `exam_attempts` وإضافة سياسات SELECT و INSERT و UPDATE للطالب بحيث يُسمح له فقط بالوصول إلى محاولاته الخاصة عبر `student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())` مع منح الصلاحية الكاملة للمشرف (`public.is_admin()`).
3. **من الملاحظة 3 (الحذف المتتالي)**:
   - لحماية تاريخ إجابات الطلاب عند قيام المشرف بتعديل أو حذف الأسئلة، يجب:
     - تعديل قيد المفتاح الأجنبي لـ `exam_answers (question_id)` إلى `ON DELETE SET NULL`.
     - تخزين `questions_snapshot` في المحاولة والتسليم للرجوع إليها عند التصحيح والمراجعة المستقلة.
4. **من الملاحظة 4 (تكامل العلاقات)**:
   - يجب تحديث `prisma/schema.prisma` بإضافة نموذج `exam_attempts`، وربطه مع `exams` و `students` و `exam_submissions` عبر علاقات ثنائية متكاملة.

---

## 3. Caveats

1. **البيانات القديمة**: سجلات `exam_submissions` السابقة لا ترتبط بـ `attempt_id`؛ تم تصميم الحقل ليكون اختيارياً (`attempt_id UUID?`) لضمان التوافق التام مع البيانات السابقة دون الحاجة لترحيل قسري.
2. **تطهير المفاتيح قبل إرسال الأسئلة للعميل**: حقل `questions_snapshot` في قاعدة البيانات يحتوي على `correct_answer` و `model_answer` لغرض التصحيح والأرشفة؛ يجب على طبقة التطبيق (`lib/exams.ts` و `actions.ts`) إزالة هذين الحقلين عند تزويد واجهة الطالب بالأسئلة أثناء مرحلة `'taking'`.
3. **فترة السماح بالشبكة (Grace Period)**: تم تحديد 30 ثانية كفترة سماح لنقل البيانات عبر الشبكة قبل احتساب المحاولة متأخرة كلياً (`expired`).

---

## 4. Conclusion

تم الانتهاء من التصميم الشامل والنهائي لكافة متطلبات قواعد البيانات والمخطط لـ **Milestone 1**:
1. تم إعداد كود الترحيل الكامل `scripts/001_exam_attempts.sql` شاملاً الجدول، الفهارس الجزئية، دوال التحديث، الدوال المساعدة، وسياسات RLS المتوافقة مع Supabase.
2. تم إعداد نموذج Prisma الدقيق لـ `exam_attempts` مع تحديثات النماذج المرتبطة في `prisma/schema.prisma`.
3. تم توثيق التصميم الفني المفصل في تقرير المستكشف: `d:/Workspace/LMS/.agents/sub_orch_m1_exams/explorer_1/report.md`.

---

## 5. Verification Method

1. **فحص المخطط والكود المصدري**:
   - مراجعة محتوى `report.md` والتحقق من اكتمال كافة الحقول والقيود والسياسات.
2. **التحقق من صحة ملف الترحيل**:
   - بعد تطبيق `scripts/001_exam_attempts.sql` على قاعدة البيانات، التحقق من إنشاء الجدول وتفعيل RLS عبر:
     ```sql
     SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exam_attempts';
     ```
3. **التحقق من توليد عميل Prisma**:
   - تشغيل `npx prisma generate` والتأكد من نجاح بناء الأنواع البرمجية ونماذج الـ TypeScript دون أخطاء.
4. **سكربتات الاختبار المتوقعة**:
   - إمكانية تشغيل سكربتات الاختبار المحددة في M1 (`test_exam_resume.mjs`, `test_exam_server_timer.mjs`, `test_exam_double_submit.mjs`, `test_exam_snapshot_integrity.mjs`) معتمِدة على هذا المخطط.
