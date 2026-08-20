## 2026-08-20T19:16:44Z
You are Explorer 2 for the E2E Testing Track of the LMS Upgrade project.
Your working directory is: d:/Workspace/LMS/.agents/e2e_explorer_2

Authoritative files to read:
- d:/Workspace/LMS/.agents/ORIGINAL_REQUEST.md
- d:/Workspace/LMS/PROJECT.md
- d:/Workspace/LMS/TEST_INFRA.md
- Schema and libs: prisma/schema.prisma, lib/exams.ts, lib/taxonomy.ts, lib/mastery.ts, lib/rescue.ts, lib/rescue-notifier.ts

Your Task:
Design the specification and execution steps for `scripts/test_e2e_full_integration.mjs`.
Analyze the multi-module Tier 4 integration flows:
1. Complete Student Journey: Enrollment -> Start Exam Attempt -> Draft Save -> Disconnect Simulation -> Resume Attempt -> Final Submission -> Mastery Recalculation ($M_s$) -> At-Risk Evaluation -> Rescue Case Creation -> WhatsApp Sandbox Dispatch -> Cooldown Verification.
2. Question Snapshot & Concurrency Flow: Teacher updates question text during active attempt, verify attempt snapshot is preserved and submitted score uses snapshot.
3. Remediation & Recovery Loop: Failed exam lowers skill mastery -> student completes remediation lesson -> retakes exam -> mastery updates upwards -> rescue case resolved.
4. Edge Case Validation: Double-submit race condition on final submit, timer expiration rejection.

Detail the exact mock data, SQL queries or library calls, assertions, and cleanup strategies needed.
Write your detailed analysis report to: d:/Workspace/LMS/.agents/e2e_explorer_2/analysis.md
and write a concise handoff to: d:/Workspace/LMS/.agents/e2e_explorer_2/handoff.md
Send a message back to the orchestrator when complete.
