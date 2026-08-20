# Comprehensive Investigation Report: R3 Rescue System & WhatsApp Integration

**Prepared by:** Survey Explorer 3 (Rescue System & WhatsApp Specialist)  
**Date:** 2026-08-20  
**Target System:** LMS Upgrade Platform (`d:/Workspace/LMS`)  
**Scope:** R3 — At-Risk Student Identification, Rescue Queue Management, WhatsApp Notifications, Anti-Spam & Cooldown Architecture.

---

## 1. Executive Summary

This report delivers a deep architectural investigation into the LMS codebase to establish the complete technical blueprint for **Requirement R3 (Rescue System & WhatsApp Notifications)** as specified in `ORIGINAL_REQUEST.md`.

The investigation analyzed:
1. **Student engagement & telemetry tracking**: How course purchases, lesson watch progress, daily learning activity, attendance/presence, exam submissions, and failures are recorded across PostgreSQL models.
2. **Notification & messaging infrastructure**: In-app notifications (`notifications`, `notification_reads`), internal support tickets (`messages`), and external WhatsApp dispatch via Evolution API (`lib/whatsapp.ts`, `whatsapp_messages`).
3. **Identified gaps**: Complete absence of a persistent rescue cases table (`rescue_cases`), absence of an automated multi-rule at-risk detection engine, lack of configurable WhatsApp cooldown/rate-limiting logic, and lack of dedicated admin rescue queue interfaces.
4. **Target Technical Solution**: A modular, robust, audit-logged **Rescue Engine** comprising:
   - Declarative Rule Engine (`PURCHASED_INACTIVE`, `RECURRING_FAILURE`, `ABANDONED_FLOW`, `INACTIVE_STUDENT`).
   - Persistent `rescue_cases` queue with state machine (`open` → `contacted` → `in_progress` → `resolved` / `dismissed`).
   - Rate-limited WhatsApp Dispatcher with multi-tier cooldown protection (per-student cooldown, per-case cooldown, global burst limiter, and mock sandbox mode for test environments).
   - Admin Queue UI & Server Actions with one-click personalized Arabic message previews.
   - Fully automated Integration & Verification Test Suite (`test_rescue_system.mjs`).

---

## 2. Codebase Inventory & Current State Analysis

### 2.1 Student Purchases, Enrollments & Activity Models

| Domain | Database Table / Model | Key Fields & Semantics | File References |
|---|---|---|---|
| **Orders & Purchases** | `orders` & `order_items` | `orders.student_id` (FK → `auth.users.id`), `orders.status` (`'pending'`, `'approved'`, `'rejected'`), `order_items.lecture_id`, `order_items.monthly_course_id`, `order_items.term_id`, `orders.created_at`. | `app/admin/payments/orders-actions.ts`, `prisma/schema.prisma:1131-1175` |
| **Legacy Enrollments** | `enrollments` | `student_id` (FK → `students.id`), `course_id` (FK → `courses.id`), `enrolled_at`. | `prisma/schema.prisma:811-822` |
| **Student Profiles & Identity** | `students` & `profiles` | `students.id` (UUID), `students.user_id` (UUID), `students.phone`, `students.last_seen_at` (timestamptz), `students.status` (`'نشط'`, `'موقوف'`). | `app/admin/students/[id]/actions.ts`, `lib/auth-guard.ts` |
| **Watch Telemetry & Progress** | `lesson_watch_progress` | `user_id`, `lesson_id`, `lecture_id`, `student_id`, `max_percent` (0..100), `watched_seconds`, `duration_seconds`, `completed` (bool: `max_percent >= 90`), `first_viewed_at`, `last_viewed_at`. | `app/api/lecture-progress/route.ts:66-80`, `prisma/schema.prisma:1202-1220` |
| **Content Progress** | `student_content_progress` | `user_id`, `item_type` (`'lesson'`), `item_id`, `status` (`'completed'`), `score`, `updated_at`. | `prisma/schema.prisma:1389-1403`, `app/student/actions/progress.ts:66-73` |
| **Video Drop-off & Retention** | `lesson_segment_viewers` | `lesson_id`, `segment_index` (0..19), `user_id`, `created_at`. | `app/api/lecture-progress/route.ts:84-90`, `app/admin/analytics/queries.ts:275-298` |
| **Daily Learning Minutes** | `learning_activity` | `student_id`, `activity_date` (Date), `minutes` (int). | `app/student/actions/progress.ts:25-49`, `prisma/schema.prisma:916-926` |
| **Presence Ping** | `students.last_seen_at` | Heartbeat updated via `pingPresence()` server action on user navigation. | `app/student/presence-actions.ts:8-25` |
| **Exams & Quiz Results** | `exam_submissions` & `exam_answers` | `exam_submissions.score`, `total`, `status` (`'ناجح'`, `'راسب'`, `'قيد التصحيح'`), `grading_status` (`'graded'`, `'pending'`), `submitted_at`. `exam_answers.is_correct`, `awarded_points`. | `app/student/exams/actions.ts:258-294`, `prisma/schema.prisma:869-886` |
| **Assignments** | `assignment_submissions` | `assignment_id`, `student_id`, `status` (`'لم يبدأ'`, `'تم التسليم'`, `'متأخر'`, `'لم يسلّم'`), `score`, `submitted_at`. | `app/admin/students/[id]/actions.ts:380-400` |

### 2.2 Existing Notification & Messaging Stack

1. **In-App Notifications (`notifications` & `notification_reads`)**:
   - `lib/notify.ts`: Helper `createNotification({ type, title, description, studentId, stageId, branchId, lectureId })`.
   - Used for broadcast announcements, stage/grade notifications, or direct student messages.
2. **Support Chat Tickets (`messages`)**:
   - Internal ticketing stored in `messages` with `chat_history` (JSON array of `{ id, fromMe, text, time }`), `student_unread`, `unread_count`.
3. **WhatsApp Infrastructure (`lib/whatsapp.ts` & `whatsapp_messages`)**:
   - **Provider**: Evolution API (Self-hosted Meta WhatsApp Cloud API wrapper).
   - **Environment Configuration**: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`.
   - **Core Functions**:
     * `isWhatsAppConfigured()`: Checks if env variables exist.
     * `checkWhatsAppConnection()`: Queries Evolution API instance state (`/instance/connectionState/{instance}`).
     * `sendWhatsAppText({ phone, text, template, studentId, redactBody })`: Sends HTTP POST to `/message/sendText/{instance}`, logs attempt in `whatsapp_messages` (`queued` → `sent` or `failed`).
   - **Database Model (`whatsapp_messages`)**:
     * Columns: `id`, `to_phone`, `template`, `body`, `status` (`'queued'`, `'sent'`, `'failed'`), `provider_message_id`, `error`, `student_id`, `created_at`, `sent_at`.
     * Current Check Constraint in DB: `CHECK (template IN ('login_otp', 'payment_approved', 'custom'))`.
   - **Phone Normalization (`lib/phone.ts`)**:
     * `normalizeEgyptPhone(raw)`: Standardizes Egyptian numbers to E.164 without plus sign (e.g. `201012345678`).

---

## 3. Detailed Gap Analysis for R3

| Area | Current Codebase State | Requirement for R3 | Severity |
|---|---|---|---|
| **Rescue Persistence** | No rescue cases table exists in schema. | Dedicated `rescue_cases` table with priority, triggers, risk score, resolution notes, and assignment tracking. | **Critical Block** |
| **At-Risk Detection Engine** | Ad-hoc queries in analytics/students page without systematic risk classification. | Unified, rule-driven evaluation service detecting (1) Inactive purchase, (2) Recurring exam failures, (3) Drop-out / Abandoned exam flow, (4) Chronic inactivity. | **Critical Block** |
| **WhatsApp Cooldown & Anti-Spam** | WhatsApp messages sent on-demand without any cooldown or frequency throttling. | Multi-level cooldown protection: student-level cooldown window (e.g., 72 hours), per-case cooldown, and hourly batch rate-limiting. | **Critical Block** |
| **Evolution API Constraint** | `whatsapp_messages` template constraint limited to `'login_otp'`, `'payment_approved'`, `'custom'`. | Support for rescue templates (either using template `'custom'` or expanding constraint to include `'rescue_alert'`). | **Medium** |
| **Admin Operations UI** | No UI for monitoring or resolving rescue cases. | Dedicated Rescue Management interface `/admin/rescue` with status filters, risk indicators, and one-click WhatsApp modal. | **High** |
| **Background / Scheduled Scanning** | No cron engine inside Next.js; background worker exists only for transcoder. | Secure API endpoint (`/api/cron/rescue` protected with `CRON_SECRET`) + manual on-demand trigger button in admin dashboard. | **Medium** |
| **Integration & Verification Tests** | No automated tests for rescue cases or WhatsApp cooldown. | Comprehensive integration test script verifying student case generation, WhatsApp dispatch via mock sandbox, and cooldown suppression. | **Critical Block** |

---

## 4. Technical Architecture for R3 (Rescue System & WhatsApp)

```
                       ┌────────────────────────────────────────────────────────┐
                       │                   Rescue Trigger Sources               │
                       │  • Cron Job (/api/cron/rescue)                         │
                       │  • Admin Manual Scan Action                            │
                       │  • Event Triggers (Exam Failure, 3-Day Inactive Hook)  │
                       └───────────────────────────┬────────────────────────────┘
                                                   │
                                                   ▼
                       ┌────────────────────────────────────────────────────────┐
                       │               RescueDetectorEngine                     │
                       │                                                        │
                       │  [Rule 1: Purchased & Inactive (>= 3 days, 0m watch)]  │
                       │  [Rule 2: Recurring Failures (>= 2 failed exams)]      │
                       │  [Rule 3: Abandoned Exam/Flow (Prereq done, no exam)]  │
                       │  [Rule 4: Inactive Student (>= 14 days no presence)]   │
                       └───────────────────────────┬────────────────────────────┘
                                                   │
                                                   ▼
                       ┌────────────────────────────────────────────────────────┐
                       │               RescueQueueService                       │
                       │                                                        │
                       │  • Deduplicate against active cases (student_id + rule)│
                       │  • Upsert to `rescue_cases` (risk_score, priority)     │
                       │  • Generate tailored Arabic suggestion                 │
                       └───────────────────────────┬────────────────────────────┘
                                                   │
                                                   ▼
                       ┌────────────────────────────────────────────────────────┐
                       │           Admin Dashboard & Operations (/admin/rescue) │
                       │                                                        │
                       │  • Queue Table with Risk Indicators & Filters          │
                       │  • One-Click WhatsApp Rescue Dispatch Modal            │
                       │  • Status Transitions (open -> contacted -> resolved)  │
                       └───────────────────────────┬────────────────────────────┘
                                                   │
                                                   ▼
                       ┌────────────────────────────────────────────────────────┐
                       │         WhatsAppDispatcherWithCooldown                 │
                       │                                                        │
                       │  1. Check Cooldown (Is last message within 72h?)       │
                       │  2. Check Rate Limit (Hourly threshold exceeded?)      │
                       │  3. Normalize Phone (normalizeEgyptPhone)              │
                       │  4. Dispatch via Evolution API / Sandbox Mock Provider │
                       │  5. Audit Log to `whatsapp_messages` & `activity_logs` │
                       │  6. Update `rescue_cases` status to 'contacted'        │
                       └────────────────────────────────────────────────────────┘
```

---

## 5. Precise Rule Engine Logic & Detection Criteria

### Rule 1: Purchased but Inactive (`PURCHASED_INACTIVE`)
- **Condition**:
  * Student has an `approved` order created $\ge N$ days ago (default $N = 3$ days).
  * For all lectures in `order_items`, `lesson_watch_progress` has 0 rows or `SUM(watched_seconds) == 0`.
- **Calculated Risk Score**: `80` (High Urgency).
- **Priority**: `'high'`.
- **Suggested Action**: Send welcoming onboarding WhatsApp nudge with direct link to start lecture 1.

### Rule 2: Recurring Exam / Quiz Failures (`RECURRING_FAILURE`)
- **Condition**:
  * Student has $\ge 2$ submissions in `exam_submissions` with `status == 'راسب'` (or `score / total < 0.5`) within the last 30 days.
  * Or average score across recent 3 exams $< 50\%$.
- **Calculated Risk Score**: `85` (High Urgency).
- **Priority**: `'high'`.
- **Suggested Action**: Send supportive message offering remedial questions, study tips, or teacher support office hours.

### Rule 3: Abandoned Flow / Exam Drop-off (`ABANDONED_FLOW`)
- **Condition**:
  * Student has completed $\ge 80\%$ of lessons in a lecture or course section $\ge 3$ days ago (`student_content_progress` or `lesson_watch_progress`).
  * Corresponding exam for that lecture/course has 0 submissions in `exam_submissions`.
- **Calculated Risk Score**: `70` (Medium Urgency).
- **Priority**: `'medium'`.
- **Suggested Action**: Send motivating reminder to take the exam and earn their completion certificate.

### Rule 4: Prolonged Absence / General Inactivity (`INACTIVE_STUDENT`)
- **Condition**:
  * Student has at least one active course enrollment or approved purchase.
  * `students.last_seen_at` is older than 14 days (or null) and no `learning_activity` logged in the last 14 days.
- **Calculated Risk Score**: `65`.
- **Priority**: `'medium'`.
- **Suggested Action**: Send "We miss you" motivational nudge with quick recap.

---

## 6. Database Schema Design (SQL & Prisma Model)

### 6.1 Migration SQL: `prisma/sql/R03_rescue_system.sql`

```sql
-- R03: Rescue System & Queue Management
-- Idempotent setup for at-risk student tracking

CREATE TABLE IF NOT EXISTS public.rescue_cases (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  trigger_type        text NOT NULL,
  priority            text NOT NULL DEFAULT 'medium',
  status              text NOT NULL DEFAULT 'open',
  risk_score          integer NOT NULL DEFAULT 50,
  details             jsonb NOT NULL DEFAULT '{}'::jsonb,
  suggested_action    text NOT NULL DEFAULT '',
  assigned_to         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_contacted_at   timestamptz,
  resolved_at         timestamptz,
  resolution_notes    text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rescue_cases_trigger_chk CHECK (trigger_type IN ('PURCHASED_INACTIVE', 'RECURRING_FAILURE', 'ABANDONED_FLOW', 'INACTIVE_STUDENT', 'MANUAL')),
  CONSTRAINT rescue_cases_priority_chk CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  CONSTRAINT rescue_cases_status_chk CHECK (status IN ('open', 'contacted', 'in_progress', 'resolved', 'dismissed'))
);

CREATE INDEX IF NOT EXISTS idx_rescue_cases_student ON public.rescue_cases (student_id);
CREATE INDEX IF NOT EXISTS idx_rescue_cases_status  ON public.rescue_cases (status);
CREATE INDEX IF NOT EXISTS idx_rescue_cases_trigger ON public.rescue_cases (trigger_type);
CREATE INDEX IF NOT EXISTS idx_rescue_cases_priority ON public.rescue_cases (priority, risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_rescue_cases_created ON public.rescue_cases (created_at DESC);

-- Unique index to prevent duplicate OPEN cases for the same student and trigger
CREATE UNIQUE INDEX IF NOT EXISTS uq_rescue_open_case 
  ON public.rescue_cases (student_id, trigger_type) 
  WHERE status IN ('open', 'contacted', 'in_progress');

-- Update platform settings with WhatsApp Rescue cooldown & rate limit configuration
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS rescue_whatsapp_cooldown_hours integer NOT NULL DEFAULT 72,
  ADD COLUMN IF NOT EXISTS rescue_auto_notify boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rescue_hourly_limit integer NOT NULL DEFAULT 50;

ALTER TABLE public.rescue_cases ENABLE ROW LEVEL SECURITY;
```

### 6.2 Prisma Model Definition

```prisma
model rescue_cases {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  student_id        String    @db.Uuid
  trigger_type      String
  priority          String    @default("medium")
  status            String    @default("open")
  risk_score        Int       @default(50)
  details           Json      @default("{}")
  suggested_action  String    @default("")
  assigned_to       String?   @db.Uuid
  last_contacted_at DateTime? @db.Timestamptz(6)
  resolved_at       DateTime? @db.Timestamptz(6)
  resolution_notes  String?
  created_at        DateTime  @default(now()) @db.Timestamptz(6)
  updated_at        DateTime  @default(now()) @db.Timestamptz(6)

  students          students  @relation(fields: [student_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([student_id], map: "idx_rescue_cases_student")
  @@index([status], map: "idx_rescue_cases_status")
  @@index([trigger_type], map: "idx_rescue_cases_trigger")
  @@index([priority, risk_score(sort: Desc)], map: "idx_rescue_cases_priority")
  @@index([created_at(sort: Desc)], map: "idx_rescue_cases_created")
  @@schema("public")
}
```

---

## 7. Anti-Spam & WhatsApp Cooldown Architecture

### 7.1 Multi-Layer Cooldown & Anti-Spam Protection

1. **Student-Level Cooldown (72-Hour Default)**:
   - Before sending any WhatsApp message to student $S$, the system verifies:
     $$\text{COUNT}(\text{whatsapp\_messages WHERE student\_id} = S \text{ AND created\_at} \ge \text{NOW}() - 72\text{ hours}) == 0$$
   - If a message was sent within 72 hours, the dispatch is **blocked** and returns `{ ok: false, reason: 'cooldown_active', remainingHours }`.
2. **Case-Level Cooldown**:
   - `rescue_cases.last_contacted_at` is checked to prevent multiple staff members from double-messaging on the same issue.
3. **Global Burst Limiter**:
   - Max 50 messages/hour globally across the platform to protect Meta WhatsApp Account / Evolution API instance from automated banning.
4. **Consent & Number Verification**:
   - Verifies phone number validity via `normalizeEgyptPhone()`.
   - Checks `profiles.notif_prefs` (if student opted out of WhatsApp/SMS reminders).
5. **Mock / Sandbox Mode Support**:
   - In test or development environments (`NODE_ENV === 'test'` or `process.env.WHATSAPP_SANDBOX === 'true'`), the dispatcher writes to `whatsapp_messages` with status `'sent'` without making real external HTTP requests to Evolution API.

### 7.2 Arabic Message Templates

```typescript
export function getRescueMessageTemplate(type: RescueTriggerType, data: {
  studentName: string
  courseTitle?: string
  daysInactive?: number
  examTitle?: string
}): string {
  const name = data.studentName || 'يا بطل'
  switch (type) {
    case 'PURCHASED_INACTIVE':
      return [
        'منصة أكاديمية شفاء العليل 🌟',
        '',
        `أهلاً بك يا ${name} 👋`,
        `لاحظنا إنك اشتركت في "${data.courseTitle || 'الكورس'}" من ${data.daysInactive || 3} أيام ولحد دلوقتي مبدأتش أول درس.`,
        '',
        'المحتوى جاهز ومستنيك، خطوة واحدة بتفرق كتير في مستواك! ادخل دلوقتي وابدأ أول فيديو:',
        '🔗 منصة شفاء العليل - كورساتي',
        '',
        'لو عندك أي مشكلة أو استفسار، احنا معاك وجاهزين نساعدك في أي وقت.'
      ].join('\n')

    case 'RECURRING_FAILURE':
      return [
        'منصة أكاديمية شفاء العليل 📚',
        '',
        `أهلاً يا ${name}،`,
        'شفنا محاولاتك الأخيرة في الاختبارات، وبنحب نفكرك إن الغلط هو أول طريق الفهم والإتقان!',
        '',
        'متقلقش خالص، جهزنالك مراجعة لأهم النقاط وفريق التدريس متاح لمساعدتك في أي سؤال مش واضح.',
        'ادخل على المنصة وراجع أخطاء الاختبار أو تواصل مع الدعم.',
        '',
        'بالتوفيق دايمًا يا بطل!'
      ].join('\n')

    case 'ABANDONED_FLOW':
      return [
        'منصة أكاديمية شفاء العليل 🎯',
        '',
        `أهلاً يا ${name} 👋`,
        `أنت قطعت شوط ممتاز وخلصت دروس "${data.courseTitle || 'المحاضرة'}"، وباقي لك فقط الاختبار التقييمي عشان تثبت المعلومة!`,
        '',
        'ادخل دلوقتي وجرب الاختبار، بالتوفيق والدرجات العالية بإذن الله.'
      ].join('\n')

    case 'INACTIVE_STUDENT':
      return [
        'منصة أكاديمية شفاء العليل 💫',
        '',
        `أهلاً يا ${name}،`,
        'وحشتنا على المنصة! بقالك فترة مش ظاهر ومستنيين رجوعك واستكمال جدول المذاكرة.',
        '',
        'يلا افتح المنصة وكمّل من المكان اللي وقفت عنده!',
      ].join('\n')
  }
}
```

---

## 8. Interface & Server Action Specifications

### 8.1 TypeScript Types (`lib/rescue-types.ts`)

```typescript
export type RescueTriggerType = 
  | 'PURCHASED_INACTIVE'
  | 'RECURRING_FAILURE'
  | 'ABANDONED_FLOW'
  | 'INACTIVE_STUDENT'
  | 'MANUAL'

export type RescuePriority = 'urgent' | 'high' | 'medium' | 'low'
export type RescueStatus = 'open' | 'contacted' | 'in_progress' | 'resolved' | 'dismissed'

export interface RescueCaseRecord {
  id: string
  studentId: string
  studentCode: string
  studentName: string
  studentPhone: string
  studentEmail: string
  triggerType: RescueTriggerType
  priority: RescuePriority
  status: RescueStatus
  riskScore: number
  details: {
    courseTitle?: string
    daysInactive?: number
    failedExamsCount?: number
    lastExamScore?: string
    lastSeenDate?: string
    [key: string]: any
  }
  suggestedAction: string
  assignedTo?: string | null
  lastContactedAt?: string | null
  cooldownActive: boolean
  cooldownRemainingHours: number
  createdAt: string
}
```

### 8.2 Server Actions (`app/admin/rescue/actions.ts`)

```typescript
// 1. Evaluate and populate rescue queue
export async function runRescueScan(): Promise<{
  success: boolean
  newCasesCount: number
  totalOpenCases: number
}>

// 2. Fetch rescue queue with filters & pagination
export async function getRescueCases(filters?: {
  triggerType?: RescueTriggerType | 'all'
  status?: RescueStatus | 'all'
  priority?: RescuePriority | 'all'
  search?: string
  page?: number
  pageSize?: number
}): Promise<{
  cases: RescueCaseRecord[]
  stats: {
    totalOpen: number
    urgentCount: number
    contactedCount: number
    resolvedToday: number
  }
  total: number
}>

// 3. Dispatch WhatsApp message with Cooldown Check
export async function sendRescueWhatsApp(
  caseId: string, 
  customText?: string
): Promise<{
  success: boolean
  error?: string
  cooldownBlocked?: boolean
  remainingHours?: number
}>

// 4. Update case status (Resolve, Dismiss, Assign)
export async function updateRescueCaseStatus(
  caseId: string, 
  status: RescueStatus, 
  notes?: string
): Promise<{ success: boolean; error?: string }>
```

---

## 9. Verification & Integration Testing Strategy

An integration test script `scripts/test_rescue_system.mjs` will be created to verify all R3 acceptance criteria independently:

1. **Test Scenario 1 (At-Risk Generation)**:
   - Create dummy student, stage, lecture, and approved order with timestamp $4$ days ago.
   - Run `runRescueScan()`.
   - Verify a case is created in `rescue_cases` with `trigger_type = 'PURCHASED_INACTIVE'`, `priority = 'high'`, `status = 'open'`.
2. **Test Scenario 2 (WhatsApp Message Dispatch via Mock/Sandbox)**:
   - Invoke `sendRescueWhatsApp(caseId)` in sandbox mode.
   - Verify `whatsapp_messages` row created with `status = 'sent'`.
   - Verify `rescue_cases` status updated to `'contacted'` and `last_contacted_at` populated.
3. **Test Scenario 3 (Cooldown & Rate Limiting Enforcement)**:
   - Immediately attempt a second `sendRescueWhatsApp(caseId)`.
   - Verify the second attempt is rejected with `cooldownBlocked: true`.
   - Verify no duplicate entry added to `whatsapp_messages`.
4. **Test Scenario 4 (Resolution Lifecycle)**:
   - Call `updateRescueCaseStatus(caseId, 'resolved', 'Student resumed watching lessons')`.
   - Verify `rescue_cases.status = 'resolved'`, `resolved_at` is set, and duplicate case creation is avoided.

---

## 10. Summary Checklist for Implementation

- [x] Full codebase mapping of purchases, watch progress, drop-offs, exams, and activity logs.
- [x] Complete inventory of notification, messaging, and Evolution API WhatsApp infrastructure.
- [x] Comprehensive gap analysis against `ORIGINAL_REQUEST.md`.
- [x] Defined SQL migration script (`R03_rescue_system.sql`) and Prisma schema model.
- [x] Formulated declarative rule engine logic (`PURCHASED_INACTIVE`, `RECURRING_FAILURE`, `ABANDONED_FLOW`, `INACTIVE_STUDENT`).
- [x] Designed multi-tier anti-spam and cooldown architecture (72h cooldown, hourly rate limit, sandbox mode).
- [x] Created technical specification for Admin Queue UI and Server Actions.
- [x] Designed end-to-end integration verification test suite.
