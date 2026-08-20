# Scope: Milestone 3 (M3: Rescue System & WhatsApp)

## Architecture
- **Detection Engine (`lib/rescue.ts`)**: Evaluates student telemetry (orders, watch progress, exam failures, last seen presence) to flag at-risk students according to 4 standard rules:
  1. `PURCHASED_INACTIVE`: Approved purchase >= 3 days ago with 0 watch progress.
  2. `RECURRING_FAILURE`: >= 2 failed exams in the last 30 days or average < 50%.
  3. `ABANDONED_FLOW`: Completed >= 80% lessons in lecture >= 3 days ago but 0 exam submissions.
  4. `INACTIVE_STUDENT`: Enrolled/purchased with no presence / learning activity for >= 14 days.
- **Queue Management (`rescue_cases`, `prisma/schema.prisma`)**: Tracks cases through states (`open`, `contacted`, `in_progress`, `resolved`, `dismissed`) with priority, risk score, details, and resolution notes.
- **WhatsApp Notification Engine (`lib/rescue-notifier.ts`)**: Sends personalized Arabic motivational messages with:
  - 72-hour per-student cooldown enforcement.
  - Hourly rate limit protection.
  - Sandbox / mock provider mode support for testing (`WHATSAPP_SANDBOX=true` or test env).
- **Admin Server Actions (`app/admin/rescue/actions.ts`)**: Secure server actions for running scans, listing cases with filters, updating case statuses, and dispatching WhatsApp alerts.
- **Verification Suite (`scripts/test_rescue_system.mjs`)**: End-to-end integration test verifying all rules, queue transitions, WhatsApp mock dispatch, cooldown enforcement, and idempotency.

## Milestones & Work Items
| # | Component | Target Files | Status |
|---|-----------|--------------|--------|
| 1 | SQL Migration & Schema | `scripts/003_rescue_system.sql`, `prisma/schema.prisma` | PLANNED |
| 2 | Core Detection & Queue Service | `lib/rescue.ts` | PLANNED |
| 3 | WhatsApp Cooldown & Notifier | `lib/rescue-notifier.ts` | PLANNED |
| 4 | Admin Actions | `app/admin/rescue/actions.ts` | PLANNED |
| 5 | Standalone Test Suite | `scripts/test_rescue_system.mjs` | PLANNED |

## Interface Contracts
- `evaluateStudentRisk(studentId: string): Promise<RiskEvaluationResult[]>`
- `runRescueScan(): Promise<{ success: boolean; newCasesCount: number; totalOpenCases: number }>`
- `getRescueCases(filters?: RescueFilters): Promise<{ cases: RescueCaseRecord[]; total: number; stats: RescueStats }>`
- `updateRescueCaseStatus(caseId: string, status: RescueStatus, notes?: string): Promise<{ success: boolean; error?: string }>`
- `sendRescueWhatsApp(caseId: string, customText?: string, options?: { force?: boolean }): Promise<{ success: boolean; error?: string; cooldownBlocked?: boolean; remainingHours?: number }>`

## Code Layout
- `scripts/003_rescue_system.sql`
- `prisma/schema.prisma`
- `lib/rescue.ts`
- `lib/rescue-notifier.ts`
- `app/admin/rescue/actions.ts`
- `scripts/test_rescue_system.mjs`
