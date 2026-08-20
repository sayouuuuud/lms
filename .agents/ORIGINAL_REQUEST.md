# Original User Request

## 2026-08-20T17:49:14Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Small focused team

This is a single self-contained fix; keep it small and focused.
تطبيق سياسات الأمان على مستوى الصفوف (Row Level Security - RLS) في قاعدة بيانات PostgreSQL، وتحديث كود التطبيق (Prisma) لاستخدام أدوار قاعدة البيانات ديناميكياً لضمان العزل الأمني التام قبل إطلاق المنصة.

Working directory: /home/ubuntu/lms-repo
Integrity mode: development

## Requirements

### R1. إنشاء سياسات RLS وأدوار قاعدة البيانات
تحديد وإنشاء الأدوار الفعلية لقاعدة البيانات (مثل `anon`، `authenticated`، وأدوار أخرى إن لزم الأمر) وإنشاء سياسات RLS (Row Level Security) على الجداول الحساسة بحيث لا يتمكن أي طالب من رؤية بيانات طالب آخر، ولا يتمكن الموظف إلا من رؤية ما تسمح به صلاحياته.

### R2. تعديل Prisma للعمل مع الأدوار ديناميكياً
تعديل كود التطبيق (تحديداً تهيئة Prisma Client والاتصال بقاعدة البيانات) لكي يقوم بتمرير سياق المستخدم الحالي (عن طريق `SET ROLE` أو إعداد المتغيرات المحلية في PostgreSQL) مع كل استعلام، بدلاً من استخدام مستخدم المدير العام في جميع العمليات.

## Acceptance Criteria

### Security & RLS (سياسات الأمان)
- [ ] وجود سكربت تحقق (Verification Script) يتصل بقاعدة البيانات باستخدام أدوار مختلفة (طالب أ، طالب ب) ويثبت برمجياً أن طالب أ لا يمكنه قراءة أو تعديل بيانات طالب آخر.
- [ ] سياسات الـ RLS مطبقة على قاعدة `upgrade` أو `staging` بنجاح دون إحداث أخطاء في الـ Migrations.

### Application Integration (تكامل التطبيق)
- [ ] وجود اختبار تكاملي (Integration Test) أو سكربت برمجي يستدعي الـ Server Actions بحسابات مختلفة، ويثبت أن Prisma يمرر هوية المستخدم بشكل صحيح لقاعدة البيانات، وأن الـ RLS يمنع العمليات غير المصرح بها بنجاح.
- [ ] تأكيد أن المسارات الإدارية لا تتعطل بالنسبة لمدير النظام (Admin) عند تفعيل هذه السياسات.

## 2026-08-20T19:05:21Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Small focused team

This is a single self-contained fix; keep it small and focused.
استكمال أنظمة الامتحانات، شجرة المهارات، ونظام الإنقاذ مع الواتساب في منصة Lms Upgrade.

Working directory: /home/ubuntu/lms-repo
Integrity mode: development

## Requirements

### R1. الحالات الطرفية للامتحانات (Exams Edge Cases)
تأمين محاولات الامتحانات للتعامل مع الانقطاعات (استئناف آلي)، حساب الوقت المتبقي من جهة الخادم (Server-side Timer) لمنع التلاعب بساعة الجهاز، منع التكرار العرضي للإرسال (Double Submit)، والاحتفاظ بلقطة (Snapshot) من السؤال أثناء المحاولة حتى لا تتأثر إجابة الطالب إذا قام المدرس بتعديل السؤال لاحقاً.

### R2. شجرة المهارات وخريطة الإتقان (Mastery & Taxonomy)
بناء هيكل تنظيمي للمهارات والمواضيع (Skills/Topics) وربطها الفعلي بالدروس والأسئلة والامتحانات. بناء آلية تقييم تحسب مستوى إتقان الطالب بناءً على نتائجه، وتكرار أخطائه، وإكمال المحتوى.

### R3. نظام الإنقاذ (Rescue System) وإشعارات الواتساب
تحديد الطلاب المتعثرين (اشترى ولم يبدأ، رسب متكرراً، أو انقطع قبل الامتحان) وإنشاء قائمة (Rescue Queue). يجب ربط هذا النظام بوظيفة الواتساب لإرسال رسائل إنقاذ مع مراعاة فترات التبريد (Cooldown) وحدود الإرسال لمنع الإزعاج.

## Acceptance Criteria

### الامتحانات (Exams)
- [ ] وجود سكربت تحقق برمجي يحاكي انقطاع الاتصال ويثبت إمكانية الاستئناف بنفس الوقت المتبقي المُدار عبر الخادم (Server-side).

### خريطة الإتقان (Mastery)
- [ ] سكربت تحقق ينشئ محاولات امتحانات وهمية ويثبت أن مستوى الإتقان (Mastery Score) يتحدث تلقائياً ويشير إلى المحتوى/السؤال المرتبط.

### نظام الإنقاذ (Rescue)
- [ ] اختبار تكاملي (Integration Test) يولد حالة طالب متعثر، ويثبت إضافته لقائمة الإنقاذ وإرسال رسالة واتساب (عبر Mock Provider أو Sandbox) مع التحقق من تطبيق قواعد منع الإرسال المتكرر (Cooldown).

