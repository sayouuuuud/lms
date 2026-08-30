# تقرير تنفيذ مفتاح تبديل مصدر بيانات الصفحات العامة (Data Source Toggle Switch)

## 1. ملخص التغييرات (What I Changed)

### قاعدة البيانات والمخطط (Database & Prisma Schema)
- **`scripts/005_sync_public_with_db.sql` & `scripts/apply_005.mjs`**: إنشاء وتنفيذ استعلام إضافة عمود `sync_public_with_db BOOLEAN NOT NULL DEFAULT true` إلى جدول `platform_settings`.
- **`prisma/schema.prisma`**: إضافة الحقل `sync_public_with_db Boolean @default(true)` في النموذج `platform_settings` وتوليد Prisma Client بنجاح.

### منطق النظام ومساعد الإعدادات (Backend & Logic)
- **`lib/platform-settings.ts`**: إنشاء وحدة المساعد `isPublicSyncWithDbEnabled()` للتحقق من وضع المزامنة (قاعدة البيانات الديناميكية مقابل الوضع الثابت).
- **`app/admin/settings/actions.ts`**:
  - تحديث `getPlatformSettings()` لجلب حقل `sync_public_with_db`.
  - تحديث `updatePlatformSettings()` لاستقبال وتحديث `sync_public_with_db` مع إعادة التحقق الفوري للمسارات `revalidatePath('/', 'layout')` وتسجيل النشاط في سجل الأحداث.
- **`lib/curriculum.ts`**:
  - تحديث `getCurriculum()` للتحقق من `isPublicSyncWithDbEnabled()`، وإرجاع المراحل الافتراضية الثابتة `getStaticStages()` دون استعلام جداول قاعدة البيانات عند إيقاف الربط.
- **`lib/site-content.ts`**:
  - تحديث `getSiteContent()` لإرجاع `DEFAULT_SITE_CONTENT` مباشرة عند إيقاف الربط.
- **`lib/landing-data.ts`**:
  - إضافة دالة المساعد `buildStaticMonthlyCourses` و `getStaticStages` للتأكد من توفر كامل بيانات المناهج والكورسات والمحاضرات والدروس والأسعار في الوضع الثابت.
- **`lib/free-lecture-data.ts`**:
  - دعم إرجاع المحاضرات والدروس المجانية التجريبية مباشرة من البيانات الثابتة دون استعلام قاعدة البيانات أو تعطل في حالة عدم وجود `dbId`.
- **`lib/subscription-public.ts`**:
  - ضبط `getPublicSubscriptionContext` لتعطيل شرائط تسويق الاشتراكات في الصفحات العامة عند تفعيل الوضع الثابت لضمان التطابق الكامل مع النسخة الأصلية.

### واجهة الإدارة والصفحات العامة (Admin Panel & Public UI)
- **`components/settings/settings-panel.tsx`**:
  - إضافة زر تبديل أنيق (Toggle Switch) تفاعلي في تبويب "التفضيلات" داخل لوحة الإدارة مع شارة حالة توضح الوضع النشط (`قاعدة البيانات (Dynamic DB)` أو `البيانات الافتراضية (Static Mode)`).
  - دعم الحفظ والتطبيق الفوري عبر `handleSyncPublicWithDbToggle` مع إشعارات Toast وتحديث الصفحة فوراً.
  - إدراج الخيار ضمن عملية الحفظ العامة.
- **`components/stages/branch-detail.tsx` & `components/stages/course-landing.tsx`**:
  - ضبط أزرار الشراء والاشتراك لتوجيه المستخدمين غير المسجلين أو في الوضع الثابت إلى صفحة تسجيل الدخول `/auth`.

---

## 2. سجل التحقق والاختبارات (Verification Record)

### Deep Verification (الاختبارات الآلية المباشرة)
1. **اختبارات المزامنة والتبديل المتكاملة (`scripts/test-public-data-source-toggle.mjs`)**:
   - تم تشغيل 26 اختباراً شاملاً بنجاح 100%:
     - التحقق من وجود عمود `sync_public_with_db` ونوعه `boolean` في جدول `platform_settings`.
     - اختبار التفعيل (`sync_public_with_db = true`): جلب البيانات الديناميكية من قاعدة البيانات.
     - اختبار التعطيل (`sync_public_with_db = false`): استرجاع المراحل الثابتة الثلاث (`sec-1`, `sec-2`, `sec-3`) وكافة الفروع والكورسات والمحاضرات وتفاصيل المعاينة المجانية ونصوص `DEFAULT_SITE_CONTENT` دون أي استعلام للداتابيز.
     - استعادة الحالة الأصلية بنجاح.
2. **اختبارات البناء وسلامة الأنواع (Next.js Build)**:
   - تم تشغيل `cmd /c npm run build` واكتمل بنجاح تام (Code 0) مع توليد 45 صفحة ثابتة وديناميكية دون أي أخطاء في TypeScript أو استيراد المكونات.
3. **مجموعات الاختبارات السابقة (Regression Testing)**:
   - `cmd /c npm run test:subscription-governance`: نجاح بنسبة 100%.
   - `cmd /c npm run test:subscription-comprehensive`: نجاح بنسبة 100%.

### Shallow Verification
- مراجعة استجابة السويتش في `settings-panel.tsx` والشارات التفاعلية.
- مراجعة روابط مسارات الشراء `/auth` في `branch-detail.tsx` و `course-landing.tsx`.

---

## 3. المشاكل المعروفة (Known Issues)
- لا توجد أي مشاكل وظيفية (`None`).

---

## 4. الحالات الحدية والخطوة التالية (Untested Edge Cases & Next Step)
- يمكن للمراجع التوجه إلى لوحة الإدارة -> الإعدادات -> التفضيلات وتجربة تبديل مفتاح "مصدر بيانات الصفحات العامة" وملاحظة التبديل الفوري لمحتوى الموقع بين قاعدة البيانات والوضع الثابت.
