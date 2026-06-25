# خطة تنفيذ الباك-إند الكاملة — منصة LMS

> **الجمهور:** هذا الملف موجّه لوكيل منفّذ (Gemini). نفّذ **Phase واحدة في كل مرة**، بالترتيب، ولا تنتقل للتالية إلا بعد اجتياز قائمة التحقق (Verification Checklist) الخاصة بها.
>
> **المخطِّط:** v0. **المنفّذ:** Gemini.
>
> اللغة: الشرح بالعربية، وكل الأكواد/المعرّفات/SQL بالإنجليزية كما هي مكتوبة حرفيًا.

---

## 0. السياق العام والقواعد الذهبية (اقرأها بالكامل قبل أي تنفيذ)

### 0.1 الوضع الحالي (تم إنجازه — لا تعِد عمله)
الستاك: **Next.js 16 (App Router) + Supabase + Tailwind v4 + pnpm**. كل النصوص عربية وRTL.

تم بالفعل إنشاء وتشغيل التالي:
- **جداول:** `profiles`, `students`, `courses` (مع RLS).
- **دوال DB:** `public.is_admin()` (SECURITY DEFINER, تتفادى الـ RLS recursion)، و`public.handle_new_user()` (trigger على `auth.users` بيعمل profile تلقائي).
- **مصادقة حقيقية:** `components/auth/auth-form.tsx` متصل بـ Supabase، التوجيه حسب الدور (admin → `/dashboard`، student → `/student`).
- **حماية المسارات:** `middleware.ts` + `lib/supabase/proxy.ts`.
- **بنية تحتية:** `lib/supabase/{client,server,proxy,admin}.ts` و`app/auth/callback/route.ts` و`app/auth/error/page.tsx` و`lib/use-logout.ts`.
- **مربوط بالكامل:** صفحتا الطلاب (`app/students/`) والكورسات (`app/courses/`) عبر Server Actions.
- **حسابات تجريبية:** admin `admin@platform.com` / `Admin12345!` — student `student@platform.com` / `Student12345!`.

### 0.2 المعمارية الثابتة (طبّقها في كل Phase بدون استثناء)

1. **مخطط الجداول:** كل جدول له:
   - `id uuid primary key default gen_random_uuid()` (المفتاح الحقيقي الداخلي).
   - `code text unique not null` (المعرّف المعروض للمستخدم مثل `CAT-01`, `CPN-03`, `EXM-2051`) — **حافظ على نفس بادئات الأكواد** الموجودة في ملفات `lib/*-data.ts`.
   - `created_at timestamptz not null default now()`.
2. **لا تكسر واجهات الكومبوننتس:** أنواع TypeScript الموجودة في `lib/*-data.ts` (مثل `CategoryRecord`, `CouponRecord`) هي **العقد**. أي بيانات تجيبها من DB يجب أن تُحوَّل (map) إلى نفس هذا الشكل قبل تمريرها للكومبوننتس. لا تعدّل خصائص الكومبوننتس إلا لو الخطة طلبت ذلك صراحةً.
3. **نمط الصلاحيات:** انسخ دالة `requireAdmin` من `app/students/actions.ts` إلى كل ملف actions جديد (أو استوردها من helper مشترك — انظر 0.4). كل عملية كتابة/تعديل/حذف للأدمن يجب أن تبدأ بـ:
   ```ts
   if (!(await requireAdmin(supabase))) {
     return { error: 'غير مسموح. لازم تكون أدمن.' }
   }
   ```
4. **RLS إجباري** على كل جدول جديد. النمط الافتراضي:
   - الأدمن: `for all using (public.is_admin()) with check (public.is_admin())`.
   - الطالب: سياسة `select` (وأحيانًا `insert`) مقيّدة بـ `auth.uid()`.
5. **Server Actions:** كل ملف actions يبدأ بـ `'use server'`. كل دالة كتابة تنادي `revalidatePath('/the-route')` بعد النجاح وترجع `{ success: true }` أو `{ error: '...' }`. **لا ترمِ exceptions للواجهة** — أرجِع `{ error }`.
6. **جلب البيانات:** صفحات `page.tsx` تبقى `async` (Server Components)، تجيب الداتا من DB، وتحوّلها لشكل الـ types، ثم تمررها للـ Provider/Component عبر prop اسمها `initialX` أو `X`.
7. **التحديث التفاؤلي (Optimistic UI):** في الـ contexts، بعد نداء الـ action استخدم `router.refresh()` (استورد `useRouter` من `next/navigation`). للحذف: شِل العنصر تفاؤليًا ثم نادِ الـ action ثم `refresh`؛ لو رجع `error` أرجِع الحالة و`refresh`.
8. **التوست (toast):** استخدم `import { toast } from 'sonner'` — `toast.success(...)` و`toast.error(...)` بنفس النصوص العربية الموجودة حاليًا في الـ context الأصلي.
9. **لا localStorage إطلاقًا.** كل شيء على Supabase.
10. **بعد كل تعديل ملف:** اكتب postamble من 2-4 جمل تشرح التغيير.

### 0.3 المحاذير القاتلة (Gotchas — راجعها قبل كل Phase)

- **الأيقونات (Lucide) لا تُخزَّن في DB.** جداول مثل `categories` و`calendar` تستخدم `LucideIcon` كـ component. الحل: خزّن في DB عمود `icon text` يحمل **اسم الأيقونة كنص** (مثل `"Code2"`)، وأنشئ helper في `lib/icon-map.ts` يحوّل النص إلى الكومبوننت. عند تحويل صف DB إلى `CategoryRecord`، استبدل `icon: iconFromName(row.icon)`.
- **ألوان Tailwind (color/bg) لا تُولَّد ديناميكيًا.** خزّنها كنصوص حرفية في DB (نفس القيم الموجودة في الـ mock مثل `text-pink-600` و`bg-pink-50 dark:bg-pink-500/10`). لا تبنِ class names بالـ string interpolation.
- **التواريخ النسبية:** ملف `lib/calendar-data.ts` يستخدم `relativeDate()`. في DB خزّن تواريخ **مطلقة** (`date`). عند الـ seed احسبها نسبةً لوقت الـ seed.
- **الأنواع المقيّدة (CHECK):** كل عمود status/type له قيم عربية محددة — انسخها حرفيًا في `check (col in (...))`. أي اختلاف حرف واحد = فشل.
- **رفع الملفات (الإيصالات/المرفقات) = UploadThing فقط، ممنوع Supabase Storage.** أي رفع ملف (إيصال دفع، مرفق واجب، صورة كورس/تصنيف، صورة بروفايل) يتم عبر **UploadThing**. الإعداد مرة واحدة في الخطوة التمهيدية 0.5. النمط الثابت: العميل يرفع عبر مكوّن UploadThing فيرجع **رابط `ufsUrl`** (نص URL كامل)، ثم نمرّر هذا الرابط لـ Server Action تخزّنه في عمود نصّي عادي (مثل `receipt_url text` أو `image_url text` أو `attachment_url text`). **لا تخزّن الملف نفسه ولا base64 في DB — فقط الرابط النصّي.** لا تنشئ أي bucket في Supabase ولا تستخدم `storage.objects` إطلاقًا.
- **`student-courses-data.ts` معقّد:** يبني الأقسام/الدروس برمجيًا. عند الانتقال لـ DB (Phase 6) يجب الحفاظ على نفس دوال الـ helper (`getCourseDetail`, `getLesson`, `getCourseItems`, `isAssignmentUnlocked`) بنفس التواقيع لكن تقرأ من DB.
- **الهوية في بوابة الطالب:** حاليًا `studentProfile` ثابت (مريم خالد). في Phase 10 سيُستبدل بالمستخدم المسجّل فعليًا عبر `auth.uid()` و`students.user_id`.

### 0.4 خطوة تمهيدية مشتركة (نفّذها مرة واحدة قبل Phase 1)

أنشئ ملفين مشتركين:

**`lib/auth-guard.ts`** — helper مشترك للصلاحيات (بدل تكرار `requireAdmin`):
```ts
import 'server-only'
import { createClient } from '@/lib/supabase/server'

export async function requireAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin'
}

/** يرجّع صف students المرتبط بالمستخدم الحالي (للبوابة الطلابية). */
export async function getCurrentStudent(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('students')
    .select('*')
    .eq('user_id', user.id)
    .single()
  return data
}
```

**`lib/icon-map.ts`** — تحويل اسم أيقونة نصّي إلى كومبوننت:
```ts
import {
  Code2, Palette, Megaphone, Languages, BarChart3, Briefcase, Layers,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  Code2, Palette, Megaphone, Languages, BarChart3, Briefcase, Layers,
}

export function iconFromName(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || Layers
}

export const iconNames = Object.keys(ICONS)
```

> **مهم:** أعِد استخدام `requireAdmin` المستوردة من `lib/auth-guard.ts` في `app/students/actions.ts` و`app/courses/actions.ts` لاحقًا لو حبيت توحّد الكود (اختياري، غير مطلوب).

### 0.5 إعداد UploadThing للتخزين (نفّذها مرة واحدة قبل Phase 5)

> **التخزين كله على UploadThing — لا Supabase Storage إطلاقًا.** هذه الخطوة تُنشئ البنية التحتية للرفع التي ستستخدمها Phase 5 (إيصالات)، Phase 8 (مرفقات الواجبات)، و(اختياريًا) صور الكورسات/التصنيفات/البروفايل. **نفّذها كاملةً قبل البدء في Phase 5.**

**(أ) تثبيت الحزم** (المشروع يستخدم **pnpm**؛ ثبّت أولًا ثم اكتب الكود الذي يستوردها):
```bash
pnpm add uploadthing @uploadthing/react
```

**(ب) متغيّر البيئة:** UploadThing يحتاج `UPLOADTHING_TOKEN`. إنه **ليس** ضمن متغيّرات Supabase. تحقّق أولًا عبر `GetOrRequestIntegration` أو بفحص البيئة؛ إن لم يكن موجودًا **اطلبه من المستخدم** عبر `SystemAction(requestEnvironmentVariables)` بالمفتاح `UPLOADTHING_TOKEN`. **لا تكتب توكنًا وهميًا ولا تخمّنه.** لا تكمل Phase 5 قبل توفّره.

**(ج) الـ File Router** — `app/api/uploadthing/core.ts`. عرّف ثلاثة مسارات رفع (router endpoints) حسب الحاجة. كل مسار يستخدم `requireAdmin`/`getCurrentStudent` في الـ middleware للحماية:
```ts
import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { UploadThingError } from 'uploadthing/server'
import { createClient } from '@/lib/supabase/server'

const f = createUploadthing()

export const ourFileRouter = {
  // إيصالات الدفع — يرفعها الطالب المسجّل (Phase 5/10)
  receiptUploader: f({ image: { maxFileSize: '8MB' }, pdf: { maxFileSize: '8MB' } })
    .middleware(async () => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new UploadThingError('غير مصرّح')
      return { userId: user.id }
    })
    .onUploadComplete(async ({ file }) => ({ url: file.ufsUrl })),

  // مرفقات الواجبات — يرفعها الطالب المسجّل (Phase 8)
  assignmentUploader: f({ image: { maxFileSize: '16MB' }, pdf: { maxFileSize: '16MB' }, blob: { maxFileSize: '16MB' } })
    .middleware(async () => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new UploadThingError('غير مصرّح')
      return { userId: user.id }
    })
    .onUploadComplete(async ({ file }) => ({ url: file.ufsUrl })),

  // صور (كورسات/تصنيفات/بروفايل) — أدمن فقط (اختياري)
  imageUploader: f({ image: { maxFileSize: '4MB' } })
    .middleware(async () => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new UploadThingError('غير مصرّح')
      return { userId: user.id }
    })
    .onUploadComplete(async ({ file }) => ({ url: file.ufsUrl })),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
```
> **ملاحظة حرجة:** استخدم `file.ufsUrl` (الإصدار الحديث)، **وليس** `file.url` المهجور.

**(د) Route Handler** — `app/api/uploadthing/route.ts`:
```ts
import { createRouteHandler } from 'uploadthing/next'
import { ourFileRouter } from './core'

export const { GET, POST } = createRouteHandler({ router: ourFileRouter })
```

**(هـ) مكوّنات العميل** — `lib/uploadthing.ts`:
```ts
import { generateUploadButton, generateUploadDropzone } from '@uploadthing/react'
import type { OurFileRouter } from '@/app/api/uploadthing/core'

export const UploadButton = generateUploadButton<OurFileRouter>()
export const UploadDropzone = generateUploadDropzone<OurFileRouter>()
```
الاستخدام في أي مكوّن client:
```tsx
<UploadDropzone
  endpoint="receiptUploader"
  onClientUploadComplete={(res) => {
    const url = res?.[0]?.serverData?.url // الرابط النصّي الكامل
    // مرّر url لـ Server Action لتخزينه في العمود النصّي
  }}
  onUploadError={() => toast.error('فشل رفع الملف')}
/>
```

**(و) استثناء مسار الرفع من حارس المصادقة (حرج جدًا):** الـ proxy في `lib/supabase/proxy.ts` يعيد توجيه غير المسجّلين إلى `/auth`. مسار `/api/uploadthing` يجب أن يبقى **مسموحًا** (لأن UploadThing يستدعيه كـ webhook من سيرفره). تأكّد أن منطق إعادة التوجيه في `proxy.ts` **يستثني** أي مسار يبدأ بـ `/api`. إن لم يكن مستثنى، أضف الشرط: لا تُعِد التوجيه إذا `request.nextUrl.pathname.startsWith('/api')`. (الـ `middleware.ts` matcher يستثني الملفات الساكنة بالفعل، لكن تحقّق من منطق `proxy.ts` نفسه.)

**(ز) التحقق:** بعد الإعداد، يجب أن يفتح `GET /api/uploadthing` بدون خطأ، وأن يعمل مكوّن `UploadDropzone` في المتصفح ويعيد رابط `ufsUrl` صالحًا.

### 0.6 كيف تشغّل migration وتتحقق
- استخدم **Supabase MCP**: أداة `apply_migration` للـ DDL، و`execute_sql` للـ seed والتحقق، و`list_tables` للمعاينة.
- طبّق الـ schema **قبل** كتابة الكود الذي يعتمد عليه.
- للتحقق البصري: شغّل `agent-browser` على المسار المعني وسجّل دخول بحساب الأدمن.

---

## ترتيب الـ Phases (حسب التبعية والمخاطرة)

| Phase | الموضوع | يعتمد على |
|------|---------|-----------|
| 1 | Categories (تصنيفات) | — |
| 2 | Coupons (كوبونات) | — |
| 3 | Calendar (تقويم) | — |
| 4 | Notifications (إشعارات) | — |
| 5 | Payments + UploadThing (مدفوعات) | UploadThing (خطوة 0.5) |
| 6 | Course Content & Enrollments (محتوى الكورسات والتسجيلات) | courses |
| 7 | Exams & Exam Builder (اختبارات) | courses |
| 8 | Assignments, Submissions & Grades (واجبات ودرجات) | 6 |
| 9 | Messages (رسائل) | — |
| 10 | Student Portal Wiring (ربط بوابة الطالب) | 6,7,8,9 |
| 11 | Admin Dashboard & Reports (لوحة ولوحات تحليلية) | الكل |

ابدأ بالـ Phases المستقلة منخفضة المخاطر (1-4) لإتقان النمط، ثم تدرّج.

---

## Phase 1 — Categories (التصنيفات)

**الهدف:** ربط صفحة `/categories` (CRUD كامل: إضافة/تعديل/حذف) بـ DB.

**الملفات المرجعية (اقرأها أولًا):** `lib/categories-data.ts`، `components/categories/categories-context.tsx`، `components/categories/category-form-modal.tsx`، `app/categories/page.tsx`.

### 1.1 Schema (apply_migration باسم `create_categories`)
```sql
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text not null default '',
  courses integer not null default 0,
  students integer not null default 0,
  icon text not null default 'Layers',          -- اسم أيقونة Lucide (نص)
  color text not null default 'text-primary',    -- class حرفي
  bg text not null default 'bg-primary/10',       -- class حرفي
  status text not null default 'مفعّل' check (status in ('مفعّل','متوقف')),
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create policy "categories_admin_all" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());
create policy "categories_select_authenticated" on public.categories
  for select using (auth.role() = 'authenticated');
```

### 1.2 Seed (execute_sql) — انسخ الـ 6 تصنيفات من `lib/categories-data.ts` حرفيًا
> `icon` يُخزَّن كاسم نصّي: `Code2`, `Palette`, `Megaphone`, `Languages`, `BarChart3`, `Briefcase`. `color`/`bg` كما هي. الأكواد `CAT-01`..`CAT-06`.

### 1.3 الكود
- **أنشئ `app/categories/actions.ts`** بـ `'use server'`، يستورد `requireAdmin` من `@/lib/auth-guard`، ويصدّر:
  - `getCategories(): Promise<CategoryRecord[]>` — يقرأ كل الصفوف مرتبة بـ `code`، ويحوّل كل صف عبر `iconFromName(row.icon)` إلى `CategoryRecord`.
  - `createCategory(values: {name; description; status})` — يولّد `code` بالنمط `CAT-XX` (أكبر رقم +1, padded)، يحدد `icon='Layers', color='text-primary', bg='bg-primary/10'` (مطابقة لسلوك الـ mock الحالي عند الإنشاء).
  - `updateCategory(id, values)` و`deleteCategory(id)`.
  - كلها تنادي `requireAdmin` ثم `revalidatePath('/categories')`.
- **عدّل `app/categories/page.tsx`:** اجعلها `async`، نادِ `getCategories()`، ومرّر `initialCategories` للـ `CategoriesProvider`.
- **عدّل `components/categories/categories-context.tsx`:**
  - أضف prop `initialCategories` واستخدمها في `useState` بدل `categoryRecords` (احذف استيراد `categoryRecords`).
  - أضف `useRouter`.
  - في `submitForm`: لو `editing` نادِ `updateCategory(editing.id, values)`، وإلا `createCategory(values)`؛ ثم `toast` (نفس النصوص) و`router.refresh()`. عالِج `result.error` بـ `toast.error`.
  - في `confirmDelete`: حذف تفاؤلي ثم `deleteCategory`، ثم `refresh`.

### 1.4 Verification Checklist
- [ ] الجدول ظهر في `list_tables` مع 6 صفوف.
- [ ] `/categories` تعرض التصنيفات من DB بأيقوناتها وألوانها الصحيحة.
- [ ] إضافة تصنيف جديد → يظهر فورًا ويُحفظ (تحقّق بـ `execute_sql`).
- [ ] تعديل تصنيف → يتحدّث.
- [ ] حذف تصنيف → يختفي ويُحذف من DB.
- [ ] لا أخطاء TypeScript جديدة في الملفات المعدّلة.

---

## Phase 2 — Coupons (الكوبونات)

**الهدف:** ربط `/coupons` (CRUD كامل) بـ DB.

**مرجع:** `lib/coupons-data.ts`، `components/coupons/coupons-context.tsx`، `components/coupons/coupon-form-modal.tsx`، `app/coupons/page.tsx`.

### 2.1 Schema (`create_coupons`)
```sql
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 -- كود الكوبون نفسه (مثل WELCOME25) — فريد
  display_code text unique not null,         -- معرّف العرض CPN-01
  description text not null default '',
  type text not null check (type in ('نسبة مئوية','مبلغ ثابت')),
  value numeric not null default 0,
  used integer not null default 0,
  "limit" integer not null default 0,
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('نشط','منتهي','متوقف')),
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;
create policy "coupons_admin_all" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());
```
> **انتبه:** الـ type `CouponRecord` فيه `code` = كود الكوبون (WELCOME25) و`id` = CPN-01. هنا فصلنا: عمود `code` = كود الكوبون، وعمود `display_code` = CPN-01. عند التحويل لـ `CouponRecord`: `{ id: row.display_code, code: row.code, ... }`. **هذه نقطة خطأ شائعة — التزم بها.**
> `limit` كلمة محجوزة في SQL لذلك بين `"..."`.

### 2.2 Seed — الـ 6 كوبونات من الملف، `start_date`/`end_date` بصيغة `yyyy-mm-dd` كما هي.

### 2.3 الكود (نفس نمط Phase 1)
- `app/coupons/actions.ts`: `getCoupons`, `createCoupon`, `updateCoupon`, `deleteCoupon`.
  - عند الإنشاء: ولّد `display_code` بنمط `CPN-XX`. `used=0`.
  - حوّل الصفوف لـ `CouponRecord` بالماب الموضّح أعلاه (`id ← display_code`).
- `app/coupons/page.tsx`: async + `getCoupons()` + تمرير `initialCoupons`.
- `components/coupons/coupons-context.tsx`: prop `initialCoupons`, `useRouter`, ربط `submitForm`/`confirmDelete` بالـ actions (نفس نصوص التوست).

### 2.4 Verification
- [ ] 6 كوبونات تظهر، الكود (WELCOME25) ومعرّف CPN-01 صحيحان.
- [ ] إضافة/تعديل/حذف تعمل وتنعكس ف�� DB.
- [ ] فلترة الحالة (نشط/منتهي/متوقف) ما زالت تعمل.

---

## Phase 3 — Calendar (التقويم)

**الهدف:** ربط `/calendar` (CRUD أحداث) بـ DB.

**مرجع:** `lib/calendar-data.ts`، `components/calendar/calendar-context.tsx`، `components/calendar/event-form-modal.tsx`، `app/calendar/page.tsx`.

### 3.1 Schema (`create_calendar_events`)
```sql
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 -- EVT-01
  title text not null,
  event_date date not null,
  event_time text not null,                  -- HH:mm
  type text not null check (type in ('محاضرة','اختبار','موعد تسليم','اجتماع','حدث مخصص')),
  course text,
  description text,
  custom boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.calendar_events enable row level security;
create policy "calendar_admin_all" on public.calendar_events
  for all using (public.is_admin()) with check (public.is_admin());
create policy "calendar_select_authenticated" on public.calendar_events
  for select using (auth.role() = 'authenticated');
```

### 3.2 Seed — حوّل أحداث `initialEvents`. بما أنها نسبية، احسب `event_date` نسبةً لتاريخ اليوم وقت الـ seed (مثلاً `current_date + interval '1 day'`). استخدم نفس الـ offsets: 0,0,1,2,3,4,5,7,-2,9.

### 3.3 الكود
- `app/calendar/actions.ts`: `getEvents(): Promise<CalendarEvent[]>` (ماب: `date ← event_date` بصيغة `yyyy-mm-dd`، `time ← event_time`)، `createEvent`, `updateEvent`, `deleteEvent`.
  - الإنشاء: `code` بنمط `EVT-XX`، `custom=true`.
- `app/calendar/page.tsx`: async + تمرير `initialEvents`.
- `components/calendar/calendar-context.tsx`: prop `initialEvents` (بدل استيراد `initialEvents` من الملف)، `useRouter`، ربط `submitForm`/`confirmDelete`. **انتبه:** هذا الـ context فيه حالة شهر/تنقّل — لا تلمسها، فقط استبدل مصدر `events` ونداءات الكتابة.

### 3.4 Verification
- [ ] الأحداث تظهر في الشهر الحالي بألوانها حسب النوع.
- [ ] إضافة حدث على يوم محدد، تعديله، حذفه — كلها تعمل وتنعكس في DB.
- [ ] التنقّل بين الشهور سليم.

---

## Phase 4 — Notifications (الإشعارات)

**الهدف:** ربط `/notifications` بـ DB (عرض + تعليم كمقروء + فلترة).

**مرجع:** `lib/notifications-data.ts`، `app/notifications/page.tsx` وأي context/كومبوننت إشعارات.

### 4.1 Schema (`create_notifications`)
```sql
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 -- NOTI-2051
  type text not null check (type in ('طالب','دفع','اختبار','كورس','رسالة','نظام')),
  title text not null,
  description text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "notifications_admin_all" on public.notifications
  for all using (public.is_admin()) with check (public.is_admin());
```
> **ملاحظة:** هذه إشعارات على مستوى الأدمن (عامّة). إشعارات الطالب الشخصية تُعالَج في Phase 10. الحقل `time` في الـ type نصّي ("منذ 5 دقائق") — اشتقّه من `created_at` عبر helper بسيط `timeAgoArabic(created_at)` أو احتفظ به نصًا في الـ seed (الأبسط: أضف عمود `time_label text` واملأه بالنص الموجود). **القرار: أضف عمود `time_label text not null default ''` واملأه من الـ mock، وماب `time ← time_label`** لتجنّب تعقيد حساب الوقت العربي الآن.

### 4.2 Seed — الـ 12 إشعار، `read` حسب الملف، `time_label` = نص الوقت.

### 4.3 الكود
- `app/notifications/actions.ts`: `getNotifications`, `markAsRead(id)`, `markAllAsRead()`, (اختياري) `deleteNotification(id)`. كلها admin-gated.
- اربط الصفحة والكومبوننت: عند الضغط على إشعار → `markAsRead`. زر "تعليم الكل كمقروء" → `markAllAsRead`. `router.refresh()` بعدها.

### 4.4 Verification
- [ ] 12 إشعار تظهر، الفلترة بالنوع تعمل.
- [ ] تعليم كمقروء (فردي/الكل) ينعكس في DB.

---

## Phase 5 — Payments + UploadThing (المدفوعات)

**الهدف:** ربط `/payments` (مراجعة الأدمن: قبول/رفض) + تمهيد لتسليم الطالب للإيصال (Phase 10). الإيصالات تُرفع عبر **UploadThing** (لا Supabase Storage).

**شرط مسبق:** يجب إكمال الخطوة التمهيدية **0.5 (إعداد UploadThing)** بالكامل قبل البدء هنا، بما في ذلك توفّر `UPLOADTHING_TOKEN`.

**مرجع:** `lib/payments-data.ts`، `app/payments/page.tsx`، كومبوننتات المدفوعات.

### 5.1 التخزين — UploadThing (لا تنشئ أي bucket)
- **ممنوع** إنشاء `storage.buckets` أو سياسات `storage.objects` في Supabase.
- الإيصال يُرفع من العميل عبر مكوّن `UploadDropzone` بـ `endpoint="receiptUploader"` (مُعرّف في 0.5)، فيعيد **رابط `ufsUrl` نصّي كامل**.
- هذا الرابط يُمرَّر لـ Server Action ويُخزَّن مباشرةً في عمود `receipt_url text`. لا توقيع روابط، ولا مسارات — رابط عام كامل يُخزَّن كنص.
- ملاحظة خصوصية: روابط UploadThing عامة لكن غير قابلة للتخمين (random key)؛ هذا مقبول للإيصالات في هذا المشروع.

### 5.2 Schema (`create_payments`)
```sql
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 -- PAY-1001
  student_id uuid references public.students(id) on delete set null,
  student_name text not null,
  student_email text,
  student_phone text,
  course text,
  amount numeric not null default 0,
  method text not null check (method in ('انستاباي','فودافون كاش')),
  receipt_url text,                           -- رابط UploadThing الكامل (ufsUrl)
  reference text,
  status text not null default 'قيد المراجعة' check (status in ('قيد المراجعة','مقبول','مرفوض')),
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;
create policy "payments_admin_all" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());
create policy "payments_select_own" on public.payments
  for select using (
    student_id in (select id from public.students where user_id = auth.uid())
  );
create policy "payments_insert_own" on public.payments
  for insert with check (
    student_id in (select id from public.students where user_id = auth.uid())
  );
```

### 5.3 Seed — الـ 8 مدفوعات. `receipt_url` اتركها null أو ضع رابطًا وهميًا. `submittedAt` نصّي → نفس حل Phase 4: أضف `submitted_label text` وماب `submittedAt ← submitted_label`.

### 5.4 الكود
- `app/payments/actions.ts`: `getPayments`, `approvePayment(id)`, `rejectPayment(id)`. عند `getPayments` ماب `receiptUrl ← row.receipt_url` مباشرةً (لا توليد روابط موقّتة — الرابط مخزَّن كامل بالفعل).
- اربط أزرار القبول/الرفض في كومبوننت المدفوعات بالـ actions + `router.refresh()`.
- دالة `getPaymentStats` الموجودة في الـ lib تعمل على المصفوفة — مرّر لها الصفوف المحوّلة.
- (رفع الطالب لإيصال جديد عبر `UploadDropzone` ثم action `submitPayment` يتم في Phase 10.)

### 5.5 Verification
- [ ] لا يوجد أي bucket في Supabase Storage (التخزين على UploadThing فقط).
- [ ] جدول `payments` يحتوي عمود `receipt_url text`.
- [ ] المدفوعات تظهر بإحصاءاتها (قيد المراجعة/مقبول/مرفوض/الإيرادات).
- [ ] قبول/رفض دفعة يغيّر حالتها في DB.
- [ ] عند فتح إيصال له `receipt_url`، يُعرض الرابط/الصورة بشكل صحيح.

---

## Phase 6 — Course Content & Enrollments (محتوى الكورسات والتسجيلات)

**الهدف:** بناء الأساس الحقيقي لمحتوى الكورس (أقسام/دروس) والتسجيلات (طالب↔كورس مع تقدّم). هذا أساس بوابة الطالب.

**مرجع:** `lib/student-courses-data.ts`, `lib/student-data.ts` (`enrolledCourses`, `CourseProgress`)، صفحات `app/student/courses/**` و`app/courses/[id]`.

### 6.1 Schema (`create_course_content`)
```sql
create table if not exists public.course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.course_sections(id) on delete cascade,
  title text not null,
  type text not null check (type in ('فيديو','مقال','تمرين')),
  duration text not null default '',
  video_url text,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (student_id, course_id)
);

-- تتبّع إكمال كل درس لكل طالب
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (enrollment_id, lesson_id)
);

alter table public.course_sections enable row level security;
alter table public.course_lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;

-- المحتوى مقروء لأي مستخدم مسجّل؛ الأدمن يدير
create policy "sections_select_auth" on public.course_sections for select using (auth.role()='authenticated');
create policy "sections_admin_all" on public.course_sections for all using (public.is_admin()) with check (public.is_admin());
create policy "lessons_select_auth" on public.course_lessons for select using (auth.role()='authenticated');
create policy "lessons_admin_all" on public.course_lessons for all using (public.is_admin()) with check (public.is_admin());

-- التسجيلات: الطالب يرى/يُنشئ تسجيلاته؛ الأدمن يدير الكل
create policy "enroll_admin_all" on public.enrollments for all using (public.is_admin()) with check (public.is_admin());
create policy "enroll_select_own" on public.enrollments for select using (
  student_id in (select id from public.students where user_id = auth.uid()));
create policy "enroll_insert_own" on public.enrollments for insert with check (
  student_id in (select id from public.students where user_id = auth.uid()));

create policy "progress_admin_all" on public.lesson_progress for all using (public.is_admin()) with check (public.is_admin());
create policy "progress_own" on public.lesson_progress for all using (
  enrollment_id in (select e.id from public.enrollments e
    join public.students s on s.id = e.student_id where s.user_id = auth.uid()))
  with check (
  enrollment_id in (select e.id from public.enrollments e
    join public.students s on s.id = e.student_id where s.user_id = auth.uid()));
```

### 6.2 Seed
- لكل كورس من الـ 8 الموجودة، أنشئ 4 أقسام (`buildSections` titles: `مقدمة وتأسيس`, `المفاهيم الأساسية`, `تطبيقات عملية`, `مشروع التخرج`) ووزّع دروسًا عليها بعدد `lessons` لكل كورس.
- سجّل حساب الطالب التجريبي (`student@platform.com`) في 3-4 كورسات مع تقدّم متفاوت في `lesson_progress`.

### 6.3 الكود
- `lib/student-courses-data.ts`: حوّل دوال الـ helper لتقرأ من DB **بنفس التواقيع** (`getCourseDetail`, `getCourseLessons`, `getLesson`, `getCourseItems`, `isAssignmentUnlocked`). الأفضل: أنشئ `app/student/courses/actions.ts` بدوال async (`getEnrolledCourses(studentId)`, `getCourseDetailFromDb(courseId, studentId)`) وادعُها من Server Components، واحتفظ بالدوال النقية للحسابات على البيانات المُحمّلة.
- صفحات الطالب تستخدم `getCurrentStudent` (من `lib/auth-guard.ts`) لتحديد التسجيلات.

### 6.4 Verification
- [ ] لكل كورس أقسام ودروس في DB.
- [ ] الطالب التجريبي مسجّل في كورسات مع تقدّم.
- [ ] صفحة كورسات الطالب تعرض التقدّم الحقيقي.
- [ ] تعليم درس كمكتمل يحدّث `lesson_progress` ونسبة التقدّم.

---

## Phase 7 — Exams & Exam Builder (الاختبارات)

**الهدف:** ربط `/exams` (قائمة) و`/exams/create` (الباني) بـ DB.

**مرجع:** `lib/exams-data.ts`, `lib/exam-builder.ts`, `components/exams/builder/exam-builder.tsx`، `app/exams/page.tsx`، `app/exams/create/page.tsx`.

### 7.1 Schema (`create_exams`)
```sql
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 -- EXM-2051
  title text not null,
  course text,
  duration integer not null default 0,
  pass_mark integer not null default 50,
  shuffle boolean not null default false,
  description text,
  status text not null default 'مسودة' check (status in ('منشور','مسودة','منتهي')),
  participants integer not null default 0,
  avg_score integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  type text not null check (type in ('mcq','essay','file')),
  text text not null default '',
  points integer not null default 1,
  position integer not null default 0,
  -- mcq
  correct_option_index integer,
  multiple_answers boolean not null default false,
  -- essay
  model_answer text,
  word_limit integer,
  -- file
  allowed_types text[] default array['image'],
  max_file_size_mb integer default 10,
  required boolean not null default true
);
create table if not exists public.exam_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.exam_questions(id) on delete cascade,
  text text not null default '',
  position integer not null default 0
);
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_options enable row level security;
create policy "exams_admin_all" on public.exams for all using (public.is_admin()) with check (public.is_admin());
create policy "exams_select_auth" on public.exams for select using (auth.role()='authenticated');
create policy "eq_admin_all" on public.exam_questions for all using (public.is_admin()) with check (public.is_admin());
create policy "eq_select_auth" on public.exam_questions for select using (auth.role()='authenticated');
create policy "eo_admin_all" on public.exam_options for all using (public.is_admin()) with check (public.is_admin());
create policy "eo_select_auth" on public.exam_options for select using (auth.role()='authenticated');
```
> **ملاحظة تصميم:** `correctOptionId` في الـ type يشير لخيار. في DB نستخدم `correct_option_index` (ترتيب الخيار) لتجنّب مشاكل الـ FK وقت الإدراج. عند القراءة حوّله لـ id الخيار الفعلي.

### 7.2 Seed — الـ 9 اختبارات من `examRecords` في جدول `exams` (بدون أسئلة، فهي قائمة عرض). `participants`/`avg_score` كما هي.

### 7.3 الكود
- `app/exams/actions.ts`: `getExams(): Promise<ExamRecord[]>` (ماب: `questions ← count(exam_questions)` أو عمود محسوب؛ للقائمة الحالية الأبسط إضافة عمود `questions integer` وملؤه). **القرار: أضف عمود `questions integer not null default 0` في `exams`** وحدّثه عند الحفظ من الباني.
- `app/exams/create/actions.ts`: `createExam(meta: ExamMeta, questions: Question[], publish: boolean)`:
  - `requireAdmin`، ولّد `code` `EXM-XXXX`.
  - أدرج صف `exams` (status = publish ? 'منشور' : 'مسودة', questions = questions.length).
  - أدرج `exam_questions` بالترتيب، ولكل mcq أدرج `exam_options` واحسب `correct_option_index` من `correctOptionId`.
  - `revalidatePath('/exams')` ثم رجّع `{ success, code }`.
- عدّل `components/exams/builder/exam-builder.tsx`: في `handleSave(publish)` بعد `validate()` نادِ `createExam(meta, questions, publish)` (بدل التوست الوهمي)، وبعد النجاح `router.push('/exams')`.
- `app/exams/page.tsx`: async + `getExams()`.

### 7.4 Verification
- [ ] قائمة الاختبارات تظهر من DB.
- [ ] إنشاء اختبار من الباني (نشر/مسودة) يحفظ الاختبار + الأسئلة + الخيارات في DB، ويوجّه لـ `/exams` ويظهر فيها.
- [ ] إجابة mcq الصحيحة محفوظة بشكل صحيح (تحقّق بـ `execute_sql`).

---

## Phase 8 — Assignments, Submissions & Grades (الواجبات والتسليمات والدرجات)

**الهدف:** ربط واجبات/اختبارات الوحدات وتسليمات الطلاب ودرجاتهم.

**مرجع:** `lib/student-courses-data.ts` (`Assignment`, `QuizQuestion`, `assignments`)، `lib/student-data.ts` (`recentGrades`)، صفحات `app/student/assignments/**`.

### 8.1 Schema (`create_assignments`)
```sql
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 -- as1
  course_id uuid references public.courses(id) on delete cascade,
  section_id uuid references public.course_sections(id) on delete set null,
  type text not null check (type in ('تسليم','اختبار')),
  title text not null,
  description text not null default '',
  instructions text[] default '{}',
  due_date text,
  points integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.assignment_questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  question text not null,
  options text[] not null default '{}',
  correct_index integer not null default 0,
  position integer not null default 0
);
create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'لم يبدأ' check (status in ('لم يبدأ','قيد التنفيذ','تم التسليم','مصحّح')),
  score integer,
  attachment_url text,                        -- رابط UploadThing لمرفق التسليم (نوع 'تسليم')
  submitted_at timestamptz,
  unique (assignment_id, student_id)
);
alter table public.assignments enable row level security;
alter table public.assignment_questions enable row level security;
alter table public.assignment_submissions enable row level security;
create policy "asg_select_auth" on public.assignments for select using (auth.role()='authenticated');
create policy "asg_admin_all" on public.assignments for all using (public.is_admin()) with check (public.is_admin());
create policy "asgq_select_auth" on public.assignment_questions for select using (auth.role()='authenticated');
create policy "asgq_admin_all" on public.assignment_questions for all using (public.is_admin()) with check (public.is_admin());
create policy "sub_admin_all" on public.assignment_submissions for all using (public.is_admin()) with check (public.is_admin());
create policy "sub_own" on public.assignment_submissions for all using (
  student_id in (select id from public.students where user_id = auth.uid()))
  with check (
  student_id in (select id from public.students where user_id = auth.uid()));
```

### 8.2 Seed — الواجبات الـ 6 من `assignments` + أسئلة الاختبار في `as1`. اربط `course_id`/`section_id` بالكورسات/الأقسام المنشأة في Phase 6 (طابِق عبر mapping منطقي بما أن mock تستخدم c1..c4). للطالب التجريبي أنشئ submissions بالحالات/الدرجات الموجودة.

### 8.3 الكود
- `app/student/assignments/actions.ts`: `getAssignments(studentId)`, `getAssignmentDetail(code, studentId)`, `submitAssignment(assignmentId, studentId, attachmentUrl?)` (للتسليم — يخزّن `attachment_url`), `submitQuiz(assignmentId, studentId, answers)` (يصحّح mcq ويحسب score ويضبط status='مصحّح').
- لواجبات نوع 'تسليم': استخدم مكوّن `UploadDropzone` بـ `endpoint="assignmentUploader"` (من خطوة 0.5) لرفع المرفق، فيعيد رابط `ufsUrl`، ثم مرّره لـ `submitAssignment`. **لا Supabase Storage.**
- اربط صفحات الواجبات وحالاتها. الدرجات (`recentGrades`) تُشتق من submissions المصحّحة.

### 8.4 Verification
- [ ] واجبات الطالب تظهر بحالاتها الصحيحة.
- [ ] تسليم واجب يغيّر الحالة في DB.
- [ ] رفع مرفق لواجب نوع 'تسليم' يخزّن `attachment_url` (رابط UploadThing) ويظهر للأدمن عند التصحيح.
- [ ] حل اختبار mcq يحسب الدرجة ويخزّنها.
- [ ] الدرجات الأخيرة تظهر من submissions.

---

## Phase 9 — Messages (الرسائل)

**الهدف:** ربط `/messages` (أدمن) و`/student/messages` بمحادثات حقيقية.

**مرجع:** `lib/messages-data.ts` (`Conversation`, `ChatMessage`)، صفحات الرسائل.

### 9.1 Schema (`create_messages`)
```sql
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 -- c1
  student_id uuid references public.students(id) on delete set null,
  student_name text not null,
  course text,
  online boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender text not null check (sender in ('admin','student')),
  text text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
create policy "conv_admin_all" on public.conversations for all using (public.is_admin()) with check (public.is_admin());
create policy "conv_own" on public.conversations for select using (
  student_id in (select id from public.students where user_id = auth.uid()));
create policy "msg_admin_all" on public.messages for all using (public.is_admin()) with check (public.is_admin());
create policy "msg_own" on public.messages for all using (
  conversation_id in (select c.id from public.conversations c join public.students s on s.id=c.student_id where s.user_id=auth.uid()))
  with check (
  conversation_id in (select c.id from public.conversations c join public.students s on s.id=c.student_id where s.user_id=auth.uid()));
```
> **ملاحظة:** `fromMe` في الـ type يعتمد على من يقرأ. خزّن `sender` كـ `admin`/`student` واحسب `fromMe` وقت العرض حسب دور المستخدم الحالي.

### 9.2 Seed — حوّل المحادثات الـ 6 ورسائلها (`fromMe:true` → sender='admin').

### 9.3 الكود
- `app/messages/actions.ts`: `getConversations`, `getMessages(conversationId)`, `sendMessage(conversationId, text)` (يحدد `sender` حسب الدور). `router.refresh()` بعد الإرسال.
- (اختياري لاحقًا) Supabase Realtime للرسائل الحيّة — **ليس مطلوبًا الآن**، استخدم refresh.

### 9.4 Verification
- [ ] المحادثات والرسائل تظهر.
- [ ] إرسال رسالة يخزّنها ويظهرها.
- [ ] `fromMe` صحيح حسب الدور.

---

## Phase 10 — Student Portal Wiring (ربط بوابة الطالب بالكامل)

**الهدف:** استبدال كل بيانات الطالب الوهمية بالمستخدم المسجّل فعليًا.

**مرجع:** `lib/student-data.ts` (`studentProfile`, `enrolledCourses`, `upcomingSchedule`, `recentGrades`, `certificates`, `announcements`), `lib/student-billing-data.ts`, `lib/student-schedule-data.ts`, `lib/student-profile-data.ts`, `lib/student-exams-data.ts`, `lib/student-notifications-data.ts`, `lib/student-messages-data.ts`، وكل صفحات `app/student/**`.

### 10.1 الفكرة المحورية
- المستخدم المسجّل → `getCurrentStudent()` (من `lib/auth-guard.ts`) → صف `students` المرتبط بـ `user_id`.
- كل بيانات الطالب تُشتق من علاقاته: enrollments (Phase 6)، submissions/grades (Phase 8)، calendar/schedule (Phase 3 + enrollments)، payments/billing (Phase 5)، notifications، messages (Phase 9).

### 10.2 جداول إضافية محتملة
- **certificates:**
  ```sql
  create table if not exists public.certificates (
    id uuid primary key default gen_random_uuid(),
    student_id uuid references public.students(id) on delete cascade,
    title text not null, issuer text not null default 'منصة تعليمية',
    issued_at date not null default current_date,
    created_at timestamptz not null default now());
  alter table public.certificates enable row level security;
  create policy "cert_own" on public.certificates for select using (
    student_id in (select id from public.students where user_id=auth.uid()));
  create policy "cert_admin_all" on public.certificates for all using (public.is_admin()) with check (public.is_admin());
  ```
- **student notifications:** أعِد استخدام `notifications` لكن أضف عمود `student_id uuid` (null = عام لكل الأدمن، أو موجّه لطالب). عدّل سياسات Phase 4 لتسمح للطالب بقراءة إشعاراته.

### 10.3 الكود (صفحة بصفحة)
- `app/student/page.tsx` (الرئيسية): اشتق الكورسات/الجدول/الدرجات/الإعلانات للطالب الحالي.
- `app/student/courses/**`: من enrollments + course content (Phase 6).
- `app/student/exams/**`: اختبارات الكورسات المسجّل فيها (Phase 7) + نتائجه.
- `app/student/assignments/**`: من Phase 8.
- `app/student/schedule`: من `calendar_events` المرتبطة بكورساته.
- `app/student/billing`: من `payments` الخاصة به + رفع إيصال جديد عبر مكوّن `UploadDropzone` (`endpoint="receiptUploader"`، من خطوة 0.5) الذي يعيد رابط `ufsUrl`، ثم تمرير الرابط لـ action `submitPayment` (insert في payments بحالة 'قيد المراجعة' مع `receipt_url` = الرابط).
- `app/student/notifications`, `app/student/messages`, `app/student/settings`, `app/student/profile`: اربطها بالمستخدم الحالي.
- استبدل `studentProfile` الثابت بـ بيانات `getCurrentStudent()`.

### 10.4 Verification
- [ ] تسجيل الدخول بحساب الطالب التجريبي يعرض بياناته الحقيقية في كل صفحات `/student`.
- [ ] رفع إيصال دفع جديد ينشئ صف payment ويظهر للأدمن في `/payments`.
- [ ] لا تسريب بيانات بين الطلاب (اختبر بحساب طالب ثانٍ).

---

## Phase 11 — Admin Dashboard & Reports (اللوحة واللوحات التحليلية)

**الهدف:** استبدال أرقام الـ dashboard والتقارير الوهمية بإحصاءات حقيقية.

**مرجع:** `lib/dashboard-data.ts`, `lib/reports-data.ts`، `app/dashboard/page.tsx`, `app/reports/page.tsx`.

### 11.1 الفكرة
- أنشئ `app/dashboard/actions.ts` و`app/reports/actions.ts` بدوال async تجمّع الأرقام عبر استعلامات (counts/sums/group by) على الجداول الحقيقية:
  - إجمالي الطلاب، إجمالي الكورسات، الإيرادات (sum من payments المقبولة)، نمو الطلاب الشهري، أكثر الكورسات تسجيلًا، أحدث الطلاب/الكورسات/المدفوعات.
- للرسوم (charts) الشهرية: استخدم `group by date_trunc('month', created_at)`. إن لم تتوفر بيانات تاريخية كافية، أبقِ الشكل لكن من بيانات حقيقية متاحة.
- يمكن إنشاء **Postgres views** للتجميعات المعقّدة، أو دوال SQL.

### 11.2 الكود
- صفحات `dashboard`/`reports` تصبح async وتجيب الأرقام من actions.
- حافظ على نفس أشكال البيانات التي تتوقعها كومبوننتات الرسوم (`revenueData`, `studentsData`, `activityData`, `topCourses`, ...).

### 11.3 Verification
- [ ] أرقام اللوحة تطابق محتوى DB الفعلي.
- [ ] الرسوم تُرسم بدون أخطاء.
- [ ] التقارير تعكس بيانات حقيقية.

---

## ملاحظات ختامية للمنفّذ

1. **لا تقفز بين الـ Phases.** أكمل قائمة التحقق قبل التالية.
2. **اختبر كل Phase في المتصفح** بحساب الأدمن (وحساب الطالب في 6-10) عبر `agent-browser`.
3. **خطأ TypeScript قديم معروف** في `components/courses/courses-grid.tsx` (استخدام `asChild` على `Button`) — **ليس من مهامك** ولا يؤثر على التشغيل. لا تصلحه إلا لو طُلب صراحةً.
4. عند أي تعارض بين هذا الملف وملفات الكود الفعلية، **الكود الفعلي هو المرجع** — اقرأه أولًا وحدّث فهمك.
5. حافظ على RTL والنصوص العربية في كل مكان.
6. بعد كل Phase: commit برسالة واضحة (مثل `feat(categories): wire to supabase`).
