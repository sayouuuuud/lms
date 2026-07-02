# خطة تكامل بوابة الطالب مع الباك إند الحقيقي

> مبنية على `student-account-audit.md` + فحص مباشر للسكيمة الحية في Supabase بتاريخ 2026-07-02.
> **تصحيحات على الـ audit بعد فحص السكيمة الحية:** `assignments.due_date` موجود فعلًا (نوعه `text`)، جدول `notifications` موجود بكامل آلية الاستهداف (`student_id`, `stage_id`, `branch_id`, `lecture_id`) مع جدول `notification_reads`، و`profiles.avatar_url` موجود. الناقص فعليًا: جدول `announcements`، عمود `lessons.content_type`، عمود `lectures.instructor`، وجدول نشاط التعلّم.

---

## 1. تدفق البيانات: الأدمن ← قاعدة البيانات ← الطالب

المبدأ الحاكم: **قاعدة البيانات هي مصدر الحقيقة الوحيد**. الأدمن يكتب عبر Server Actions في `app/admin/**/actions.ts`، والطالب يقرأ عبر Server Actions في `app/student/**/actions.ts`. لا توجد أي قناة مباشرة بين اللوحتين.

| النطاق | الأدمن يكتب في | الطالب يقرأ من | آلية الانعكاس |
|---|---|---|---|
| الكورسات/المحاضرات | `lectures`, `lessons`, `branches`, `stages` | نفس الجداول عبر `getPurchasedCourses()` مقيّدة بـ`orders.status='approved'` | `revalidatePath('/student')` في أكشن الأدمن + قراءة server-side عند كل زيارة |
| الواجبات | `assignments`, `assignment_questions` | نفس الجداول مع `student_content_progress` للحالة | نفس الآلية |
| الامتحانات | `exams`, `exam_questions` (بـ`branch_id`) | `getStudentExam(code)` + قائمة جديدة `getStudentExams()` مفلترة بـ`students.stage_id` → فروع السنة | الامتحان المنشور (`status='منشور'`) يظهر فورًا لطلاب السنة |
| الإشعارات | `notifications` (استهداف: طالب محدد / سنة / فرع / محاضرة) | استعلام واحد يجمع الاستهدافات + `notification_reads` لحالة القراءة | إدراج صف واحد يظهر لكل المستهدفين |
| الإعلانات | جدول جديد `announcements` (يكتبه الأدمن) | `getStudentAnnouncements()` مفلترة بالسنة | إدراج → ظهور مباشر |
| الفواتير | الأدمن يغيّر `payments.status` / `orders.status` | `getStudentInvoices()` (موجود) | تغيير status → انعكاس فوري + فتح المحتوى عند `approved` |
| الرسائل | الأدمن يرد في `messages.chat_history` | `getStudentConversations()` (موجود) | jsonb append + عدّادات `unread` |
| الجدول | `calendar_events` (بـ`stage_id`/`branch_id`/`lecture_id`) | `getStudentFullSchedule()` (موجود) | إدراج → ظهور لطلاب السنة/الفرع |
| الدرجات | تصحيح الأدمن يحدّث `exam_submissions` + `assignment_submissions` | `getStudentRecentGrades()` + صفحة الدرجات | تحديث الصف → انعكاس فوري |

**قاعدة أمان ثابتة:** كل أكشن طالب يبدأ بـ`auth.getUser()` ثم `students.user_id = user.id`، وكل استعلام يُقيَّد بـ`student_id` الناتج. RLS مفعّل، والأدمن فقط (`profiles.role='admin'`) يكتب في جداول المحتوى.

---

## 2. تعديلات قاعدة البيانات (SQL)

### 2.1 أعمدة ناقصة

```sql
-- نوع الدرس (فيديو/مقال/تمرين) بدل التثبيت اليدوي في mapOneLesson()
alter table public.lessons
  add column if not exists content_type text not null default 'فيديو'
  check (content_type in ('فيديو','مقال','تمرين'));

-- اسم المدرّس على مستوى المحاضرة بدل 'أ. عبد السلام' الثابتة
alter table public.lectures
  add column if not exists instructor text;

-- توحيد نوع due_date (حاليًا text) — تحويل آمن
alter table public.assignments
  alter column due_date type date using nullif(due_date,'')::date;
```

### 2.2 جداول ناقصة

```sql
-- إعلانات المنصة (يكتبها الأدمن، تستهدف سنة أو الكل)
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  course text,                        -- تسمية اختيارية للعرض
  stage_id uuid references public.stages(id) on delete cascade, -- null = للجميع
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- نشاط التعلّم اليومي (مصدر رسم الـ 7 أيام)
create table if not exists public.learning_activity (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  activity_date date not null default current_date,
  minutes integer not null default 0,
  unique (student_id, activity_date)
);
```

### 2.3 فهارس + RLS

```sql
create index if not exists announcements_stage_idx on public.announcements(stage_id);
create index if not exists learning_activity_student_idx on public.learning_activity(student_id, activity_date);

alter table public.announcements enable row level security;
alter table public.learning_activity enable row level security;
-- سياسات: قراءة الإعلانات للمصادَقين (مفلترة بالسنة في الاستعلام)،
-- كتابة الإعلانات للأدمن فقط، وكل طالب يقرأ/يكتب نشاطه فقط.
```

---

## 3. طبقة الأنواع: إلغاء `any` من الـ Context

الخطوة: إنشاء ملف `lib/student-types.ts` كمصدر وحيد للأنواع، يُصدَّر منه كل ما هو موجود حاليًا مبعثرًا في ملفات الـ mock، ثم:

1. نقل الأنواع من `lib/student-data.ts`, `student-courses-data.ts`, `student-exams-data.ts`, `student-billing-data.ts`, `student-messages-data.ts`, `student-notifications-data.ts`, `student-schedule-data.ts` إلى `lib/student-types.ts` (أنواع فقط، بدون بيانات).
2. تحديث `StudentData` في `components/student/student-context.tsx`:

```ts
type StudentData = {
  profile: StudentProfileInfo          // بدل any
  enrolledCourses: CourseProgress[]    // بدل any[]
  schedule: ScheduleItem[]
  grades: GradeItem[]
  announcements: Announcement[]
  activity: ActivityDay[]              // { day: string; hours: number }
  notifications: Notification[]
}
```

3. إبقاء ملفات الـ mock مؤقتًا كـ re-export للأنواع من `student-types.ts` لعدم كسر الاستيرادات، ثم حذفها في المهمة الأخيرة.

---

## 4. الـ Server Actions المطلوبة

### 4.1 جديدة كليًا

| الأكشن | الملف | الاستعلام/الـ Joins |
|---|---|---|
| `getStudentNotifications()` | `app/student/notifications/actions.ts` | `notifications` حيث (`student_id = me` OR `stage_id = my_stage` OR `branch_id in (فروع سنتي)` OR `lecture_id in (محاضراتي المشتراة)`) LEFT JOIN `notification_reads` لحساب `read` per-student، ترتيب تنازلي بـ`created_at` |
| `markNotificationRead(id)` / `markAllNotificationsRead()` | نفس الملف | upsert في `notification_reads (notification_id, student_id)` |
| `getStudentAnnouncements()` | `app/student/actions.ts` | `announcements` حيث `stage_id is null OR stage_id = my_stage`، آخر 5 |
| `getStudentExams()` | `app/student/exams/actions.ts` | `exams` حيث `status='منشور'` و(`branch_id in (فروع سنتي)` أو `branch_id is null`) LEFT JOIN `exam_submissions` (لِـme) لاشتقاق `ExamStatus`: مكتمل (له submission) / متاح / قادم |
| `getStudentLearningActivity()` | `app/student/actions.ts` | `learning_activity` آخر 7 أيام لِـme، مع ملء الأيام الفارغة بصفر |
| `recordLearningActivity(minutes)` | `app/student/progress/actions.ts` | upsert على `(student_id, current_date)` بجمع الدقائق — يُستدعى من `markLessonComplete` داخليًا وليس من الـ UI |
| `getStudentAssignments()` | `app/student/assignments/actions.ts` | `assignments` JOIN `lectures` (المشتراة عبر `orders/order_items` approved) LEFT JOIN `student_content_progress` للحالة والدرجة |
| `updateStudentProfile({name, phone, avatarUrl})` | `app/student/settings/actions.ts` | تحديث `profiles` + `students` معًا للمستخدم الحالي |

### 4.2 تعديل على الموجود

| الأكشن | التعديل |
|---|---|
| `getStudentProfile()` | إضافة join على `stages` لإرجاع `stageTitle` |
| `getPurchasedCourses()` في `student-lectures-data.ts` | (أ) قراءة `lessons.content_type` بدل `'فيديو'` الثابتة، (ب) قراءة `lectures.instructor` مع fallback، (ج) `studentsCount` عبر count على `order_items JOIN orders` حيث `status='approved'` لكل lecture |
| `getStudentUpcomingSchedule()` | لا تغيير جوهري — تأكيد تغطية النوع `'مباشر'` |
| dashboard في `app/student/page.tsx` | حذف كل fallbacks للـ mock: البيانات الفارغة تعرض empty state حقيقي |

### 4.3 أكشنز أدمن مكمّلة (للتدفق ثنائي الاتجاه)

| الأكشن | الغرض |
|---|---|
| `createAnnouncement({title, body, stageId?})` في `app/admin/*/actions.ts` | إدراج في `announcements` + `revalidatePath('/student')` |
| `sendNotification({title, description, target})` | موجود جزئيًا في نظام الإشعارات الحالي — التأكد من دعم الاستهدافات الأربعة |

---

## 5. المهام المصغرة (جاهزة لـ Sonnet)

> كل مهمة معزولة، ملف أو ملفان كحد أقصى، بترتيب تنفيذ إلزامي (كل مهمة تبني على اللي قبلها).

**M1 — Migration (SQL فقط، بدون ملفات كود)**
نفّذ SQL القسم 2 كاملًا: عمودا `lessons.content_type` و`lectures.instructor`، تحويل `assignments.due_date` لـ`date`، جدولا `announcements` و`learning_activity`، الفهارس وسياسات RLS.

**M2 — `lib/student-types.ts` (ملف جديد)**
انقل كل الأنواع من ملفات `lib/student-*-data.ts` السبعة إلى ملف أنواع واحد بدون أي بيانات. أضف `ActivityDay` و`StudentProfileInfo`. عدّل ملفات الـ mock لتعمل re-export للأنواع من الملف الجديد (سطر واحد لكل ملف).

**M3 — `components/student/student-context.tsx`**
استبدل كل `any` في `StudentData` بالأنواع من `lib/student-types.ts` حسب القسم 3. أصلح أخطاء التايب الناتجة في نفس الملف فقط.

**M4 — `app/student/notifications/actions.ts` (ملف جديد)**
اكتب `getStudentNotifications()` و`markNotificationRead()` و`markAllNotificationsRead()` حسب جدول 4.1 (استعلام الاستهداف الرباعي + `notification_reads`).

**M5 — صفحة الإشعارات**
اربط صفحة إشعارات الطالب بأكشنز M4 واحذف الاستيراد من `student-notifications-data.ts`.

**M6 — `app/student/actions.ts`: الإعلانات + النشاط**
أضف `getStudentAnnouncements()` و`getStudentLearningActivity()`. عدّل `getStudentProfile()` لإرجاع `stageTitle`.

**M7 — `app/student/exams/actions.ts`: قائمة الامتحانات**
أضف `getStudentExams()` (فلترة بفروع سنة الطالب + اشتقاق الحالة من submissions) حسب 4.1.

**M8 — صفحة الامتحانات**
اربط `app/student/exams/page.tsx` بـ`getStudentExams()` واحذف الاستيراد من `student-exams-data.ts`.

**M9 — `lib/student-lectures-data.ts`**
ثلاثة إصلاحات: `content_type` من DB، `instructor` من `lectures` مع fallback، `studentsCount` بالعد الحقيقي من `order_items`/`orders`.

**M10 — `app/student/assignments/actions.ts` (ملف جديد) + صفحة الواجبات**
اكتب `getStudentAssignments()` واربط صفحة الواجبات بها بدل الـ mock.

**M11 — `app/student/progress/actions.ts`**
أضف `recordLearningActivity()` واستدعها داخل `markLessonComplete()` (تقدير الدقائق من `lessons.duration`).

**M12 — `app/student/settings/actions.ts` (ملف جديد) + ربط صفحة الإعدادات**
اكتب `updateStudentProfile()` واربط حفظ الإعدادات بها (الاسم/الهاتف/الصورة — الصورة عبر `uploadToStorage` الموجودة).

**M13 — الداشبورد `app/student/page.tsx`**
احذف كل الـ mock fallbacks؛ كل قسم يقرأ أكشنه الحقيقي، والأقسام الفارغة تعرض empty state.

**M14 — أكشن أدمن للإعلانات**
`createAnnouncement()` في أكشنز الأدمن + عنصر إدخال في اللوحة (أبسط نقطة موجودة مناسبة) مع `revalidatePath('/student')`.

**M15 — تنظيف نهائي**
احذف محتوى البيانات من `lib/student-data.ts`, `student-exams-data.ts`, `student-notifications-data.ts`, `student-billing-data.ts`, `student-schedule-data.ts` (إبقاء re-exports للأنواع فقط أو حذف الملفات إن لم يعد لها مستورد). شغّل `tsc --noEmit` وأصلح أي استيراد مكسور.

---

## 6. معايير القبول

- `grep -r "student-.*-data'" app components` لا يُرجع أي استيراد لبيانات mock (أنواع فقط إن بقيت).
- لا يوجد `any` في `StudentData`.
- إعلان/إشعار/امتحان يضيفه الأدمن يظهر لطالب السنة المستهدفة دون أي تدخل.
- طالب بلا مشتريات يرى empty states وليس بيانات وهمية.
