# Scope: E2E Testing Track & Master Test Runner

## Architecture
- **Master Test Runner**: `scripts/run_all_e2e_tests.mjs` executes all test suites, summarizes results across tiers (Tiers 1-4), and returns exit code 0 on all pass.
- **Cross-cutting Integration Suite**: `scripts/test_e2e_full_integration.mjs` validates realistic multi-module flows:
  - Scenario 1: Complete Student Journey (Enrollment -> Attempt -> Disconnect/Resume -> Submit -> Mastery Update -> Failure Detection -> Rescue Queue -> WhatsApp Dispatch -> Cooldown Assertion)
  - Scenario 2: High-Stakes Exam Under Concurrent Question Edits + Snapshot Integrity + Double Submit Locking
  - Scenario 3: Remediation & Mastery Recovery Loop (Failed Exam -> Low Mastery -> Lesson Study -> Re-attempt -> Mastery Recalculation)
  - Scenario 4: Rescue Queue Lifecycle & Rate Limiter / Cooldown Verification under load
- **Individual Milestone Test Suites**:
  - `scripts/test_exam_resume.mjs`
  - `scripts/test_exam_server_timer.mjs`
  - `scripts/test_exam_double_submit.mjs`
  - `scripts/test_exam_snapshot_integrity.mjs`
  - `scripts/test_mastery_map.mjs`
  - `scripts/test_rescue_system.mjs`

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E1 | E2E Integration Suite | Create `scripts/test_e2e_full_integration.mjs` covering Tier 4 scenarios | None | IN_PROGRESS |
| E2 | Master Test Runner | Create `scripts/run_all_e2e_tests.mjs` aggregating all suites | E1 | PLANNED |
| E3 | Milestone Integration & Verification | Run all suites against database, verify 100% pass | E1, E2, M1, M2, M3 | PLANNED |
| E4 | Publish TEST_READY.md | Write test ready summary artifact and deliver handoff | E3 | PLANNED |
