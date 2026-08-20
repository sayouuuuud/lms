# Handoff Report — Survey Explorer 2 (Taxonomy & Mastery Specialist)

**Task**: Survey and Architecture Specification for LMS Upgrade R2 (Mastery & Taxonomy)  
**Agent**: Survey Explorer 2 (`survey_explorer_mastery`)  
**Timestamp**: 2026-08-20T19:15:00Z  
**Type**: Hard Handoff (Complete)

---

## 1. Observation (الملاحظات المباشرة والأدلة المستخلصة)

1. **هيكل المناهج الحالي والمحتوى**:
   - `prisma/schema.prisma` (سطور 622 إلى 1496): المناهج تتبع تراتبية `stages` (السنوات) -> `branches` (المواد/الفروع) -> `monthly_courses` (الكورسات الشهرية) -> `monthly_course_sections` -> `lectures` (المحاضرات) -> `lessons` (الدروس/الفيديوهات).
   - لا توجد كيانات وسيطة للوحدات المنهجية (Domains) أو نواتج التعلم (Learning Outcomes / Skills).
2. **تصنيف بنك الأسئلة والامتحانات**:
   - `prisma/schema.prisma:1673`: جدول `question_bank_questions` يحتوي على `difficulty` و `auto_difficulty` و `answers_count` و `correct_count`.
   - `prisma/schema.prisma:1721`: جدول `question_bank_topics` هو مجرد جدول مسطح يحتوي فقط على `id` و `title` كـ tag بسيط.
   - `prisma/schema.prisma:845`: جدول `exam_questions` يحتوي على `bank_question_id` اختياري، دون أي ربط بمهارات معرفية.
   - `prisma/schema.prisma:825`: جدول `exam_answers` يسجل `awarded_points` و `is_correct` و `selected_option`.
3. **تتبع تقدم الطالب**:
   - `prisma/schema.prisma:1389`: جدول `student_content_progress` يسجل إكمال الدروس والواجبات (`item_type` = 'lesson' | 'assignment').
   - `prisma/schema.prisma:1202`: جدول `lesson_watch_progress` يسجل `max_percent` و `watched_seconds` و `views_count`.
4. **الاشتقاق الحالي للمهارات**:
   - في `app/admin/students/[id]/actions.ts:461`: يتم استخراج المهارات للرادار عبر حساب متوسط نسبة درجات الامتحانات في كل فرع `branch` مع نسبة إكمال كورسات الفرع كقيمة تقديرية عامة دون أي شجرة مهارات فعلية.

---

## 2. Logic Chain (سلسلة الاستنتاج المنطقي)

1. **انطلاقاً من الملاحظة (1) و (2)**: نظراً لأن المناهج والأسئلة تفتقر إلى نموذج هرمي لتصنيف المهارات، فإن المنصة تحتاج إلى إضافة طبقة `taxonomy_domains` (الوحدات الكبرى) و `taxonomy_topics` (المواضيع التخصصية) و `taxonomy_skills` (المهارات ونواتج التعلم الذرية) المرتبطة بالفروع `branches`.
2. **انطلاقاً من الملاحظة (2)**: لكي تنعكس إجابات الطلاب في الامتحانات على مهاراتهم، يجب إنشاء جداول ربط Many-to-Many (`lesson_skills`, `question_bank_question_skills`, `exam_question_skills`) تمكن من معرفة المهارات المستهدفة بكل سؤال وبكل درس.
3. **انطلاقاً من الملاحظة (3) و (4)**: نظراً لأن إتقان الطالب الحقيقي يتأثر بجودة حله، استقراره، وتكرار أخطائه، واكتمال مشاهدته للشروح، تم تصميم المحرك الرياضي:
   $$M_s = 0.55 P_s + 0.20 E_s + 0.25 C_s$$
   حيث:
   - $P_s$: متوسط الأداء المرجح بحداثة المحاولات (معامل اضمحلال زمني $\lambda = 0.0231$).
   - $E_s$: معامل خلو الأخطاء مع جزاء تصاعدي عند وجود أخطاء متتالية $C_{\text{err}}$.
   - $C_s$: نسبة إكمال الدروس المرتبطة بالمهارة من `lesson_watch_progress`.
   - $\kappa_s$: معامل تشبع إحصائي يضمن عدم تضخيم درجات الإتقان عند قلة المحاولات.
4. **التكامل مع نظام الإنقاذ (R3)**: المهارات التي تسجل $M_s < 60$ أو $C_{\text{err}} \ge 2$ تصنف تلقائياً كـ `needs_review`، مما يغذي قائمة الطلاب المتعثرين ويوجه رسائل التدخل العلاجي.

---

## 3. Caveats (المحددات والافتراضات)

1. **الترحيل التدريجي للمحتوى القديم**: الأسئلة والدروس القديمة التي لم يتم ربطها بمهارات بعد الهجرة ستبقى بقيمة $M_s$ غير محسوبة حتى يتم ربطها بالمهارات في لوحة التحكم.
2. **الاعتماد على Prisma Service Connection**: نماذج الـ Taxonomy والـ Mastery الجديدة محمية بـ RLS ومخصصة للاستخدام عبر Prisma Server Actions و APIs.
3. **حجم نافذة المحاولات**: يُفضل قصر حساب $P_s$ على آخر 10 محاولات لكل مهارة لمنع استهلاك غير ضروري للذاكرة مع الاحتفاظ بالدقة.

---

## 4. Conclusion (الخلاصة والقرارات النهائية)

1. **اكتمال التصميم المعماري لـ R2**: تم تحديد السكيما الكاملة وجداول الربط ومعادلات محرك التقييم وواجهات الخدمات.
2. **جاهزية ملفات التقرير والسكيما**:
   - التقرير الكامل منشور في: `.agents/survey_explorer_mastery/report.md`
   - جاهز تماماً لتسليمه للمنفذين (`implementer_r2`) والمراجعين ومسؤولي الاختبارات التلقائية E2E.

---

## 5. Verification Method (طريقة التحقق المستقلة)

1. **فحص وجود واكتمال التقارير المكتوبة**:
   - `view_file` على المسار: `d:/Workspace/LMS/.agents/survey_explorer_mastery/report.md`
   - `view_file` على المسار: `d:/Workspace/LMS/.agents/survey_explorer_mastery/BRIEFING.md`
2. **التحقق من صحة السكيما وTypeScript**:
   - مراجعة تعريفات الـ Types والـ Interfaces الواردة في التقرير للتأكد من توافقها التام مع `prisma/schema.prisma`.
3. **التحقق من السيناريوهات الحسابية**:
   - تطبيق معادلة $M_s$ على حالة طالب مع افتراض $P_s=80$, $C_{\text{err}}=0 \implies E_s=100$, $C_s=90$:
     $$M_s = (0.55 \times 80) + (0.20 \times 100) + (0.25 \times 90) = 44 + 20 + 22.5 = 86.5\% \implies \text{Mastered}$$
   - تطبيق المعادلة على حالة طالب متعثر $P_s=40$, $C_{\text{err}}=3 \implies E_s=55$, $C_s=50$:
     $$M_s = (0.55 \times 40) + (0.20 \times 55) + (0.25 \times 50) = 22 + 11 + 12.5 = 45.5\% \implies \text{Needs Review}$$
