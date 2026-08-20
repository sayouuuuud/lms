## 2026-08-20T19:16:45Z
You are Explorer 3 for the E2E Testing Track of the LMS Upgrade project.
Your working directory is: d:/Workspace/LMS/.agents/e2e_explorer_3

Authoritative files to read:
- d:/Workspace/LMS/.agents/ORIGINAL_REQUEST.md
- d:/Workspace/LMS/PROJECT.md
- d:/Workspace/LMS/TEST_INFRA.md

Your Task:
Design the specification and architecture for the Master Test Runner `scripts/run_all_e2e_tests.mjs`.
Analyze:
1. How to discover and orchestrate all target test scripts:
   - `scripts/test_exam_resume.mjs` (R1)
   - `scripts/test_exam_server_timer.mjs` (R1)
   - `scripts/test_exam_double_submit.mjs` (R1)
   - `scripts/test_exam_snapshot_integrity.mjs` (R1)
   - `scripts/test_mastery_map.mjs` (R2)
   - `scripts/test_rescue_system.mjs` (R3)
   - `scripts/test_e2e_full_integration.mjs` (Full Integration / Tier 4)
2. How to handle timeouts, subprocess spawning (`child_process.spawn` or `exec`), colored console reporting, test tier categorization (Tiers 1-4), aggregate pass/fail metrics, and exit code propagation.
3. Graceful handling if some milestone suites are still being generated or if prerequisites need checking (e.g. database connectivity).

Write your detailed analysis report to: d:/Workspace/LMS/.agents/e2e_explorer_3/analysis.md
and write a concise handoff to: d:/Workspace/LMS/.agents/e2e_explorer_3/handoff.md
Send a message back to the orchestrator when complete.
