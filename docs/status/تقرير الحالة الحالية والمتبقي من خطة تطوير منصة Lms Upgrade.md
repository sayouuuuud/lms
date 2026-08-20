# تقرير الحالة الحالية والمتبقي من خطة تطوير منصة Lms Upgrade

**التاريخ:** 18 أغسطس 2026  
**المشروع:** `sayouuuuud/lms` — Lms Upgrade فقط  
**قاعدة البيانات المستهدفة:** PostgreSQL database `upgrade` فقط  
**النطاق المستبعد:** لا توجد أي تغييرات على Zezo LMS أو Zezo Transcoder أو أي مشروع آخر.  
**حالة النشر:** لا يوجد نشر خارجي في هذه الدورة، تنفيذًا لطلب تأجيل النشر.

## 1. الملخص التنفيذي

تم تنفيذ الجزء الأكبر من البنية الوظيفية المخططة في مستودع Lms Upgrade، وجرى رفع التغييرات إلى GitHub على `origin/main`. أضيفت طبقات الصلاحيات التجارية وEntitlement والطلبات والامتحانات وContent/Release وMastery/Review وStudent 360/Support وDecision Center وVideo Operations وWhatsApp reliability، مع migrations للمراحل التي احتاجت تغييرات في Prisma، واختبارات static وpure وTypeScript وbuild.

لكن الحالة الحالية **ليست اكتمالًا إنتاجيًا بنسبة 100%**، وليست صحيحة أيضًا إذا وُصفت بأنها «اختبارات فقط». المتبقي ينقسم إلى أربعة أنواع مختلفة: فجوات كود أو بيانات محدودة، اختبارات runtime وE2E، تحقق تشغيلي من worker وWhatsApp، ومتطلبات إطلاق تدريجي وRLS. أكبر مانعين قبل Go-live هما **عدم وجود RLS policies فعلية في قاعدة `upgrade` الحالية** و**عدم تنفيذ اختبار عزل runtime حقيقي بأدوار PostgreSQL واتصال التطبيق**.

النتيجة الحالية هي:

> **حالة الكود:** متقدمة وقابلة للمراجعة.  
> **حالة قاعدة البيانات:** migrations الرئيسية المطبقة موثقة، ولا توجد migration جديدة معلقة من المراحل 7–9.  
> **حالة الاختبارات:** البوابات المحلية ناجحة، لكن E2E/runtime والخدمات الخارجية لم تُثبت بالكامل.  
> **حالة الإطلاق:** `BLOCKED_FOR_PRODUCTION` إلى حين إغلاق بوابات RLS وE2E والتشغيل التدريجي.

## 2. الحالة الفنية الحالية

| العنصر | الحالة الحالية |
|---|---|
| الفرع | `main` |
| آخر commit | `d190883` — `docs: add final rehearsal and audit report` |
| GitHub | `origin/main` متزامن مع آخر commit |
| شجرة العمل | نظيفة بعد استبعاد الملفات المولدة غير المقصودة |
| framework | Next.js 16.2.9 / React 19 / TypeScript 5.7.3 |
| ORM وقاعدة البيانات | Prisma 6.19.3 مع PostgreSQL 16؛ schema يستخدم `public` و`auth` |
| المصادقة | Auth.js/NextAuth 5 مع PrismaAdapter |
| النشر الخارجي | مؤجل؛ لم يتم deploy أو تغيير Coolify |
| قاعدة الإنتاج المستهدفة | `upgrade` فقط |
| migration المرحلة السادسة | جُربت على staging ثم طبقت على `upgrade` بعد backup |
| migrations المراحل 7–9 | لا تغييرات schema جديدة؛ التنفيذ read-only أو كودي |

## 3. سجل commits المرحلية

| نطاق التنفيذ | Commit | الحالة |
|---|---|---|
| خط الأساس وhealth checks | `0290c9a`, `8e4005c` | مرفوع |
| Entitlement والاشتراكات والBundles | `715bc95` | مرفوع |
| Exam Attempts persistence | `9dec3bd` | مرفوع |
| Content Studio وRelease lifecycle | `2348398` | مرفوع |
| Mastery Map وReview Planner | `7bf2ffb` | مرفوع |
| Student 360 وSupport وIntervention Log | `a54a3a6` | مرفوع |
| Decision Center وmetrics dictionary | `59fdfab` | مرفوع |
| Video Operations وWhatsApp reliability | `e5f636b` | مرفوع |
| RBAC وRLS contracts | `a229f98` | مرفوع |
| Rehearsal والتقرير النهائي | `d190883` | مرفوع وحالي |

## 4. بوابات التحقق التي نجحت

أُعيد تشغيل `pnpm run test:all` بعد إضافة بوابات كل مرحلة. المجموعة تشمل product-domain وsecurity-boundaries وroute contracts وoperational safety وDecision Center وVideo/WhatsApp reliability وRBAC/RLS contracts. كما نجح `pnpm exec tsc --noEmit`، ونجح `git diff --check`، ونجح `pnpm run build` في sandbox.

نجاح build لا يعني أن اتصال التطبيق بالإنتاج تم اختباره؛ بيئة sandbox لا تحتوي `DATABASE_URL`، ولذلك ظهرت رسائل fallback أثناء prerender دون فشل في التجميع. لم يُستخدم build لتعديل قاعدة `upgrade`، ولا يُعتبر دليلًا على نجاح login أو Prisma runtime أو provider integrations.

## 5. النسخ الاحتياطية وRehearsal قاعدة البيانات

تم أخذ backup قبل تجربة migration المرحلة السادسة على staging، ثم أخذ backup مستقل قبل تطبيقها على `upgrade`. جرى فحص كل dump بواسطة `pg_restore` داخل حاوية PostgreSQL 16 نفسها؛ قرأ كل ملف 998 عنصرًا. لم تُنفذ استعادة فعلية إلى قاعدة اختبار منفصلة أثناء Rehearsal الأخير، ولذلك يبقى اختبار restore الكامل بندًا متبقيًا.

| البيئة | الملف | الحجم التقريبي | التحقق |
|---|---|---:|---|
| staging قبل Student 360 | `staging-before-student-360-20260818T123535Z.dump` | 436,462 بايت | `pg_restore` قرأ 998 عنصرًا |
| `upgrade` قبل Student 360 | `upgrade-before-student-360-20260818T123613Z.dump` | 436,342 بايت | `pg_restore` قرأ 998 عنصرًا |

تم التحقق من وجود جداول المرحلة السادسة في staging و`upgrade`، ومنها `support_tickets` و`support_ticket_events` و`interventions` و`intervention_events`. لا يوجد جدول `_prisma_migrations` في هذا النشر؛ لذلك تم اعتماد التحقق المباشر من الجداول والمفاتيح والفهارس بدل اعتبار غياب جدول سجل Prisma فشلًا.

## 6. مقارنة الخطة الأصلية مرحلة بمرحلة

### 6.1 المرحلة 0 الأصلية — تثبيت خط الأساس وإصلاح الإنتاج

**المنفذ:** أضيفت health checks للتطبيق وقاعدة البيانات وR2 وWhatsApp وطابور الفيديو، ووُثقت staging وbackup، وأضيف heartbeat موحد للفيديو في المراحل اللاحقة. كما أصبح مسار قاعدة `upgrade` معروفًا ومحددًا في التنفيذ.

**المتبقي:** لم يُثبت بالكامل login/register/verify من خلال proxy الخارجي في هذه الدورة، ولم يُنفذ فيديو تجريبي كامل من الرفع إلى المعالجة إلى التقديم في rehearsal متصل. كذلك لم تُثبت تنبيهات فعلية لتوقف worker أو تراكم jobs، ولم تُنفذ استعادة backup كاملة إلى قاعدة اختبار منفصلة؛ ما تم هو فحص قابلية قراءة dump.

**الحكم:** منفذة كخط أساس كودي وتشغيلي جزئي، لكنها تحتاج إثبات تشغيل حي قبل اعتبارها مكتملة إنتاجيًا.

### 6.2 المرحلة 1 الأصلية — نموذج المجال والصلاحيات الموحد

**المنفذ:** أضيفت خريطة موارد وصلاحيات مركزية، واستُخدمت Entitlement Service بدل شروط مبعثرة في الواجهات، وأصبحت موارد مثل support وsettings جزءًا من permission map. أضيفت اختبارات لعقود الأدوار وclaims وadmin-only routes.

**المتبقي:** مصفوفة `role/action/resource` لم تُثبت بالكامل لكل حالة القبول المذكورة في الخطة عبر جلسات حقيقية. كما أن الربط مع RLS لم يكتمل؛ التحقق الحالي يصف inventory وحالة RLS لكنه لا يثبت policies فعالة وعزلًا runtime.

**الحكم:** منفذة كتصميم وخدمات وتعاقدات تطبيقية، جزئية على مستوى database authorization.

### 6.3 المرحلة 2 الأصلية — Entitlement والطلبات والدفع والاشتراكات

**المنفذ:** أضيفت النماذج والخدمة التجارية الخاصة بالـEntitlement والمنتجات والBundles والاشتراكات، مع cart وcheckout وapproval، والحفاظ على دعم one-time purchase. توجد حماية transaction/idempotency في تدفق approval بحسب تنفيذ المرحلة.

**المتبقي:** يلزم اختبار حي للحالات الطرفية: renewal، cancellation، expiry، grace period، repeated approval، وعدم تكرار entitlement أو WhatsApp notification. كما يلزم التحقق من timeline كامل لـorder events على واجهة الإدارة ومن إبقاء الطلبات القديمة قابلة للاستخدام دون تحويلها قسرًا.

**الحكم:** منفذة ككود وschema، وتحتاج سيناريوهات integration/E2E لإثبات مخرجات القبول كاملة.

### 6.4 المرحلة 3 الأصلية — Student 360 والدعم وإدارة الأجهزة

**المنفذ:** أضيفت نماذج `support_tickets` و`support_ticket_events` و`interventions` و`intervention_events`، وخدمة `getStudent360` وSupport Inbox وServer Actions محمية وواجهة عربية. يدعم Student 360 قراءة معلومات الطالب والطلبات والمحتوى والتقدم والامتحانات والأجهزة بحسب عقود الخدمة الحالية.

**المتبقي:** لم يُثبت عبر جلسات حقيقية أن موظف الدعم يستطيع حل مشكلة المشاهدة من شاشة واحدة مع اختلاف أسباب entitlement/device/video/database. يلزم كذلك إثبات فصل sections الحساسة حسب الدور، وتجربة إجراءات revoke session وremove device وtrust device مع سبب وaudit log، والتأكد من عدم ظهور الدفع والرسائل إلا للصلاحية المناسبة.

**الحكم:** منفذة بدرجة جيدة على مستوى الخدمة والواجهة والبيانات، والقبول التشغيلي الكامل ما زال متبقيًا.

### 6.5 المرحلة 4 الأصلية — Content Studio وContent QA

**المنفذ:** أضيفت بنية content versions وrelease events ولوحة إدارة ودورة lifecycle، وأصبح بالإمكان التعامل مع النسخ وسجل الأحداث بدل تعديل النسخة المنشورة بلا أثر. توجد reconciler وCRON_SECRET ومكونات إدارة مرتبطة بالدورة.

**المتبقي:** يجب تشغيل workflow كامل بحساب مدرس/محرر: إنشاء Draft، ربط الدرس والفيديو والملخص والمرفقات والأسئلة، تشغيل checks الحرجة، Preview as Student، تجاوز warning بصلاحية وسبب، ثم منع النشر عند وجود error. يلزم أيضًا اختبار كل قواعد QA المذكورة في الخطة: روابط HLS، missing assets، أسعار غير منطقية، امتحان بلا أسئلة، أسئلة بلا إجابات، targeting وprerequisites الدائرية.

**الحكم:** lifecycle وschema موجودان، لكن تغطية QA التشغيلية ومطابقة preview لمشهد الطالب تحتاج E2E.

### 6.6 المرحلة 5 الأصلية — Release وجدولة المحتوى

**المنفذ:** أضيفت content versions وrelease events وحالات release وإدارة دورة النشر، مع reconciler وإجراءات محمية. هذا يوفر أساس draft/review/approved/published والتدقيق.

**المتبقي:** يلزم إثبات الحالات السبعة المذكورة في الخطة `draft` و`in_review` و`approved` و`scheduled` و`published` و`unpublished` و`archived`، وتجربة النشر المجدول والفتح بعد prerequisite أو مدة اشتراك، واختبار إيقاف Release واحد دون فقدان progress القديم. كما يجب التحقق من أن availability محسوب في طبقة الوصول لا في الواجهة فقط.

**الحكم:** منفذة كدورة lifecycle، والقبول الوظيفي المتسلسل ما زال يحتاج rehearsal فعلي.

### 6.7 المرحلة 6 الأصلية — الامتحانات والواجبات

**المنفذ:** أضيفت `exam_attempts` و`grade_events`، وserver-side autosave وrevision ومعاملة transaction، مع migration على staging و`upgrade`. هذا يعالج أساس التدقيق والاستمرارية للمحاولات.

**المتبقي:** يلزم اختبار انقطاع الشبكة واستكمال المحاولة، server-side timer ضد تغيير ساعة الجهاز، منع double submit، question snapshot بعد تعديل السؤال، randomization إن كان مدعومًا، manual review للأسئلة المقالية/الملفات، وتعديل الدرجة مع سبب وسجل grade event. يجب أيضًا استخراج الأداء حسب الامتحان والفرع والموضوع عبر بيانات حقيقية.

**الحكم:** persistence الأساسية منفذة، لكن معيار القبول الكامل يحتاج integration/E2E.

### 6.8 المرحلة 7 الأصلية — Mastery Map ومراجعة ليلة الامتحان

**المنفذ:** أضيفت `student_mastery_snapshots` و`review_plans` وأيام ومهام وأحداث، وخدمة planner وServer Actions وبطاقة عربية وحفظ snapshot لخريطة الإتقان. توجد قواعد deterministic وشرح لحالة الخريطة ضمن التنفيذ الحالي.

**المتبقي:** الخطة الأصلية تتوقع كيانات skills/topics وروابط واضحة للدروس والأسئلة والامتحانات. يجب التحقق من أن taxonomy كاملة ومثبتة في البيانات وليست مجرد روابط جزئية، وأن كل mastery reason يعود إلى أسئلة/محاولات فعلية. يلزم اختبار إعادة جدولة اليوم الفائت دون فقدان التاريخ، وتوصيات لا تشير إلى محتوى غير موجود، ورؤية أضعف المهارات على مستوى الفرع/الفصل.

**الحكم:** planner وsnapshots منفذان بدرجة جيدة، لكن عمق taxonomy والتحقق على بيانات متنوعة متبقيان.

### 6.9 المرحلة 8 الأصلية — تجربة التعلم والإنقاذ والشارات

**المنفذ:** توجد أجزاء من رحلة التعلم والتحليلات وإشارات الإنقاذ ضمن التنفيذ السابق، لكن تقرير القبول المرحلي لا يثبت أن جميع مخرجات هذه المرحلة أصبحت مكتملة end-to-end بنفس درجة مراحل Entitlement وExam Attempts وSupport.

**المتبقي كوظائف أو إثبات:** يجب حصر وتنفيذ أو استكمال Next Best Action على Dashboard الطالب بحيث تقود كل بطاقة إلى إجراء واحد؛ إنشاء rescue queue بحالات اشترى ولم يبدأ، بدأ وتوقف، فشل في موضوع، وانقطع قبل امتحان؛ تحديد limits وconsent وcooldown قبل أي WhatsApp تلقائي؛ وتثبيت badge rules قابلة للتدقيق لا تمنح الشارة بمجرد فتح الشاشة. كما يلزم اختبار استخراج قائمة الطلاب المتوقفين مع سبب وإجراء، واختبار التحسن الشخصي بدل leaderboard.

**الحكم:** هذه هي أكبر فجوة وظيفية غير الأمنية في المقارنة الحالية؛ لا ينبغي اعتبارها مكتملة لمجرد وجود إشارات أو أجزاء UI.

### 6.10 المرحلة 9 الأصلية — Decision Center والتحليلات التشغيلية

**المنفذ:** أضيف `lib/decision-center-metrics.ts` كقاموس موحد يحدد المصدر والفترة والمنطقة الزمنية والحدود والخصوصية. أضيف `getDecisionCenterSnapshot` واستُخدمت بطاقات عربية للقيم والمصادر وفحوص sanity، مع الحفاظ على الإشارات الموجودة. تغطي اللقطة الحالية مؤشرات funnel/completion/watch/drop-off/exams/rescue/orders/video/WhatsApp وفق البيانات المتاحة.

**المتبقي:** يجب معايرة الأرقام على بيانات تشغيلية حقيقية ومقارنتها باستعلامات مرجعية معتمدة. funnel الحالي لا يثبت رحلة نفس الزائر من المشاهدة إلى الشراء بسبب غياب correlation موثوق في النموذج؛ لذلك يعرض مراحل مستقلة ولا يجوز تسميته conversion funnel مثبتًا. كما يلزم ربط كل Decision Card بإجراء فعلي وقياس أثره، والتحقق من عدم كشف بيانات شخصية لمستخدم غير مخول.

**الحكم:** منفذة بدرجة قوية كطبقة metrics وواجهة وsanity، لكنها ليست مستودع أحداث كاملًا ولا تحليل attribution كاملًا.

### 6.11 المرحلة 10 الأصلية — تقوية المساعدين والفيديو والاتصالات

**المنفذ:** أضيفت route-level RBAC ومسارات admin-only وربط `/admin/streaming` بصلاحية settings، وأضيفت بوابات RBAC سلوكية وعقود RLS inventory. في الفيديو أضيف heartbeat موحد وتصنيف `ok/missing/invalid/stale` وملخص تشغيل وإعادة retry/requeue محمية مع إخفاء raw errors. في WhatsApp أضيف timeout وtemplate validation وحد نص وbackoff محدود وdedupe summary دون تسريب نصوص الرسائل.

**المتبقي الأمني:** RLS مفعّل على الجداول الحساسة، لكن الفحص التشغيلي أظهر `policies=0`، كما أن أدوار PostgreSQL `anon` و`authenticated` غير موجودة في قاعدة `upgrade` الحالية. يجب تحديد نموذج PostgreSQL الصحيح، تصميم policies ضيقة متوافقة مع Prisma/Auth.js، تجربتها على staging، ثم تطبيقها على `upgrade` بعد backup.

**المتبقي التشغيلي:** يجب تشغيل worker حقيقي لإثبات heartbeat وstale jobs وqueue latency وdead-letter، واختبار provider sandbox/حقيقي لإثبات provider message ID وwebhook replay وopt-out وretry/dedupe. لا يكفي وجود pure functions أو ملخصات سجلات.

**الحكم:** طبقات الكود قوية، لكن runtime security وruntime integrations غير مكتملين.

### 6.12 المرحلة 11 الأصلية — الاختبارات والهجرة والإطلاق التدريجي

**المنفذ:** توجد بوابات product-domain وsecurity-boundaries وroute-contract وoperational-safety وDecision Center وVideo/WhatsApp وRBAC/RLS، ونجحت `pnpm run test:all` و`pnpm exec tsc --noEmit` و`pnpm run build` و`git diff --check`. تمت migrations المرحلة السادسة عبر staging ثم backup ثم `upgrade`، وجرى توثيق الجرد والتدقيق.

**المتبقي:** الخطة تطلب unit لمنطق entitlement/mastery/badges، integration للطلبات والاشتراكات والفيديو، authorization/RLS لكل role، وE2E لمسارات التسجيل والشراء وفتح المحتوى والمشاهدة والتقدم والامتحان والدعم وإلغاء الجهاز. الموجود حاليًا لا يثبت كل هذه المسارات من خلال مستخدم إداري وطالب تجريبي وقاعدة staging متصلة.

كما لم يُنفذ feature flag rollout أو canary على admin واحد/مدرس تجريبي/مجموعة طلاب، ولم تُنفذ مراقبة حية لمعدلات الأخطاء وفشل المصادقة وفشل الفيديو وتكرار الطلبات وlatency وتذاكر الدعم، ولم تُجرّب خطة rollback في بيئة تشغيلية.

**الحكم:** بوابات قبول الكود ناجحة، لكن بوابة Go-live الكاملة غير مكتملة.

## 7. قائمة المتبقي مرتبة حسب الأولوية

### أ. متطلبات حرجة قبل أي إطلاق

أولًا، يجب تصميم RLS policies الحقيقية وتحديد الأدوار التي يستخدمها التطبيق فعليًا. لا ينبغي إنشاء policies عامة تسمح بالقراءة أو الكتابة بلا شروط؛ المطلوب ربط الطالب بهويته، والموظف بدوره وموارده، مع منع الوصول إلى payment/PII إلا حسب permission. بعد ذلك تُجرب policies على staging بنسخة بيانات مناسبة، ثم يُعاد اختبار Auth.js وPrisma وجميع Server Actions، ثم فقط يؤخذ backup جديد ويُطبق التغيير على `upgrade`.

ثانيًا، يجب تشغيل runtime authorization بحسابات منفصلة: admin، assistant بموارد محددة، وstudent. يجب إثبات أن المسارات admin-only ترفض الطالب والمساعد غير المصرح، وأن `/admin/streaming` يتطلب settings، وأن Support وStudent 360 لا يعرضان المدفوعات والرسائل إلا بالصلاحية المناسبة.

ثالثًا، يجب تنفيذ E2E متصل ببيئة staging عبر مسارات رئيسية: تسجيل الدخول، شراء one-time، اشتراك أو Bundle، فتح المحتوى، مشاهدة وتسجيل progress، بدء واستكمال وتسليم امتحان، دعم الطالب، إدارة الجهاز، release، وقرار الإنقاذ. كل مسار يجب أن يتحقق من قاعدة البيانات والأحداث لا من ظهور النص في الواجهة فقط.

### ب. فجوات تنفيذية أو بيانات

يجب حسم taxonomy الخاصة بالمهارات والموضوعات وربطها فعليًا بالأسئلة والدروس والامتحانات. كما يجب مراجعة مكونات rescue/Next Best Action/badges مقابل الخطة الأصلية، واستكمال ما لا يملك service أو persistence أو rule قابلًا للتدقيق. ويجب إضافة أي order/subscription events ناقصة إذا كانت عملية التجديد والإلغاء لا تترك timeline كاملًا.

يجب كذلك تحويل Content QA من وجود checks عامة إلى coverage صريح لكل قاعدة حرجة في الخطة، مع ضمان أن Preview as Student يطبق نفس availability وEntitlement وRelease logic التي سيستخدمها الطالب بعد النشر.

### ج. تحقق تشغيلي من الخدمات

يلزم تشغيل فيديو كامل على worker حقيقي أو بيئة transcoder معتمدة، ومراقبة heartbeat والـstale detector وإعادة المحاولة والـdead-letter والـlatency. ويلزم تشغيل WhatsApp provider sandbox أو provider حقيقي لاختبار provider IDs وwebhooks وopt-out وdedupe وbackoff وحدود الرسائل. يجب أن تُحفظ audit events دون تسريب نصوص الرسائل أو raw provider errors للمستخدم غير المخول.

### د. الاسترجاع والإطلاق

يجب تنفيذ restore فعلي إلى قاعدة اختبار منفصلة باستخدام backup، ثم مقارنة counts والعلاقات والفهارس قبل وبعد. فحص `pg_restore --list` يثبت قابلية قراءة dump لكنه لا يثبت نجاح الاستعادة. بعد ذلك يجب كتابة rollback plan لكل migration، وتجربة feature flags وcanary وmonitoring وrollback قبل فتح المزايا لكل الطلاب.

## 8. ما لا يحتاج إلى عمل حاليًا

لا توجد migration جديدة مطلوبة من Decision Center أو Video Operations أو RBAC/RLS contracts في شكلها الحالي؛ هذه التغييرات كودية أو read-only. لا ينبغي تشغيل migration إضافية فقط لإغلاق الاختبارات. Migration مطلوبة فقط إذا قررنا إضافة RLS policies/roles أو كيانات skills/topics أو persistence ناقصة للإنقاذ والشارات، وعندها يجب تطبيق بروتوكول backup ثم staging ثم `upgrade`.

كذلك لا يوجد سبب لإعادة بناء الصفحات العامة أو إنشاء SaaS مستقل؛ نطاق هذه الخطة هو قلب Lms Upgrade، والربط التجاري الخارجي مؤجل ولا يدخل في هذا التقرير.

## 9. تعريف الحالة النهائية الحالية

| التصنيف | النسبة الوصفية | المعنى |
|---|---:|---|
| كود المراحل الأساسية | مرتفع | البنية والخدمات والواجهات الرئيسية موجودة ومرفوعة |
| migrations والبيانات | مرتفع للمراحل المنفذة | migrations التجارية والامتحانات والمحتوى والإتقان والدعم مطبقة وفق السجل؛ لا migration جديدة للمراحل 7–9 |
| static/pure acceptance | مكتمل بدرجة قوية | test:all وTypeScript وbuild وdiff check ناجحة في sandbox |
| runtime authorization/RLS | غير مكتمل | لا توجد policies فعلية ولا اختبار عزل كامل بالأدوار الفعلية |
| E2E/integration | غير مكتمل | لم تُثبت كل الرحلة بحسابات حقيقية وstaging متصلة |
| video/WhatsApp production reliability | غير مكتمل | الطبقة البرمجية موجودة، لكن worker/provider الحقيقي لم يُختبر كاملًا |
| rollout/rollback/go-live | مؤجل | لم يُنفذ نشر خارجي أو canary أو rollback حي |

## 10. قرار العمل المقترح من هنا

الخطوة الصحيحة التالية ليست إضافة صفحات تجميلية، بل فتح مسار **Pre-production Hardening**. يبدأ هذا المسار بتثبيت نموذج الأدوار وRLS على staging، ثم تشغيل E2E وruntime authorization، ثم تنفيذ restore كامل إلى قاعدة اختبار، ثم اختبار worker وWhatsApp sandbox، ثم canary وrollback. أي فشل في هذه السلسلة يجب أن يعاد إلى الكود أو schema قبل لمس `upgrade`.

بعد إغلاق هذه البوابات، يمكن إصدار تقرير Go-live جديد يعلن ما إذا كانت الخطة وصلت إلى اكتمال 100% فعليًا. حتى ذلك الحين، التوصيف الدقيق هو **تنفيذ كودي متقدم مع فجوات pre-production موثقة**، وليس اكتمال اختبارات فقط ولا اكتمال إطلاق إنتاجي.

## 11. مراجع المشروع

1. `خطةالتنفيذالتفصيليةلتطويرمنصةLmsUpgrade.md` — الخطة الأصلية المرفقة.
2. `analysis/stage-6-inventory_2026-08-18.md` — جرد Student 360 وSupport.
3. `analysis/stage-7-inventory_2026-08-18.md` — جرد Decision Center.
4. `analysis/stage-8-inventory_2026-08-18.md` — جرد Video Operations وWhatsApp reliability.
5. `analysis/stage-9-inventory_2026-08-18.md` — جرد RBAC وRLS.
6. `analysis/stage-9-rls-check.sql` — فحص RLS read-only.
7. `analysis/re-audit_2026-08-17.md` — سجل التدقيق المرحلي.
8. `analysis/final-audit_2026-08-18.md` — تقرير Rehearsal والتدقيق النهائي المرحلي.

**الكاتب:** Manus AI
