## 2026-08-20T19:19:16Z
You are the E2E Test Suite and Runner Implementer (Worker) for the LMS Upgrade project.
Your working directory is: d:/Workspace/LMS/.agents/e2e_worker_1

Authoritative files to read:
- d:/Workspace/LMS/.agents/ORIGINAL_REQUEST.md
- d:/Workspace/LMS/PROJECT.md
- d:/Workspace/LMS/TEST_INFRA.md
- d:/Workspace/LMS/.agents/e2e_explorer_1/analysis.md
- d:/Workspace/LMS/.agents/e2e_explorer_2/analysis.md
- d:/Workspace/LMS/.agents/e2e_explorer_3/analysis.md

Exclusively Owned Files to Create/Edit:
- d:/Workspace/LMS/scripts/test_e2e_full_integration.mjs
- d:/Workspace/LMS/scripts/run_all_e2e_tests.mjs

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. Implement `d:/Workspace/LMS/scripts/test_e2e_full_integration.mjs`:
   - Follow the detailed specification in `d:/Workspace/LMS/.agents/e2e_explorer_2/analysis.md`.
   - Implement all 4 Tier 4 integration flows:
     * Flow 1: Complete Student Journey (Course Enrollment -> Start Exam Attempt -> Draft Save -> Disconnect Simulation -> Resume Attempt -> Final Submission -> Mastery Recalculation ($M_s$) -> At-Risk Evaluation -> Rescue Case Creation -> WhatsApp Sandbox Dispatch -> 72h Cooldown Enforcement).
     * Flow 2: Question Snapshot & Live Mutation Guard (Snapshot frozen at start -> Teacher edits question text & correct answer in DB -> Student submits original answer -> Verified graded against frozen snapshot).
     * Flow 3: Remediation & Recovery Loop (Low mastery after failure -> Student watches lesson video -> Video completion $C_s$ updates -> Remedial exam taken -> Mastery jumps $\ge 85$ -> Active rescue case resolves to 'resolved').
     * Flow 4: Adversarial Concurrency & Expiration (10 concurrent submit calls using `Promise.all` -> 0 P2002 errors, exactly 1 submission created, idempotent results -> Timer expired attempt rejected past grace period).
   - Include thorough fixtures setup (`TEST_E2E_*`) and clean atomic teardown in `beforeAll` and `afterAll`.
   - Return exit code 0 on all pass, exit code 1 on failure.

2. Implement `d:/Workspace/LMS/scripts/run_all_e2e_tests.mjs`:
   - Follow the detailed specification in `d:/Workspace/LMS/.agents/e2e_explorer_3/analysis.md`.
   - Register all 7 milestone suites:
     * `scripts/test_exam_resume.mjs` (R1)
     * `scripts/test_exam_server_timer.mjs` (R1)
     * `scripts/test_exam_double_submit.mjs` (R1)
     * `scripts/test_exam_snapshot_integrity.mjs` (R1)
     * `scripts/test_mastery_map.mjs` (R2)
     * `scripts/test_rescue_system.mjs` (R3)
     * `scripts/test_e2e_full_integration.mjs` (Full Integration / Tier 4)
   - Support CLI arguments: `--strict`, `--tier=<1-4>`, `--milestone=<M1-M4>`, `--suite=<name>`, `--bail`, `--json`, `--list`, `--verbose`, `--help`.
   - Perform pre-flight database check.
   - Execute test scripts in isolated subprocesses via `child_process.spawn`.
   - Display a clean, colored ANSI summary dashboard with total suites, tests passed/failed/skipped, duration, and tier breakdown.
   - Return exit code 0 on 100% pass, 1 on test failure, 2 on pre-flight error.

3. Verify both scripts locally:
   - Run `cmd /c node scripts/run_all_e2e_tests.mjs --list`
   - Run `cmd /c node scripts/run_all_e2e_tests.mjs` (or test specific available suites)
   - Ensure syntax is clean, no crashes, proper ESM usage.

Write your report to `d:/Workspace/LMS/.agents/e2e_worker_1/handoff.md` and send a message back when complete.
