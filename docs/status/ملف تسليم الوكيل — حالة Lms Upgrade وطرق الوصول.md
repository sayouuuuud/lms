# ملف تسليم الوكيل — حالة Lms Upgrade وطرق الوصول

**التاريخ:** 20 أغسطس 2026  
**المشروع:** Lms Upgrade فقط  
**المستودع:** `sayouuuuud/lms`  
**الفرع:** `main`  
**قاعدة البيانات المسموح بها:** `upgrade` فقط  
**ممنوع:** لمس أي مشروع أو قاعدة أو حاوية أخرى، خصوصًا Zezo LMS وZezo Transcoder.

> هذا الملف مخصص لتسليم السياق التشغيلي لوكيل جديد. لا يحتوي على كلمات مرور أو محتوى مفاتيح خاصة، ولا يجوز إضافة أسرار صريحة إليه أو رفعها إلى GitHub.

## 1. الحالة الحالية المختصرة

تم تنفيذ ورفع معظم البنية الأساسية لخطة تطوير Lms Upgrade. آخر commit موثق هو:

```text
d5127e6 docs: add current status and remaining work report
```

الفرع المحلي و`origin/main` كانا متزامنين والشجرة نظيفة عند إنشاء هذا الملف.

المراحل المنفذة كوديًا وموثقة تشمل خط الأساس، Entitlement والاشتراكات والBundles، Exam Attempts، Content Studio وRelease lifecycle، Mastery Map وReview Planner، Student 360 وSupport وIntervention Log، Decision Center، Video Operations وWhatsApp reliability، وطبقة RBAC/RLS contracts.

نجحت بوابات `pnpm run test:all` و`pnpm exec tsc --noEmit` و`pnpm run build` و`git diff --check` ضمن بيئة sandbox. تم أخذ backup قبل migration المرحلة السادسة، وتجربة migration على staging، ثم تطبيقها على قاعدة `upgrade` بعد backup الإنتاج. لا توجد migration جديدة معلقة من مراحل Decision Center أو Video Operations أو RBAC/RLS contracts.

الحالة ليست Go-live مكتملًا بنسبة 100%. ما يزال الإطلاق محجوبًا حتى تنفيذ RLS policies فعلية، واختبار عزل runtime بأدوار حقيقية، وE2E/Integration متصل، وrestore كامل إلى قاعدة اختبار منفصلة، واختبار worker وWhatsApp provider في بيئة تشغيلية.

## 2. المستودع المحلي وGitHub

مسار المشروع المحلي داخل بيئة الوكيل:

```text
/home/ubuntu/lms-repo
```

المستودع البعيد:

```text
https://github.com/sayouuuuud/lms.git
```

أوامر التحقق:

```bash
cd /home/ubuntu/lms-repo
git remote -v
git status --short
git log -5 --oneline
```

استنساخ المستودع إذا لم يكن موجودًا:

```bash
gh repo clone sayouuuuud/lms /home/ubuntu/lms-repo
```

> GitHub CLI مهيأ في بيئة الوكيل. لا تُنسخ رموز GitHub إلى هذا الملف أو إلى سجلات الأوامر.

## 3. بيانات الوصول إلى الخادم

| البيان | القيمة |
|---|---|
| Host | `169.58.172.222` |
| Port | `22` |
| المستخدم الذي ذكره صاحب المشروع | `manusreview` |
| المستخدم الذي تم اختبار الوصول به بالمفتاح الموجود | `root` |
| مفتاح SSH الخاص داخل بيئة الوكيل | `/home/ubuntu/upload/lms-upgrade-agent-2` |
| النطاق | خادم Lms Upgrade فقط |

تم اختبار الوصول الفعلي بالمفتاح الموجود داخل بيئة الوكيل باستخدام `root`. أمر الاتصال الموثق:

```bash
ssh -i /home/ubuntu/upload/lms-upgrade-agent-2 \
  -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=accept-new \
  root@169.58.172.222
```

اختبار دون فتح جلسة تفاعلية:

```bash
ssh -i /home/ubuntu/upload/lms-upgrade-agent-2 \
  -o IdentitiesOnly=yes \
  root@169.58.172.222 'hostname && id && docker ps --format "{{.Names}}"'
```

صلاحيات المفتاح:

```bash
chmod 600 /home/ubuntu/upload/lms-upgrade-agent-2
```

### ملاحظة حول المستخدم `manusreview`

بيانات المشروع الأصلية تشير إلى المستخدم `manusreview`، لكن مسار التنفيذ الموثق والناجح في هذه الدورة استخدم `root` بالمفتاح نفسه. إذا كان هناك حاجة لإجبار الاتصال بالمستخدم `manusreview`، يجب التأكد أولًا من أن المفتاح العام المقابل موجود في `/home/manusreview/.ssh/authorized_keys` دون تعطيل مسار `root` العامل. لا ينبغي تغيير SSH configuration أو إعادة تشغيل الخدمة دون backup وخطة rollback.

## 4. قاعدة البيانات المستهدفة فقط

| البيان | القيمة |
|---|---|
| Database | `upgrade` |
| DB user | `postgres` |
| PostgreSQL | 16-alpine داخل Docker |
| Container | `qen4feg2ytbefminorpooc3z` |
| Host/port من الخادم | `169.58.172.222:5432` |
| Prisma schemas | `public` و`auth` |
| قاعدة staging المستخدمة للاختبار | `lms_upgrade_staging_20260818T022847Z` |

### اتصال PostgreSQL من داخل حاوية Upgrade

هذا هو المسار الأكثر أمانًا لعمليات الفحص والإدارة، لأنه لا يعتمد على تعريض كلمة مرور في سطر الأوامر:

```bash
ssh -i /home/ubuntu/upload/lms-upgrade-agent-2 root@169.58.172.222 \
  'docker exec -it qen4feg2ytbefminorpooc3z \
   psql -U postgres -d upgrade'
```

استعلام read-only للتحقق من القاعدة الحالية:

```bash
ssh -i /home/ubuntu/upload/lms-upgrade-agent-2 root@169.58.172.222 \
  "docker exec qen4feg2ytbefminorpooc3z \
   psql -U postgres -d upgrade -c 'SELECT current_database(), current_user;'"
```

فحص الجداول فقط:

```bash
ssh -i /home/ubuntu/upload/lms-upgrade-agent-2 root@169.58.172.222 \
  "docker exec qen4feg2ytbefminorpooc3z \
   psql -U postgres -d upgrade -c '\\dt public.*'"
```

### اتصال Prisma من التطبيق

العقد المتوقع في بيئة التطبيق هو:

```text
DATABASE_URL=postgresql://postgres:<DB_PASSWORD>@169.58.172.222:5432/upgrade
DIRECT_URL=postgresql://postgres:<DB_PASSWORD>@169.58.172.222:5432/upgrade
```

`<DB_PASSWORD>` سر تشغيلي موجود في بيئة التشغيل/ملف البيئة المحلي المخصص للمشروع، ولم يتم نسخه هنا أو إلى GitHub. لا تستخدم كلمة المرور في command history أو في ملفات Markdown أو في commit. عند الحاجة، اقرأها من secret manager أو ملف البيئة المصرح به داخل بيئة التشغيل، ولا تطبعها.

اختبار Prisma من مجلد المشروع بعد تحميل البيئة الصحيحة:

```bash
cd /home/ubuntu/lms-repo
pnpm exec prisma validate
pnpm exec prisma generate
```

لا تستخدم `prisma migrate deploy` على `upgrade` مباشرة. أي migration جديدة يجب أن تمر بالترتيب التالي:

1. فحص SQL وschema محليًا.
2. backup قابل للاسترجاع من staging.
3. تطبيق migration على `lms_upgrade_staging_20260818T022847Z`.
4. تشغيل test:all وTypeScript وbuild وruntime checks على staging.
5. backup جديد من `upgrade`.
6. تطبيق migration على `upgrade` فقط.
7. تحقق read-only من الجداول والفهارس والبيانات.

## 5. النسخ الاحتياطية المعروفة

تم أخذ وفحص نسخ قبل migration المرحلة السادسة:

| البيئة | اسم النسخة | ملاحظة |
|---|---|---|
| staging | `staging-before-student-360-20260818T123535Z.dump` | فحص `pg_restore` نجح وقرأ 998 عنصرًا |
| `upgrade` | `upgrade-before-student-360-20260818T123613Z.dump` | فحص `pg_restore` نجح وقرأ 998 عنصرًا |

مسار النسخ على الخادم:

```text
/data/backups/lms-upgrade/
```

فحص قائمة backup من داخل حاوية PostgreSQL 16:

```bash
ssh -i /home/ubuntu/upload/lms-upgrade-agent-2 root@169.58.172.222 \
  'docker exec qen4feg2ytbefminorpooc3z \
   sh -lc "pg_restore --list /data/backups/lms-upgrade/<backup-file>.dump | head"'
```

> قراءة قائمة dump لا تساوي restore كاملًا. قبل Go-live يجب استعادة نسخة إلى قاعدة اختبار منفصلة، ثم مقارنة الجداول والعلاقات والفهارس والcounts.

## 6. الملفات التوثيقية المهمة

```text
analysis/current-status-and-remaining-work_2026-08-18.md
analysis/final-audit_2026-08-18.md
analysis/re-audit_2026-08-17.md
analysis/stage-6-inventory_2026-08-18.md
analysis/stage-7-inventory_2026-08-18.md
analysis/stage-8-inventory_2026-08-18.md
analysis/stage-9-inventory_2026-08-18.md
analysis/stage-9-rls-check.sql
analysis/remaining-plan-batches_2026-08-18.md
```

ملفات التشغيل الحساسة لا تُشارك داخل التقرير:

```text
.env
.env.local
/home/ubuntu/upload/lms-upgrade-agent-2
```

لا ترفع أيًا منها إلى GitHub ولا تضع محتواها في issue أو commit أو log.

## 7. الاختبارات الحالية

الأوامر المحلية الأساسية:

```bash
cd /home/ubuntu/lms-repo
pnpm run test:all
pnpm exec tsc --noEmit
pnpm run build
git diff --check
```

بوابات المرحلة التاسعة تشمل فحوص RBAC/RLS contracts وsecurity boundaries وroute contracts. هذه البوابات تثبت عقود الكود، لكنها لا تثبت وحدها عزل database runtime.

## 8. المتبقي قبل اعتبار المشروع جاهزًا للإنتاج

### حرج

- تصميم وتطبيق RLS policies فعلية على staging ثم `upgrade` بعد backup.
- تحديد أدوار PostgreSQL التي يستخدمها Auth.js/Prisma فعليًا؛ أدوار `anon` و`authenticated` غير موجودة حاليًا في قاعدة `upgrade`.
- اختبار admin/assistant/student runtime مع رفض المسارات والموارد غير المصرح بها.
- تشغيل E2E/Integration متصل بقاعدة staging وبجلسات التطبيق.

### تشغيلي

- استعادة backup كاملة إلى قاعدة اختبار منفصلة.
- اختبار فيديو كامل عبر worker حقيقي: upload، processing، heartbeat، stale، retry، dead-letter، delivery.
- اختبار WhatsApp provider sandbox أو provider حقيقي: provider message ID، webhook replay، opt-out، dedupe، retry وbackoff.
- اختبار feature flags وcanary وrollback والمراقبة قبل الإطلاق.

### وظيفي يحتاج إثباتًا أو استكمالًا

- دورة Release كاملة عبر الواجهة: Draft، Review، Approval، Scheduling، Publish، Unpublish.
- حالات الامتحان الطرفية: انقطاع الشبكة، timer server-side، double submit، snapshot، manual grading.
- taxonomy كاملة للـskills/topics وربطها بالدروس والأسئلة والامتحانات.
- مراجعة Rescue/Next Best Action/Badges مقابل الخطة الأصلية والتأكد من وجود persistence وrules وconsent/cooldown/audit.
- الحالات التجارية الطرفية: renewal، cancellation، expiry، grace period وdouble approval.

## 9. قواعد الأمان والتشغيل للوكيل الجديد

يجب أن يعمل الوكيل داخل `/home/ubuntu/lms-repo` وعلى قاعدة `upgrade` فقط. قبل أي SQL، اطبع `current_database()` و`current_user` واستعمل `ON_ERROR_STOP=1` عند تطبيق migrations. لا تستخدم `DROP DATABASE` أو `TRUNCATE` أو `DELETE` على `upgrade` في سياق الاختبار. لا تلمس حاويات غير حاوية `qen4feg2ytbefminorpooc3z`.

أي تعديل في schema يتطلب backup staging وتجربة كاملة قبل الإنتاج. أي عملية نشر أو تغيير Coolify مؤجلة حتى إغلاق RLS وE2E والـrollback. عند فشل اختبار، وثّق السبب في `analysis/re-audit_2026-08-17.md` ولا تتجاوز الفشل بتعديل assertion لإخفائه.

## 10. خلاصة التسليم

لدى الوكيل الجديد كل ما يلزم لفهم المشروع والوصول الآمن إلى المستودع والخادم وقاعدة `upgrade`، باستثناء كلمات المرور والمفتاح الخاص اللذين يظلان خارج المستودع وفي بيئة الأسرار. نقطة البدء الصحيحة ليست إعادة تنفيذ المراحل من الصفر؛ بل تنفيذ مسار Pre-production Hardening الآتي:

```text
RLS design على staging
  -> runtime role tests
  -> E2E/Integration على staging
  -> full backup restore rehearsal
  -> video worker وWhatsApp provider tests
  -> canary + monitoring + rollback
  -> Go-live decision
```

**حالة القرار الحالية:** `BLOCKED_FOR_PRODUCTION` حتى إغلاق المتطلبات الحرجة أعلاه.
