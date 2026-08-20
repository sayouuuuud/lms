# Handoff Report — Master Test Runner Specification (`scripts/run_all_e2e_tests.mjs`)
**Explorer:** e2e_explorer_3 | **Track:** E2E Testing Track | **Date:** 2026-08-20

---

## 1. Observation
- **Target Verification Suites**: The LMS Upgrade requires testing 4 major milestones (M1 Exams Edge Cases, M2 Mastery & Taxonomy, M3 Rescue & WhatsApp, M4 Multi-Module Integration) across 7 designated test scripts:
  - `scripts/test_exam_resume.mjs` (R1 / Tier 1-2)
  - `scripts/test_exam_server_timer.mjs` (R1 / Tier 1-2)
  - `scripts/test_exam_double_submit.mjs` (R1 / Tier 1-2)
  - `scripts/test_exam_snapshot_integrity.mjs` (R1 / Tier 1-2)
  - `scripts/test_mastery_map.mjs` (R2 / Tier 1-3)
  - `scripts/test_rescue_system.mjs` (R3 / Tier 1-3)
  - `scripts/test_e2e_full_integration.mjs` (M4 / Tier 4 Multi-Module)
- **Existing Runner Patterns**: Existing verification scripts in `scripts/` (e.g. `scripts/verify_rls_security.mjs`, `scripts/test_student_lifecycle.mjs`, `scripts/apply_all_migrations.mjs`) use Node.js ESM (`.mjs`), `process.loadEnvFile()`, standalone `pg.Client` or Prisma client, custom assertion helpers (`[PASS]`, `[FAIL]`), and exit code `process.exit(failed > 0 ? 1 : 0)`.
- **Infrastructure Requirements**: As defined in `PROJECT.md` and `TEST_INFRA.md`, the Master Test Runner must run sequentially, categorize suites into Tiers 1-4, enforce per-suite timeouts, provide colored terminal output, handle missing suites gracefully, perform pre-flight checks, and propagate exit codes strictly.

---

## 2. Logic Chain
1. **Subprocess Isolation**: Because E2E tests interact with database state, Prisma transaction contexts, and global process state, running suites in separate subprocesses via `child_process.spawn` avoids in-memory pollution, connection pool leaks, and unhandled rejection contamination.
2. **Deterministic Output & Resource Management**: Using `child_process.spawn` instead of `exec` prevents `maxBuffer` crashes on verbose test logs, supports streaming stdout/stderr, and enables clean `SIGTERM`/`SIGKILL` timeout enforcement.
3. **Multi-Tier Orchestration**: Categorizing suites by Tier (1: Basic Lifecycle, 2: Boundary & Concurrency, 3: Mathematical & Queues, 4: Multi-Module Real-World Journeys) and adding CLI flags (`--tier`, `--milestone`, `--suite`, `--bail`, `--strict`, `--json`) enables focused development runs, quick smoke tests, and full CI validation.
4. **Pre-flight Health Gate**: Checking `DATABASE_URL` and running a fast `SELECT 1` ping before executing test suites prevents false failure reports caused by unreachable databases, saving developer time and producing clean exit codes (`2` for pre-flight failure).
5. **Work-in-Progress Resilience**: When milestone suites are under construction, the runner marks them as `SKIPPED` in normal/development mode while enforcing `FAILED` under `--strict` (CI mode), ensuring smooth parallel multi-agent development.

---

## 3. Caveats
- **Mock WhatsApp Guarantee**: Child subprocesses must receive `MOCK_WHATSAPP=true` and `NODE_ENV=test` to ensure real external WhatsApp APIs (Evolution API) are never triggered during E2E verification.
- **Windows Process Tree Termination**: On Windows environments, `child.kill('SIGTERM')` terminates the parent Node process. The runner incorporates fallback forced termination (`SIGKILL`) to prevent orphaned processes if a database query hangs.
- **Database State Cleanup**: Individual test scripts are expected to clean up their own test fixtures (or use unique prefixes like `test_e2e_*`), but the sequential execution model in the Master Runner prevents concurrent transaction collisions.

---

## 4. Conclusion
The architectural specification and reference implementation for `scripts/run_all_e2e_tests.mjs` are fully documented in `analysis.md`. The design is completely self-contained, requires zero external test dependencies, supports rich CLI filtering, features an ANSI summary dashboard, and guarantees strict exit code propagation for CI/CD pipelines.

---

## 5. Verification Method
1. **Runner File Inspection**: Inspect `d:/Workspace/LMS/.agents/e2e_explorer_3/analysis.md` for complete code layout, data structures, CLI flags, and architectural workflows.
2. **Execution Smoke Test**: Once `scripts/run_all_e2e_tests.mjs` is created, run:
   ```bash
   node scripts/run_all_e2e_tests.mjs --list
   node scripts/run_all_e2e_tests.mjs --tier=1
   node scripts/run_all_e2e_tests.mjs --strict
   ```
3. **Failure & Exit Code Invalidation**: Run with `--suite=nonexistent --strict` to verify exit code `1`, and test invalid database credentials to verify exit code `2`.
