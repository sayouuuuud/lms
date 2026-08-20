# Orchestration Plan — LMS Upgrade (R1, R2, R3)

## Objective
Deliver complete, high-quality, and verified implementations for:
1. **R1. Exams Edge Cases**:
   - Disconnect handling with automatic resume.
   - Server-side timer calculation (prevent client-side clock tampering).
   - Double submit prevention (locks / idempotency keys).
   - Question snapshotting during attempts to safeguard active/submitted attempts from subsequent teacher edits.
2. **R2. Mastery & Taxonomy**:
   - Hierarchical structure for skills & topics.
   - Skill/Topic linking to lessons, questions, and exams.
   - Assessment algorithm computing mastery scores based on exam results, error repetition, and content completion.
3. **R3. Rescue System & WhatsApp Notifications**:
   - Automated identification of at-risk students (purchased but inactive, recurring failures, dropped out before exam).
   - Rescue queue management & status tracking.
   - WhatsApp notification dispatch with configurable cooldown rules and rate limiting.

## Phases & Execution Strategy
- **Phase 0: Survey & Codebase Investigation**:
  - Spawn 3 parallel Explorers:
    1. Explorer 1: Exams system architecture, existing attempt models, timer, submit flow, and question schema.
    2. Explorer 2: Course structure, lessons, topics, skills/mastery models, and progress tracking.
    3. Explorer 3: Student engagement analytics, notifications/WhatsApp integrations, queueing, and scheduled tasks.
- **Phase 1: Project Architecture & Decomposition**:
  - Synthesize findings into `PROJECT.md` and `TEST_INFRA.md`.
  - Feature Inventory, Interface Contracts, and Milestone Roadmap.
- **Phase 2: Milestone Execution**:
  - Track A: Sub-orchestrators for R1, R2, R3.
  - Track B: E2E Testing Orchestrator for independent verification test suites.
- **Phase 3: Final Verification & Audit**:
  - End-to-end integration tests & verification scripts.
  - Challenger stress-testing & Forensic integrity audit.
- **Phase 4: Handoff & Reporting**:
  - Generate complete verification report and final `handoff.md`.
