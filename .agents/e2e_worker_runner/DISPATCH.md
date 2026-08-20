## 2026-08-20T19:50:52Z

You are the Runner Implementer (Worker) for the E2E Testing Track of the LMS Upgrade project.
Your working directory is: d:/Workspace/LMS/.agents/e2e_worker_runner

Authoritative files to read:
- d:/Workspace/LMS/.agents/ORIGINAL_REQUEST.md
- d:/Workspace/LMS/PROJECT.md
- d:/Workspace/LMS/TEST_INFRA.md
- d:/Workspace/LMS/.agents/e2e_explorer_3/analysis.md

Exclusively Owned File to Create:
- d:/Workspace/LMS/scripts/run_all_e2e_tests.mjs

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. Implement `d:/Workspace/LMS/scripts/run_all_e2e_tests.mjs`:
   - Follow the complete reference implementation and architecture in `d:/Workspace/LMS/.agents/e2e_explorer_3/analysis.md` (specifically Section 9).
   - Register all 7 test suites:
     * `exam-resume`: `scripts/test_exam_resume.mjs` (M1, Tier 1)
     * `exam-timer`: `scripts/test_exam_server_timer.mjs` (M1, Tier 1)
     * `exam-double-submit`: `scripts/test_exam_double_submit.mjs` (M1, Tier 2)
     * `exam-snapshot`: `scripts/test_exam_snapshot_integrity.mjs` (M1, Tier 2)
     * `mastery-map`: `scripts/test_mastery_map.mjs` (M2, Tier 3)
     * `rescue-system`: `scripts/test_rescue_system.mjs` (M3, Tier 3)
     * `e2e-integration`: `scripts/test_e2e_full_integration.mjs` (M4, Tier 4)
   - Support CLI arguments: `--strict`, `--tier=<1..4|all>`, `--milestone=<M1..M4|all>`, `--suite=<name>`, `--bail`, `--json`, `--report-file=<path>`, `--timeout=<ms>`, `--skip-preflight`, `--list`, `--verbose`.
   - Implement preflight check for database reachability using `pg` Client (`SELECT 1`).
   - Implement child process execution via `child_process.spawn` with timeouts, environment variables (`NODE_ENV=test`, `MOCK_WHATSAPP=true`, `FORCE_COLOR=1`), and assertion metrics parsing from stdout.
   - Implement graceful handling of missing suites (SKIPPED in dev, FAILED in strict mode).
   - Implement ANSI dashboard summary output and exit code propagation (0 on all pass, 1 on failure, 2 on pre-flight error).
2. Test and verify locally:
   - Run: `cmd /c node scripts/run_all_e2e_tests.mjs --list`
   - Run: `cmd /c node scripts/run_all_e2e_tests.mjs`
3. Document verification in `d:/Workspace/LMS/.agents/e2e_worker_runner/handoff.md` and send a message back when complete.
