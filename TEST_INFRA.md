# E2E Test Infra: LMS Upgrade (R1, R2, R3)

## Test Philosophy
- **Opaque-box & Requirement-driven**: Tests derive strictly from user requirements in `ORIGINAL_REQUEST.md`.
- **Systematic Multi-tier Validation**: Category-Partition + Boundary Value Analysis + Pairwise Interactions + Real-World Workloads + White-box Adversarial Hardening.
- **Independent Test Execution**: All tests execute via standalone Node/ESM runners against the database and server actions/services.

## Feature Inventory
| # | Feature | Requirement Source | Tier 1 | Tier 2 | Tier 3 |
|---|---------|-------------------|:------:|:------:|:------:|
| 1 | Exam Attempt Auto-Resume on Disconnect | R1 Exams Edge Cases | 5 | 5 | ✓ |
| 2 | Server-Side Timer Enforcement | R1 Exams Edge Cases | 5 | 5 | ✓ |
| 3 | Double Submit Idempotency & Locking | R1 Exams Edge Cases | 5 | 5 | ✓ |
| 4 | Question Snapshotting Immutability | R1 Exams Edge Cases | 5 | 5 | ✓ |
| 5 | Taxonomy Tree Hierarchy (Domain->Topic->Skill) | R2 Mastery & Taxonomy | 5 | 5 | ✓ |
| 6 | Multi-Entity Skill Linking | R2 Mastery & Taxonomy | 5 | 5 | ✓ |
| 7 | Mathematical Mastery Score Calculation ($M_s$) | R2 Mastery & Taxonomy | 5 | 5 | ✓ |
| 8 | Mastery Integration with Exam Submissions | R2 Mastery & Taxonomy | 5 | 5 | ✓ |
| 9 | At-Risk Student Detection Engine | R3 Rescue System | 5 | 5 | ✓ |
| 10 | Rescue Queue Management & Status Tracking | R3 Rescue System | 5 | 5 | ✓ |
| 11 | WhatsApp Notification Cooldown (72h limit) | R3 Rescue System | 5 | 5 | ✓ |
| 12 | WhatsApp Rate Limiter & Sandbox Mock Mode | R3 Rescue System | 5 | 5 | ✓ |

## Test Architecture
- **Master Test Runner**: `scripts/run_all_e2e_tests.mjs`
  - Runs all test tiers sequentially.
  - Returns exit code 0 on 100% pass, non-zero on any failure.
- **Target Test Suites**:
  1. `scripts/test_exam_resume.mjs` — Disconnect simulation, draft preservation, state resume.
  2. `scripts/test_exam_server_timer.mjs` — Server-side clock calculation, rejection after expiry, tamper resistance.
  3. `scripts/test_exam_double_submit.mjs` — Concurrent submit requests, race condition resilience, idempotency.
  4. `scripts/test_exam_snapshot_integrity.mjs` — Question modification/deletion isolation from active/submitted attempts.
  5. `scripts/test_mastery_map.mjs` — Taxonomy creation, linking, mock attempts, dynamic mastery recalculation.
  6. `scripts/test_rescue_system.mjs` — Risk detection rules, rescue queue lifecycle, WhatsApp cooldown compliance, sandbox dispatcher.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Student network drop during high-stakes exam | F1, F2, F4, F6 | High |
| 2 | Teacher updates question text/options while 20 students are actively solving | F4, F1, F3 | High |
| 3 | Student solves 3 exams across multiple skills and watches remediation lessons | F5, F6, F7, F8 | High |
| 4 | Inactive student enrolled in course gets flagged, queued, and notified via WhatsApp with 72h cooldown | F9, F10, F11, F12 | Medium |
| 5 | Recurring failure student triggers rescue case, admin resolves case, cooldown prevents spam | F7, F9, F10, F11, F12 | High |
| 6 | End-to-end Student Journey: Enrollment -> Quiz -> Failure -> Mastery Drop -> Rescue Queue -> WhatsApp Alert -> Resume -> Mastery Recovery | All Features (F1-F12) | Very High |

## Coverage Thresholds
- Tier 1: ≥5 test cases per feature (Total ≥ 60 test cases)
- Tier 2: ≥5 boundary/edge test cases per feature (Total ≥ 60 test cases)
- Tier 3: Pairwise interaction test cases across R1, R2, R3 (Total ≥ 12 test cases)
- Tier 4: ≥6 realistic end-to-end application scenarios
- Tier 5: Adversarial white-box stress testing and coverage verification
