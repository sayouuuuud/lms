# E2E Test Infrastructure & Runner Analysis

**Project**: LMS Upgrade (R1: Exams Edge Cases, R2: Mastery & Taxonomy, R3: Rescue System & WhatsApp)  
**Author**: Explorer 1 (E2E Testing Track)  
**Date**: 2026-08-20  
**Target Directory**: `d:/Workspace/LMS`  

---

## 1. Executive Summary

This report defines the comprehensive architectural guidelines, conventions, and implementation patterns for standalone end-to-end (E2E) and integration test suites in the LMS Upgrade repository. 

Our empirical investigation of the codebase, Node runtime (v24.12.0 on Windows/PowerShell), Prisma client RLS extensions (`lib/prisma.ts`), raw PostgreSQL client (`pg`), and existing verification scripts (`verify_rls_security.mjs`, `integration_test_server_actions.mjs`, `V01_smoke.mjs`, `test_student_lifecycle.mjs`) establishes the exact rules needed to build robust, deterministic, and self-contained test suites that reliably exit with code `0` on success and non-zero on any assertion or runtime failure.

---

## 2. Environment Configuration & Runtime Strategy

### 2.1 Node Runtime & OS Environment
- **Node Version**: `v24.12.0` (Node 24 LTS).
- **Host OS & Shell**: Windows with PowerShell / cmd.
- **Execution Rule**: Under the project's Windows environment, all CLI invocations must be prefixed with `cmd /c` (e.g., `cmd /c node --env-file=.env scripts/<test_script>.mjs`) to avoid hanging background tasks.

### 2.2 Environment Variable Loading Strategy
The repository relies on a root `.env` file containing critical keys (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`).

To guarantee standalone execution whether invoked directly (`node scripts/test.mjs`), with Node's native flag (`node --env-file=.env scripts/test.mjs`), or via a master runner, every test script **must include the dual-mode environment loader header**:

```javascript
import fs from 'node:fs'

if (typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile() } catch (e) {}
} else if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  }
}
```

---

## 3. Module System & Import Patterns (ESM vs CJS)

### 3.1 File Extension Discipline: `.mjs`
- `package.json` in this repo does not specify `"type": "module"`. Therefore, Node treats standard `.js` files as CommonJS by default.
- **Mandatory Convention**: All test scripts and runners must use the `.mjs` extension (`scripts/*.mjs`).
- `.mjs` allows:
  1. Top-level `await` without requiring immediate IIFE wrapping.
  2. Standard ESM `import` statements.
  3. Seamless interoperability with Node 24 native TypeScript module loading.

### 3.2 Importing Project Modules (`.ts` / `.mjs`)
- Node 24 natively supports importing TypeScript modules with type-stripping (`import { prisma, rawPrisma } from '../lib/prisma.ts'`).
- Note: Node 24 may print a harmless notice `[MODULE_TYPELESS_PACKAGE_JSON]` when resolving `.ts` imports from a typeless `package.json`. To keep output pristine during test runs, scripts can be executed with `node --no-warnings --env-file=.env scripts/<test>.mjs`.
- Always use explicit relative paths with extensions:
  - `import { prisma, rawPrisma, runWithUserContext } from '../lib/prisma.ts'`
  - `import { Client } from 'pg'`
  - `import { normalizeEgyptPhone } from '../lib/phone.ts'`

---

## 4. Database Client Usage & RLS Isolation

The LMS repository features PostgreSQL Row Level Security (RLS) managed dynamically through Prisma and raw PostgreSQL sessions.

### 4.1 Client Selection Matrix
| Client Type | Import Source | Best Use Case in Tests |
|---|---|---|
| **RLS-Scoped Prisma (`prisma`)** | `import { prisma, runWithUserContext } from '../lib/prisma.ts'` | Testing student/admin application queries, server actions, and verifying RLS filtering and update protections. |
| **Superuser Prisma (`rawPrisma`)** | `import { rawPrisma } from '../lib/prisma.ts'` | Test fixture setup/seeding, cross-student data assertions, cleanup/teardown, deleting test records regardless of RLS boundaries. |
| **Raw PostgreSQL Client (`pg.Client`)** | `import { Client } from 'pg'` | Testing raw SQL migrations, table schema constraints, transaction rollback tests (`BEGIN` ... `ROLLBACK`), and advisory locks. |

### 4.2 Pattern: Testing with User Contexts via `runWithUserContext`
`lib/prisma.ts` utilizes Node's `AsyncLocalStorage` (`userContextStorage`) to inject RLS session context into queries and transactions:

```javascript
import { prisma, runWithUserContext } from '../lib/prisma.ts'

// Student context
await runWithUserContext({ id: studentA.user_id, role: 'student' }, async () => {
  const attempts = await prisma.exam_attempts.findMany({ where: { exam_id: examId } })
  // Queries are automatically isolated by RLS to studentA
})

// Admin context
await runWithUserContext({ id: adminProfile.id, role: 'admin' }, async () => {
  const allCases = await prisma.rescue_cases.findMany()
  // Admin sees full queue across all students
})

// Anonymous / Public context
await runWithUserContext({ role: 'anon' }, async () => {
  const courses = await prisma.courses.findMany()
  // Anon sees only published catalog
})
```

### 4.3 Connection Lifecycle & Preventing Hanging Processes
Database connection pools will keep the Node event loop alive indefinitely if not explicitly closed.
**Every test script must ensure connection cleanup in a `finally` block**:

```javascript
try {
  await runTests()
} finally {
  await prisma.$disconnect()
  await rawPrisma.$disconnect()
  // If using pg.Client:
  // await client.end()
}
```

---

## 5. Test Assertion, Logging & Process Exit Codes

### 5.1 Test State & Assertion Helper Pattern
Every test suite must maintain an explicit tally of passed and failed assertions and print structured output:

```javascript
let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`)
    passed++
  } else {
    console.error(`  [FAIL] ${message}`)
    failed++
  }
}

function assertEqual(actual, expected, message) {
  const isMatch = JSON.stringify(actual) === JSON.stringify(expected)
  if (isMatch) {
    console.log(`  [PASS] ${message}`)
    passed++
  } else {
    console.error(`  [FAIL] ${message} -> Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`)
    failed++
  }
}
```

### 5.2 Deterministic Exit Code Protocol
A test suite must:
1. Return **`exit code 0`** if and only if `failed === 0` and all steps completed without uncaught exceptions.
2. Return **`exit code 1`** immediately upon any assertion failure or fatal error.
3. Catch unhandled promise rejections at the entry point.

```javascript
async function main() {
  console.log('================================================================')
  console.log('                 TEST SUITE: <SUITE_NAME>                       ')
  console.log('================================================================\n')

  try {
    // Execute test groups...
  } finally {
    await prisma.$disconnect()
    await rawPrisma.$disconnect()
  }

  console.log('\n================================================================')
  console.log(`   SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal Suite Crash:', err)
  process.exit(1)
})
```

---

## 6. Test Data Isolation, Seeding & Teardown Best Practices

### 6.1 Idempotency & Unique Prefixing
To prevent test runs from colliding with production data or previous failed test runs:
1. Prefix test fixtures with a unique run identifier:
   ```javascript
   const RUN_ID = `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
   ```
2. Clean up before and after:
   ```javascript
   async function cleanup(runId) {
     await rawPrisma.rescue_cases.deleteMany({ where: { notes: { contains: runId } } })
     await rawPrisma.student_skill_mastery.deleteMany({ where: { student_id: testStudentId } })
     await rawPrisma.exam_attempts.deleteMany({ where: { student_id: testStudentId } })
   }
   ```

### 6.2 Transactional Rollback for Pure SQL / In-Memory Tests
For raw SQL query validation where no side effects should persist in the database (e.g. `scripts/V01_smoke.mjs`), use PostgreSQL interactive transactions:
```javascript
await client.query('BEGIN')
try {
  // Perform test operations & assertions...
} finally {
  await client.query('ROLLBACK')
  await client.end()
}
```

---

## 7. Master Test Runner Architecture (`scripts/run_all_e2e_tests.mjs`)

The Master Test Runner aggregates all individual milestone suites (M1, M2, M3) and the cross-cutting integration suite (Tier 4).

### 7.1 Architecture Design
- **Subprocess Spawning**: Executes each test file (`.mjs`) in an isolated Node child process (`node --env-file=.env scripts/<test>.mjs`).
- **Sequential Execution**: Runs suites sequentially to avoid race conditions or database deadlocks during heavy relational mutations.
- **Output Streaming & Aggregation**: Captures stdout/stderr, tracks individual suite exit codes, and prints a final consolidated summary table.
- **Exit Code Propagation**: If any suite returns non-zero, the master runner exits with code `1`.

### 7.2 Target Test Suites Inventory
1. `scripts/test_exam_resume.mjs` (R1: Attempt lifecycle, disconnect resume, draft auto-save)
2. `scripts/test_exam_server_timer.mjs` (R1: Server-side timer enforcement, expiration rejection)
3. `scripts/test_exam_double_submit.mjs` (R1: Double submit lock & idempotency)
4. `scripts/test_exam_snapshot_integrity.mjs` (R1: Question snapshotting immutability)
5. `scripts/test_mastery_map.mjs` (R2: Taxonomy hierarchy, skill linking, mastery math $M_s$)
6. `scripts/test_rescue_system.mjs` (R3: At-risk rule detection, rescue queue, WhatsApp cooldown & sandbox mock)
7. `scripts/test_e2e_full_integration.mjs` (Tier 4: Cross-cutting multi-module end-to-end user journeys)

---

## 8. Summary of Conventions for Test Authors

| Area | Repo Convention | Rationale |
|---|---|---|
| **File Format** | `.mjs` in `scripts/` | Enables top-level await and ESM imports in typeless `package.json`. |
| **Env Loading** | Dual: `process.loadEnvFile()` + `.env` parser | Guarantees test works whether invoked with `--env-file` or directly. |
| **DB for RLS** | `prisma` + `runWithUserContext` | Validates realistic app behavior and security isolation. |
| **DB for Setup/Teardown** | `rawPrisma` | Ensures administrative setup and teardown can touch all records without RLS blocks. |
| **Disconnection** | `prisma.$disconnect()` in `finally` | Prevents hanging Node process and connection pool leaks. |
| **Process Exits** | `process.exit(0)` on pass, `process.exit(1)` on failure | Guarantees CI/CD and Master Runner accurate pass/fail detection. |
| **Command Prefix** | `cmd /c` on Windows | Standardizes child process execution and prevents process hangs. |
