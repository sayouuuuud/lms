## 2026-08-20T19:16:00Z
You are the Sub-Orchestrator for Milestone 3 (M3: Rescue System & WhatsApp).
Your working directory is: d:/Workspace/LMS/.agents/sub_orch_m3_rescue
Parent Conversation ID: 53884783-d58f-4013-a2d6-da8168ecc549

Your Mission:
Orchestrate and execute the complete implementation and verification of R3 (Rescue System & WhatsApp):
1. Read the authoritative files:
   - d:/Workspace/LMS/.agents/ORIGINAL_REQUEST.md
   - d:/Workspace/LMS/PROJECT.md
   - d:/Workspace/LMS/TEST_INFRA.md
   - d:/Workspace/LMS/.agents/survey_explorer_rescue/report.md
   - d:/Workspace/LMS/.agents/survey_explorer_rescue/handoff.md

2. Scope:
   - Migration script: `scripts/003_rescue_system.sql` creating `rescue_cases` and `rescue_case_logs`.
   - Prisma schema updates: Add `rescue_cases` and `rescue_case_logs` in `prisma/schema.prisma`.
   - Core services:
     * `lib/rescue.ts` (At-risk detection rules: PURCHASED_INACTIVE, RECURRING_FAILURE, ABANDONED_FLOW, INACTIVE_STUDENT; queue lifecycle management)
     * `lib/rescue-notifier.ts` (WhatsApp notification dispatcher with 72-hour student cooldown, hourly rate limiting, template engine, and sandbox mock provider mode)
   - Admin actions / UI endpoints in `app/admin/rescue/actions.ts`.
   - Standalone Verification Script:
     * `scripts/test_rescue_system.mjs` (triggers at-risk detection, verifies queue creation, dispatches WhatsApp alerts in mock/sandbox mode, asserts 72h cooldown enforcement and rate limiting).

3. Execute using standard sub-orchestrator pattern:
   - Initialize BRIEFING.md, SCOPE.md, progress.md.
   - Dispatch Worker (with mandatory integrity warning).
   - Dispatch Reviewers, Challengers, and Forensic Auditor (`teamwork_preview_auditor`).
   - Run Gate check. On PASS, deliver handoff.md and send completion message to parent.
