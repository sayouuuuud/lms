# Master Test Runner Architecture & Specification (`scripts/run_all_e2e_tests.mjs`)
**Track:** E2E Testing Track | **Explorer:** e2e_explorer_3 | **Date:** 2026-08-20

---

## 1. Executive Summary & Design Goals

The **Master Test Runner** (`scripts/run_all_e2e_tests.mjs`) is the central orchestration engine for verifying the entire **LMS Upgrade** project across all three core milestone requirements:
- **R1 (Exams Edge Cases)**: Disconnect resume, server-enforced countdown timer, atomic double-submit idempotency, question snapshot immutability.
- **R2 (Mastery & Taxonomy)**: 3-tier taxonomy tree, multi-entity skill linking, mathematical mastery engine ($M_s$), exam/lesson integration.
- **R3 (Rescue System & WhatsApp)**: At-risk detection rules, rescue queue lifecycle, WhatsApp dispatcher with 72-hour cooldown and sandbox mode.
- **R4 / Tier 4 (Full Integration)**: Multi-module student journey, remediation loops, teacher edits during live exam, and end-to-end telemetry.

### Key Architectural Tenets
1. **Zero External Test Framework Dependency**: Runs directly on Node.js (ESM, `node:child_process`, `node:fs`, `node:path`, `node:process`) without requiring Jest, Mocha, or Vitest configurations, ensuring 100% portability in CI/CD, local dev, and serverless/Docker containers.
2. **Deterministic Process Isolation**: Each test suite executes in a freshly spawned Node subprocess (`child_process.spawn`), preventing shared in-memory state pollution, unhandled rejection bleed, or Prisma connection pool deadlocks.
3. **Multi-Tier Orchestration (Tiers 1–4 + Tier 5)**: Supports running all suites sequentially or filtering by specific tier (`--tier=1..4`), milestone (`--milestone=r1..r3`), or suite name (`--suite=<pattern>`).
4. **Pre-flight Health & Environment Verification**: Validates database reachability (`pg`/`DATABASE_URL`) and environment readiness before executing expensive test suites, failing early with clear diagnostics.
5. **Graceful Missing-Suite Handling**: Intelligently differentiates between missing scripts in active development (`SKIPPED`) vs strict CI enforcement (`FAILED`).
6. **Rich Visual Reporting & Exit Code Propagation**: Features high-visibility ANSI console output, live progress tracking, per-suite timing, assertion counters, and strict binary exit codes (`0` for 100% pass, `1` on failure, `2` on pre-flight error).

---

## 2. Target Test Suite Inventory & Orchestration Matrix

The runner manages a declarative catalog of all milestone verification scripts:

| Suite ID | Target Script Path | Requirement Milestone | Test Tier | Default Timeout | Focus & Verification Scope |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `exam-resume` | `scripts/test_exam_resume.mjs` | M1 (R1 Exams) | Tier 1 / 2 | 45s | Attempt disconnect simulation, draft auto-save preservation, resume state restoration. |
| `exam-timer` | `scripts/test_exam_server_timer.mjs` | M1 (R1 Exams) | Tier 1 / 2 | 45s | Server-authoritative countdown calculation, submission rejection after expiry, client clock tamper resistance. |
| `exam-double-submit` | `scripts/test_exam_double_submit.mjs` | M1 (R1 Exams) | Tier 1 / 2 | 45s | Atomic row locking, concurrent submit race conditions, idempotent submission responses. |
| `exam-snapshot` | `scripts/test_exam_snapshot_integrity.mjs` | M1 (R1 Exams) | Tier 1 / 2 | 45s | Question bank snapshot immutability when questions are updated or deleted mid-attempt. |
| `mastery-map` | `scripts/test_mastery_map.mjs` | M2 (R2 Mastery) | Tier 1 / 3 | 60s | Domain $\to$ Topic $\to$ Skill hierarchy, skill linking, mathematical mastery recalculation ($M_s$). |
| `rescue-system` | `scripts/test_rescue_system.mjs` | M3 (R3 Rescue) | Tier 1 / 3 | 60s | Risk detection heuristics, rescue queue transitions, 72h cooldown enforcement, WhatsApp sandbox dispatcher. |
| `e2e-integration` | `scripts/test_e2e_full_integration.mjs` | M4 (Full Journey) | Tier 4 | 120s | Full cross-module lifecycle: Enrollment $\to$ Exam $\to$ Failure $\to$ Mastery Drop $\to$ Rescue $\to$ WhatsApp $\to$ Resume $\to$ Mastery Recovery. |

### Suite Registry Specification (Code Data Structure)
```javascript
export const TEST_SUITES = [
  {
    id: 'exam-resume',
    name: 'Exam Attempt Disconnect & Auto-Resume Suite',
    script: 'scripts/test_exam_resume.mjs',
    milestone: 'M1 (Exams)',
    tier: 1,
    tierCategory: 'Tier 1: Core Lifecycle & State Restoration',
    tags: ['r1', 'exams', 'resume', 'drafts', 'tier1', 'tier2'],
    timeoutMs: 45000,
    required: true,
  },
  {
    id: 'exam-timer',
    name: 'Server-Side Timer & Expiration Enforcement Suite',
    script: 'scripts/test_exam_server_timer.mjs',
    milestone: 'M1 (Exams)',
    tier: 1,
    tierCategory: 'Tier 1: Server Authoritative Timers',
    tags: ['r1', 'exams', 'timer', 'expiry', 'tier1', 'tier2'],
    timeoutMs: 45000,
    required: true,
  },
  {
    id: 'exam-double-submit',
    name: 'Double Submit Concurrency & Idempotency Suite',
    script: 'scripts/test_exam_double_submit.mjs',
    milestone: 'M1 (Exams)',
    tier: 2,
    tierCategory: 'Tier 2: Concurrency & Race Conditions',
    tags: ['r1', 'exams', 'double-submit', 'locking', 'idempotency', 'tier2'],
    timeoutMs: 45000,
    required: true,
  },
  {
    id: 'exam-snapshot',
    name: 'Question Snapshot Immutability Suite',
    script: 'scripts/test_exam_snapshot_integrity.mjs',
    milestone: 'M1 (Exams)',
    tier: 2,
    tierCategory: 'Tier 2: Data Snapshot & Mutation Isolation',
    tags: ['r1', 'exams', 'snapshot', 'immutability', 'tier2'],
    timeoutMs: 45000,
    required: true,
  },
  {
    id: 'mastery-map',
    name: 'Taxonomy Hierarchy & Mathematical Mastery Engine Suite',
    script: 'scripts/test_mastery_map.mjs',
    milestone: 'M2 (Mastery)',
    tier: 3,
    tierCategory: 'Tier 3: Taxonomy & Mastery Integration',
    tags: ['r2', 'mastery', 'taxonomy', 'math', 'tier1', 'tier3'],
    timeoutMs: 60000,
    required: true,
  },
  {
    id: 'rescue-system',
    name: 'At-Risk Detection & WhatsApp Cooldown Suite',
    script: 'scripts/test_rescue_system.mjs',
    milestone: 'M3 (Rescue)',
    tier: 3,
    tierCategory: 'Tier 3: Rescue Queue & Notification Engine',
    tags: ['r3', 'rescue', 'whatsapp', 'cooldown', 'rate-limit', 'tier1', 'tier3'],
    timeoutMs: 60000,
    required: true,
  },
  {
    id: 'e2e-integration',
    name: 'Comprehensive Multi-Module End-to-End Integration Suite',
    script: 'scripts/test_e2e_full_integration.mjs',
    milestone: 'M4 (Integration)',
    tier: 4,
    tierCategory: 'Tier 4: Real-World Multi-Module Workloads',
    tags: ['r4', 'integration', 'e2e', 'student-journey', 'tier4'],
    timeoutMs: 120000,
    required: true,
  },
]
```

---

## 3. Subprocess Execution & Process Lifecycle Architecture

```
                               +----------------------------------+
                               |     scripts/run_all_e2e_tests    |
                               +----------------------------------+
                                                 |
                                     1. Pre-flight Checks
                                     - Database Ping (pg / SELECT 1)
                                     - Environment Variables (.env)
                                     - Set MOCK_WHATSAPP=true
                                                 |
                                     2. Filter & Plan Suites
                                     - By Tier (--tier)
                                     - By Milestone (--milestone)
                                     - By Suite Name (--suite)
                                                 |
                       +-------------------------+-------------------------+
                       |                                                   |
             [Sequential Execution Loop]                                   |
                       |                                                   |
           +-----------v-----------+                                       |
           | Check File Existence  |                                       |
           +-----------+-----------+                                       |
              /                 \                                          |
        (Not Found)           (Found)                                      |
            /                     \                                        |
+---------------------+   +---------------------------------------+        |
| Handle Missing:     |   | Spawn Subprocess:                     |        |
| - If CI: FAIL       |   | - process.execPath (node)             |        |
| - If Dev: SKIP (warn|   | - timeout controller (Abort/SIGTERM)  |        |
+---------------------+   | - stdio streaming & line parser       |        |
                          +-------------------+-------------------+        |
                                              |                            |
                                  +-----------v-----------+                |
                                  | Process Exit / Close  |                |
                                  | - Code 0: PASS        |                |
                                  | - Code != 0: FAIL     |                |
                                  | - Exceeded: TIMEOUT   |                |
                                  +-----------+-----------+                |
                                              |                            |
                                  +-----------v-----------+                |
                                  | Parse Assertions & Log|                |
                                  +-----------+-----------+                |
                                              |                            |
                                     (Next Suite in Queue)                 |
                                              |                            |
                       +----------------------v----------------------------+
                       |
             3. Generate Final Report
             - ASCII Summary Table with Color Badges
             - Aggregate Counts (Passed / Failed / Skipped)
             - Total Elapsed Time
                       |
             4. Exit Code Propagation
             - Exit 0: All passed (100%)
             - Exit 1: Any suite failed / timed out / missing in CI
             - Exit 2: Pre-flight failure
```

### 3.1 Why `child_process.spawn` Over `child_process.exec`
1. **Buffer Limit Immunity**: `child_process.exec` buffers the entire stdout/stderr into a fixed-size Node.js memory buffer (default 1MB). Large test suites printing SQL traces or JSON outputs can crash with `ERR_CHILD_PROCESS_STDIO_MAXBUFFER`. `child_process.spawn` uses stream piping with unbounded capacity.
2. **Real-Time Log Interception**: `spawn` emits `'data'` events immediately, allowing real-time prefixing, streaming, or selective buffering.
3. **Accurate Process Lifecycle Control**: `spawn` provides direct access to the child `ChildProcess` object, enabling deterministic `SIGTERM` / `SIGKILL` timeout management.

### 3.2 Subprocess Invocation Specification
```javascript
import { spawn } from 'node:child_process'
import path from 'node:path'

export function executeSuite(suiteConfig, globalOptions = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const scriptFullPath = path.resolve(process.cwd(), suiteConfig.script)

    const childEnv = {
      ...process.env,
      NODE_ENV: 'test',
      MOCK_WHATSAPP: 'true',       // Ensure mock WhatsApp dispatcher
      FORCE_COLOR: '1',            // Retain ANSI color codes in output
      CI_TEST_RUNNER: 'true',
    }

    const child = spawn(process.execPath, [scriptFullPath], {
      cwd: process.cwd(),
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdoutData = ''
    let stderrData = ''
    let isTimedOut = false

    // Configurable timeout mechanism
    const timeoutDuration = globalOptions.timeoutOverride || suiteConfig.timeoutMs || 45000
    const timer = setTimeout(() => {
      isTimedOut = true
      // Send SIGTERM, followed by SIGKILL if child is unresponsive
      child.kill('SIGTERM')
      setTimeout(() => {
        try { child.kill('SIGKILL') } catch (e) {}
      }, 3000)
    }, timeoutDuration)

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString('utf8')
      stdoutData += text
      if (globalOptions.verbose) {
        process.stdout.write(text)
      }
    })

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf8')
      stderrData += text
      if (globalOptions.verbose) {
        process.stderr.write(text)
      }
    })

    child.on('close', (code, signal) => {
      clearTimeout(timer)
      const durationMs = Date.now() - startTime

      // Parse assertions from stdout
      const assertions = parseAssertionMetrics(stdoutData)

      if (isTimedOut) {
        resolve({
          id: suiteConfig.id,
          name: suiteConfig.name,
          script: suiteConfig.script,
          milestone: suiteConfig.milestone,
          tier: suiteConfig.tier,
          status: 'TIMED_OUT',
          exitCode: code ?? 124,
          durationMs,
          assertions,
          stdout: stdoutData,
          stderr: stderrData,
          error: `Execution timed out after ${timeoutDuration / 1000}s`,
        })
      } else if (code === 0) {
        resolve({
          id: suiteConfig.id,
          name: suiteConfig.name,
          script: suiteConfig.script,
          milestone: suiteConfig.milestone,
          tier: suiteConfig.tier,
          status: 'PASSED',
          exitCode: 0,
          durationMs,
          assertions,
          stdout: stdoutData,
          stderr: stderrData,
        })
      } else {
        resolve({
          id: suiteConfig.id,
          name: suiteConfig.name,
          script: suiteConfig.script,
          milestone: suiteConfig.milestone,
          tier: suiteConfig.tier,
          status: 'FAILED',
          exitCode: code ?? 1,
          durationMs,
          assertions,
          stdout: stdoutData,
          stderr: stderrData,
          error: `Process exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`,
        })
      }
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({
        id: suiteConfig.id,
        name: suiteConfig.name,
        script: suiteConfig.script,
        milestone: suiteConfig.milestone,
        tier: suiteConfig.tier,
        status: 'FAILED',
        exitCode: 1,
        durationMs: Date.now() - startTime,
        assertions: { passed: 0, failed: 1, total: 1 },
        stdout: stdoutData,
        stderr: stderrData,
        error: `Failed to spawn process: ${err.message}`,
      })
    })
  })
}
```

---

## 4. Assertion & Output Parsing Engine

Individual test scripts output test results using standard assertion logging:
- `[PASS] <description>` or `✓ <description>`
- `[FAIL] <description>` or `✗ <description>`
- `VERIFICATION RESULTS: X PASSED, Y FAILED` or `LIFECYCLE RESULTS: X PASSED, Y FAILED`

The master runner incorporates a robust regex parser to extract structured assertion metrics from each suite's stdout:

```javascript
export function parseAssertionMetrics(stdout) {
  let passed = 0
  let failed = 0

  // Pattern 1: Explicit Summary line (e.g. "RESULTS: 12 PASSED, 0 FAILED")
  const summaryMatch = stdout.match(/RESULTS:\s*(\d+)\s+PASSED,\s*(\d+)\s+FAILED/i)
  if (summaryMatch) {
    passed = parseInt(summaryMatch[1], 10)
    failed = parseInt(summaryMatch[2], 10)
    return { passed, failed, total: passed + failed }
  }

  // Pattern 2: Line-by-line markers
  const lines = stdout.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('[PASS]') || trimmed.startsWith('✓')) {
      passed++
    } else if (trimmed.startsWith('[FAIL]') || trimmed.startsWith('✗') || trimmed.startsWith('AssertionError')) {
      failed++
    }
  }

  return { passed, failed, total: passed + failed }
}
```

---

## 5. Pre-flight Checks & Environment Validation

To prevent misleading test failures caused by misconfigured environments or disconnected databases, the runner executes an automated pre-flight routine:

```javascript
import pkg from 'pg'
import fs from 'node:fs'

const { Client } = pkg

export async function runPreflightChecks(options = {}) {
  const issues = []

  // 1. Environment file loading
  if (typeof process.loadEnvFile === 'function') {
    try { process.loadEnvFile() } catch (e) {}
  } else if (fs.existsSync('.env')) {
    for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i !== -1 && !process.env[t.slice(0, i).trim()]) {
        process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
      }
    }
  }

  // 2. Database Connection String Verification
  const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!dbUrl) {
    issues.push('DATABASE_URL or DIRECT_URL is missing in process.env / .env')
    return { ok: false, issues }
  }

  // 3. Database Ping (5-second timeout)
  const client = new Client({
    connectionString: dbUrl,
    connectionTimeoutMillis: 5000,
  })

  try {
    await client.connect()
    const res = await client.query('SELECT 1 AS alive, current_database() AS db')
    await client.end()
    if (!res.rows || res.rows.length === 0) {
      issues.push('Database query returned empty response')
    }
  } catch (err) {
    issues.push(`PostgreSQL connection failed: ${err.message}`)
  }

  return {
    ok: issues.length === 0,
    issues,
    database: dbUrl.replace(/:[^:@]+@/, ':****@'), // masked url
  }
}
```

---

## 6. Visual Console Reporting & ANSI Color Styling

The Master Test Runner implements a lightweight, zero-dependency ANSI formatting library:

### 6.1 ANSI Palette Definition
```javascript
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
}

const c = {
  pass: (text) => `${colors.green}${colors.bold}✓ PASS${colors.reset} ${text}`,
  fail: (text) => `${colors.red}${colors.bold}✗ FAIL${colors.reset} ${text}`,
  skip: (text) => `${colors.yellow}${colors.bold}⚠ SKIP${colors.reset} ${text}`,
  timeout: (text) => `${colors.magenta}${colors.bold}⏳ TIMEOUT${colors.reset} ${text}`,
  cyan: (text) => `${colors.cyan}${text}${colors.reset}`,
  bold: (text) => `${colors.bold}${text}${colors.reset}`,
  dim: (text) => `${colors.dim}${text}${colors.reset}`,
}
```

### 6.2 Master Summary Dashboard Blueprint
```
========================================================================================================
                                 LMS UPGRADE E2E MASTER TEST RUNNER
                                   Execution Mode: Sequential
========================================================================================================
  Environment: Node.js v24.0.0 | OS: win32 | DB: postgresql://postgres:****@localhost:5432/lms
  Pre-flight:  ✓ Database Ping & Schema Verification OK

┌─────────────────┬────────┬────────────────────────────────────────────┬──────────┬──────────┬──────────┐
│ Milestone       │ Tier   │ Test Suite Name                            │ Duration │ Asserts  │ Status   │
├─────────────────┼────────┼────────────────────────────────────────────┼──────────┼──────────┼──────────┤
│ M1 (Exams)      │ Tier 1 │ Exam Attempt Disconnect & Auto-Resume      │   1.35s  │   5/5    │  ✓ PASS  │
│ M1 (Exams)      │ Tier 1 │ Server-Side Timer & Expiry Enforcement     │   1.78s  │   5/5    │  ✓ PASS  │
│ M1 (Exams)      │ Tier 2 │ Double Submit Concurrency & Idempotency    │   2.10s  │   5/5    │  ✓ PASS  │
│ M1 (Exams)      │ Tier 2 │ Question Snapshot Immutability             │   1.45s  │   5/5    │  ✓ PASS  │
│ M2 (Mastery)    │ Tier 3 │ Taxonomy Tree & Mathematical Mastery Math  │   3.20s  │   8/8    │  ✓ PASS  │
│ M3 (Rescue)     │ Tier 3 │ At-Risk Detection & WhatsApp Cooldown      │   2.65s  │   6/6    │  ✓ PASS  │
│ M4 (Integration)│ Tier 4 │ Full Multi-Module Student Journey E2E      │   7.80s  │  12/12   │  ✓ PASS  │
└─────────────────┴────────┴────────────────────────────────────────────┴──────────┴──────────┴──────────┘

========================================================================================================
  TOTAL SUITES: 7 | PASSED: 7 | FAILED: 0 | SKIPPED: 0 | TIMED OUT: 0
  TOTAL ASSERTIONS: 46 (46 Passed, 0 Failed)
  TOTAL DURATION: 20.33s
  OVERALL STATUS: 🎉 ALL E2E VERIFICATION SUITES PASSED (Exit Code 0)
========================================================================================================
```

---

## 7. Command-Line Interface (CLI) Specification

The master runner provides flexible command-line flags to support diverse development, CI/CD, and debugging workflows:

| CLI Option | Alias | Description | Example Usage |
| :--- | :---: | :--- | :--- |
| `--tier=<1..4\|all>` | `-t` | Filter execution to a single test tier. | `node scripts/run_all_e2e_tests.mjs --tier=4` |
| `--milestone=<r1..r4\|all>`| `-m` | Filter execution to a specific milestone. | `node scripts/run_all_e2e_tests.mjs --milestone=r1` |
| `--suite=<name>` | `-s` | Run a specific test suite matching substring/regex. | `node scripts/run_all_e2e_tests.mjs --suite=resume` |
| `--bail` | `-b` | Abort test runner immediately upon the first suite failure. | `node scripts/run_all_e2e_tests.mjs --bail` |
| `--strict` | `-c` | CI Mode: Fail if any registered test suite script is missing on disk. | `node scripts/run_all_e2e_tests.mjs --strict` |
| `--verbose` | `-v` | Stream live child process stdout/stderr directly to terminal. | `node scripts/run_all_e2e_tests.mjs --verbose` |
| `--json` | `-j` | Output the complete execution report as structured JSON. | `node scripts/run_all_e2e_tests.mjs --json` |
| `--report-file=<path>` | | Save JSON execution summary to designated file path. | `node scripts/run_all_e2e_tests.mjs --report-file=report.json` |
| `--timeout=<ms>` | | Override default per-suite timeout limit in milliseconds. | `node scripts/run_all_e2e_tests.mjs --timeout=60000` |
| `--skip-preflight` | | Bypass pre-flight database reachability check. | `node scripts/run_all_e2e_tests.mjs --skip-preflight` |
| `--list` | `-l` | Display all registered test suites and exit without executing. | `node scripts/run_all_e2e_tests.mjs --list` |

---

## 8. Graceful Handling of Work-in-Progress & Missing Suites

During multi-agent development tracks, individual milestone test scripts might still be under active authoring by peer implementers. The runner implements resilient handling:

```javascript
import fs from 'node:fs'

export function checkSuiteAvailability(suite, isStrictMode) {
  const exists = fs.existsSync(suite.script)
  if (exists) {
    return { available: true }
  }

  if (isStrictMode) {
    return {
      available: false,
      status: 'FAILED',
      reason: `Required test suite script not found: ${suite.script} (Strict/CI Mode Enabled)`,
      shouldFailRun: true,
    }
  }

  return {
    available: false,
    status: 'SKIPPED',
    reason: `Test suite script not found on disk: ${suite.script} (Pending Milestone Implementation)`,
    shouldFailRun: false,
  }
}
```

---

## 9. Complete Proposed Reference Code Structure (`scripts/run_all_e2e_tests.mjs`)

Below is the complete reference implementation design for the Master Test Runner:

```javascript
#!/usr/bin/env node
/**
 * scripts/run_all_e2e_tests.mjs
 *
 * LMS Upgrade E2E Master Test Runner
 * Orchestrates Tiers 1-4 verification across M1 (Exams), M2 (Mastery), M3 (Rescue), and M4 (Full Integration).
 *
 * Zero external dependencies. Uses Node.js built-in modules.
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import pkg from 'pg'

const { Client } = pkg

// --- ANSI Colors ---
const c = {
  reset: '\x1b[0m',
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  magenta: (s) => `\x1b[35m${s}\x1b[0m`,
  passBadge: () => `\x1b[32m\x1b[1m✓ PASS\x1b[0m`,
  failBadge: () => `\x1b[31m\x1b[1m✗ FAIL\x1b[0m`,
  skipBadge: () => `\x1b[33m\x1b[1m⚠ SKIP\x1b[0m`,
  timeoutBadge: () => `\x1b[35m\x1b[1m⏳ TIMEOUT\x1b[0m`,
}

// --- Test Suite Catalog ---
export const TEST_SUITES = [
  {
    id: 'exam-resume',
    name: 'Exam Attempt Disconnect & Auto-Resume',
    script: 'scripts/test_exam_resume.mjs',
    milestone: 'M1 (Exams)',
    tier: 1,
    tags: ['r1', 'exams', 'resume', 'drafts', 'tier1', 'tier2'],
    timeoutMs: 45000,
  },
  {
    id: 'exam-timer',
    name: 'Server-Side Timer & Expiration Enforcement',
    script: 'scripts/test_exam_server_timer.mjs',
    milestone: 'M1 (Exams)',
    tier: 1,
    tags: ['r1', 'exams', 'timer', 'expiry', 'tier1', 'tier2'],
    timeoutMs: 45000,
  },
  {
    id: 'exam-double-submit',
    name: 'Double Submit Concurrency & Idempotency',
    script: 'scripts/test_exam_double_submit.mjs',
    milestone: 'M1 (Exams)',
    tier: 2,
    tags: ['r1', 'exams', 'double-submit', 'locking', 'idempotency', 'tier2'],
    timeoutMs: 45000,
  },
  {
    id: 'exam-snapshot',
    name: 'Question Snapshot Immutability Integrity',
    script: 'scripts/test_exam_snapshot_integrity.mjs',
    milestone: 'M1 (Exams)',
    tier: 2,
    tags: ['r1', 'exams', 'snapshot', 'immutability', 'tier2'],
    timeoutMs: 45000,
  },
  {
    id: 'mastery-map',
    name: 'Taxonomy Hierarchy & Mathematical Mastery Engine',
    script: 'scripts/test_mastery_map.mjs',
    milestone: 'M2 (Mastery)',
    tier: 3,
    tags: ['r2', 'mastery', 'taxonomy', 'math', 'tier1', 'tier3'],
    timeoutMs: 60000,
  },
  {
    id: 'rescue-system',
    name: 'At-Risk Detection & WhatsApp Cooldown Dispatcher',
    script: 'scripts/test_rescue_system.mjs',
    milestone: 'M3 (Rescue)',
    tier: 3,
    tags: ['r3', 'rescue', 'whatsapp', 'cooldown', 'rate-limit', 'tier1', 'tier3'],
    timeoutMs: 60000,
  },
  {
    id: 'e2e-integration',
    name: 'Comprehensive Multi-Module End-to-End Journey',
    script: 'scripts/test_e2e_full_integration.mjs',
    milestone: 'M4 (Integration)',
    tier: 4,
    tags: ['r4', 'integration', 'e2e', 'student-journey', 'tier4'],
    timeoutMs: 120000,
  },
]

// --- CLI Argument Parser ---
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    tier: null,
    milestone: null,
    suite: null,
    bail: false,
    strict: false,
    verbose: false,
    json: false,
    reportFile: null,
    timeoutOverride: null,
    skipPreflight: false,
    listOnly: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--bail' || arg === '-b') options.bail = true
    else if (arg === '--strict' || arg === '-c') options.strict = true
    else if (arg === '--verbose' || arg === '-v') options.verbose = true
    else if (arg === '--json' || arg === '-j') options.json = true
    else if (arg === '--skip-preflight') options.skipPreflight = true
    else if (arg === '--list' || arg === '-l') options.listOnly = true
    else if (arg.startsWith('--tier=')) options.tier = arg.split('=')[1].trim()
    else if (arg === '-t' && args[i + 1]) options.tier = args[++i].trim()
    else if (arg.startsWith('--milestone=')) options.milestone = arg.split('=')[1].trim().toLowerCase()
    else if (arg === '-m' && args[i + 1]) options.milestone = args[++i].trim().toLowerCase()
    else if (arg.startsWith('--suite=')) options.suite = arg.split('=')[1].trim().toLowerCase()
    else if (arg === '-s' && args[i + 1]) options.suite = args[++i].trim().toLowerCase()
    else if (arg.startsWith('--timeout=')) options.timeoutOverride = parseInt(arg.split('=')[1], 10)
    else if (arg.startsWith('--report-file=')) options.reportFile = arg.split('=')[1].trim()
  }

  return options
}

// --- Pre-flight Database Ping ---
async function preflightCheck() {
  if (typeof process.loadEnvFile === 'function') {
    try { process.loadEnvFile() } catch (e) {}
  } else if (fs.existsSync('.env')) {
    for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const idx = t.indexOf('=')
      if (idx !== -1 && !process.env[t.slice(0, idx).trim()]) {
        process.env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim()
      }
    }
  }

  const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!dbUrl) {
    return { ok: false, error: 'DATABASE_URL or DIRECT_URL not configured in environment.' }
  }

  try {
    const client = new Client({ connectionString: dbUrl, connectionTimeoutMillis: 5000 })
    await client.connect()
    await client.query('SELECT 1')
    await client.end()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: `PostgreSQL connection failed: ${err.message}` }
  }
}

// --- Parse Assertions from Stdout ---
function parseAssertionMetrics(stdout) {
  let passed = 0
  let failed = 0

  const summaryMatch = stdout.match(/RESULTS:\s*(\d+)\s+PASSED,\s*(\d+)\s+FAILED/i)
  if (summaryMatch) {
    passed = parseInt(summaryMatch[1], 10)
    failed = parseInt(summaryMatch[2], 10)
    return { passed, failed, total: passed + failed }
  }

  const lines = stdout.split('\n')
  for (const line of lines) {
    const t = line.trim()
    if (t.startsWith('[PASS]') || t.startsWith('✓')) passed++
    else if (t.startsWith('[FAIL]') || t.startsWith('✗') || t.includes('AssertionError')) failed++
  }

  return { passed, failed, total: passed + failed }
}

// --- Run Subprocess Suite ---
function runSuite(suite, options) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const scriptPath = path.resolve(process.cwd(), suite.script)

    if (!fs.existsSync(scriptPath)) {
      const durationMs = Date.now() - startTime
      if (options.strict) {
        return resolve({
          ...suite,
          status: 'FAILED',
          exitCode: 1,
          durationMs,
          assertions: { passed: 0, failed: 1, total: 1 },
          error: `Missing required test script: ${suite.script} (Strict mode enabled)`,
          stdout: '',
          stderr: '',
        })
      }
      return resolve({
        ...suite,
        status: 'SKIPPED',
        exitCode: 0,
        durationMs,
        assertions: { passed: 0, failed: 0, total: 0 },
        error: `File not found: ${suite.script} (Pending implementation)`,
        stdout: '',
        stderr: '',
      })
    }

    const timeoutLimit = options.timeoutOverride || suite.timeoutMs || 45000
    const childEnv = {
      ...process.env,
      NODE_ENV: 'test',
      MOCK_WHATSAPP: 'true',
      FORCE_COLOR: '1',
    }

    const child = spawn(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let isTimedOut = false

    const timer = setTimeout(() => {
      isTimedOut = true
      child.kill('SIGTERM')
      setTimeout(() => {
        try { child.kill('SIGKILL') } catch (e) {}
      }, 3000)
    }, timeoutLimit)

    child.stdout.on('data', (d) => {
      const s = d.toString('utf8')
      stdout += s
      if (options.verbose) process.stdout.write(s)
    })

    child.stderr.on('data', (d) => {
      const s = d.toString('utf8')
      stderr += s
      if (options.verbose) process.stderr.write(s)
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      const durationMs = Date.now() - startTime
      const assertions = parseAssertionMetrics(stdout)

      if (isTimedOut) {
        resolve({
          ...suite,
          status: 'TIMED_OUT',
          exitCode: code ?? 124,
          durationMs,
          assertions,
          error: `Test exceeded timeout of ${timeoutLimit / 1000}s`,
          stdout,
          stderr,
        })
      } else if (code === 0 && assertions.failed === 0) {
        resolve({
          ...suite,
          status: 'PASSED',
          exitCode: 0,
          durationMs,
          assertions,
          stdout,
          stderr,
        })
      } else {
        resolve({
          ...suite,
          status: 'FAILED',
          exitCode: code || 1,
          durationMs,
          assertions,
          error: `Process exited with code ${code}`,
          stdout,
          stderr,
        })
      }
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({
        ...suite,
        status: 'FAILED',
        exitCode: 1,
        durationMs: Date.now() - startTime,
        assertions: { passed: 0, failed: 1, total: 1 },
        error: `Failed to spawn: ${err.message}`,
        stdout,
        stderr,
      })
    })
  })
}

// --- Main Execution Flow ---
export async function main() {
  const options = parseArgs()

  if (options.listOnly) {
    console.log(c.bold('\nRegistered LMS Upgrade E2E Test Suites:'))
    console.table(TEST_SUITES.map((s) => ({
      ID: s.id,
      Milestone: s.milestone,
      Tier: `Tier ${s.tier}`,
      Script: s.script,
      Timeout: `${s.timeoutMs / 1000}s`,
    })))
    process.exit(0)
  }

  console.log('='.repeat(100))
  console.log(c.bold('                LMS UPGRADE E2E MASTER TEST RUNNER & VERIFICATION SUITE'))
  console.log('='.repeat(100))

  // 1. Pre-flight Check
  if (!options.skipPreflight) {
    process.stdout.write('  Performing Pre-flight Database Reachability Check... ')
    const preflight = await preflightCheck()
    if (!preflight.ok) {
      console.log(c.red('FAILED'))
      console.error(c.red(`  ✗ Pre-flight error: ${preflight.error}`))
      console.error(c.dim('  Use --skip-preflight to bypass if testing offline/mocks.\n'))
      process.exit(2)
    }
    console.log(c.green('OK ✓'))
  }

  // 2. Filter Suites
  let selectedSuites = [...TEST_SUITES]

  if (options.tier && options.tier.toLowerCase() !== 'all') {
    const tierNum = parseInt(options.tier, 10)
    selectedSuites = selectedSuites.filter((s) => s.tier === tierNum)
  }

  if (options.milestone && options.milestone !== 'all') {
    selectedSuites = selectedSuites.filter(
      (s) => s.milestone.toLowerCase().includes(options.milestone) || s.tags.includes(options.milestone)
    )
  }

  if (options.suite) {
    selectedSuites = selectedSuites.filter(
      (s) => s.id.includes(options.suite) || s.name.toLowerCase().includes(options.suite)
    )
  }

  if (selectedSuites.length === 0) {
    console.log(c.yellow('\n⚠ No test suites matched the specified filters.'))
    process.exit(0)
  }

  console.log(c.dim(`\n  Executing ${selectedSuites.length} test suite(s) sequentially...\n`))

  const results = []
  let totalPassedAsserts = 0
  let totalFailedAsserts = 0
  const globalStart = Date.now()

  // 3. Execution Loop
  for (let i = 0; i < selectedSuites.length; i++) {
    const suite = selectedSuites[i]
    process.stdout.write(`  [${i + 1}/${selectedSuites.length}] Running ${c.bold(suite.name)}... `)

    const res = await runSuite(suite, options)
    results.push(res)
    totalPassedAsserts += res.assertions.passed
    totalFailedAsserts += res.assertions.failed

    if (res.status === 'PASSED') {
      console.log(`${c.passBadge()} ${c.dim(`(${(res.durationMs / 1000).toFixed(2)}s, ${res.assertions.passed} assertions)`)}`)
    } else if (res.status === 'SKIPPED') {
      console.log(`${c.skipBadge()} ${c.yellow(`(Skipped: ${res.error})`)}`)
    } else if (res.status === 'TIMED_OUT') {
      console.log(`${c.timeoutBadge()} ${c.red(`(Timed out after ${(res.durationMs / 1000).toFixed(1)}s)`)}`)
    } else {
      console.log(`${c.failBadge()} ${c.red(`(Failed with exit code ${res.exitCode})`)}`)
      if (!options.verbose && res.stderr) {
        console.error(c.dim('    ' + res.stderr.split('\n').slice(0, 5).join('\n    ')))
      }
    }

    if (options.bail && (res.status === 'FAILED' || res.status === 'TIMED_OUT')) {
      console.log(c.red('\n  --bail flag active: Aborting remaining test execution.'))
      break
    }
  }

  const globalElapsedMs = Date.now() - globalStart

  // 4. Summary Table
  console.log('\n' + '─'.repeat(100))
  console.log(c.bold('                               E2E EXECUTION SUMMARY DASHBOARD'))
  console.log('─'.repeat(100))

  for (const r of results) {
    const badge =
      r.status === 'PASSED' ? c.green('✓ PASS') :
      r.status === 'SKIPPED' ? c.yellow('⚠ SKIP') :
      r.status === 'TIMED_OUT' ? c.magenta('⏳ TIME') : c.red('✗ FAIL')

    const msStr = `${(r.durationMs / 1000).toFixed(2)}s`.padStart(7)
    const assertStr = `${r.assertions.passed}/${r.assertions.total}`.padStart(7)
    const tierStr = `Tier ${r.tier}`.padEnd(7)
    const mileStr = r.milestone.padEnd(16)
    const nameStr = r.name.padEnd(42).slice(0, 42)

    console.log(`  ${badge}  | ${mileStr} | ${tierStr} | ${nameStr} | ${msStr} | ${assertStr}`)
  }

  console.log('─'.repeat(100))

  const totalSuites = results.length
  const passedSuites = results.filter((r) => r.status === 'PASSED').length
  const failedSuites = results.filter((r) => r.status === 'FAILED' || r.status === 'TIMED_OUT').length
  const skippedSuites = results.filter((r) => r.status === 'SKIPPED').length

  console.log(
    `  Total Suites: ${c.bold(totalSuites)} | Passed: ${c.green(passedSuites)} | Failed: ${failedSuites > 0 ? c.red(failedSuites) : '0'} | Skipped: ${c.yellow(skippedSuites)}`
  )
  console.log(
    `  Total Assertions: ${c.bold(totalPassedAsserts + totalFailedAsserts)} (${c.green(totalPassedAsserts + ' Passed')}, ${totalFailedAsserts > 0 ? c.red(totalFailedAsserts + ' Failed') : '0 Failed'})`
  )
  console.log(`  Total Elapsed Time: ${c.bold((globalElapsedMs / 1000).toFixed(2) + 's')}`)

  // JSON Reporting
  if (options.reportFile || options.json) {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSuites,
        passedSuites,
        failedSuites,
        skippedSuites,
        totalPassedAsserts,
        totalFailedAsserts,
        elapsedSeconds: globalElapsedMs / 1000,
        allPassed: failedSuites === 0 && (options.strict ? skippedSuites === 0 : true),
      },
      suites: results,
    }
    if (options.reportFile) {
      fs.writeFileSync(options.reportFile, JSON.stringify(reportData, null, 2), 'utf8')
      console.log(c.dim(`\n  Report written to: ${options.reportFile}`))
    }
    if (options.json) {
      console.log('\n' + JSON.stringify(reportData, null, 2))
    }
  }

  // Final Exit Code
  if (failedSuites > 0 || (options.strict && skippedSuites > 0)) {
    console.log(c.red('\n  💥 VERIFICATION FAILED — One or more suites encountered errors.\n'))
    process.exit(1)
  } else {
    console.log(c.green('\n  🎉 ALL E2E VERIFICATION SUITES COMPLETED SUCCESSFULLY (Exit Code 0)\n'))
    process.exit(0)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename || '')) {
  main().catch((err) => {
    console.error('Fatal Test Runner Error:', err)
    process.exit(1)
  })
}
```

---

## 10. Verification & Test Plan

To verify that the Master Test Runner behaves properly under all real-world conditions:

1. **Clean Happy Path Verification**:
   - Run `node scripts/run_all_e2e_tests.mjs` against live test suites.
   - Verify exit code `0`, summary dashboard printed, assertions tallied.
2. **Failure Propagation Verification**:
   - Inject an intentional failure into a dummy suite or assert.
   - Verify runner catches the failure, marks suite as `✗ FAIL`, prints the error trace, and exits with code `1`.
3. **Timeout Handling Verification**:
   - Run with a low timeout `--timeout=1000` against an asynchronous delay test.
   - Verify runner aborts the child process, tags it as `⏳ TIMEOUT`, logs timeout error, and exits with code `1`.
4. **Missing Suite & Strict Mode Verification**:
   - Reference a nonexistent script.
   - Without `--strict`: verify suite is tagged `⚠ SKIP` and runner completes.
   - With `--strict`: verify runner fails with code `1`.
5. **Pre-flight Error Verification**:
   - Provide an invalid database host.
   - Verify runner terminates early at pre-flight stage with exit code `2` without launching test subprocesses.
