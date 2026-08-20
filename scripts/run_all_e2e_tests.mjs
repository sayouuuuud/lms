#!/usr/bin/env node
/**
 * scripts/run_all_e2e_tests.mjs
 *
 * LMS Upgrade E2E Master Test Runner
 * Orchestrates Tiers 1-4 verification across:
 * - M1 (Exams Edge Cases): Disconnect resume, server timer, double submit, snapshotting
 * - M2 (Mastery & Taxonomy): 3-Tier hierarchy, skill linking, mathematical mastery engine
 * - M3 (Rescue System & WhatsApp): At-risk detection rules, queue lifecycle, cooldown dispatcher
 * - M4 (Full Integration): Multi-module end-to-end student journey and remediation loops
 *
 * Zero external framework dependencies. Built directly on Node.js ESM and pg client.
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import pkg from 'pg'

const { Client } = pkg

// --- ANSI Color Palette & Formatters ---
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
  bgCyan: '\x1b[46m',
}

const c = {
  reset: colors.reset,
  bold: (s) => `${colors.bold}${s}${colors.reset}`,
  dim: (s) => `${colors.dim}${s}${colors.reset}`,
  red: (s) => `${colors.red}${s}${colors.reset}`,
  green: (s) => `${colors.green}${s}${colors.reset}`,
  yellow: (s) => `${colors.yellow}${s}${colors.reset}`,
  blue: (s) => `${colors.blue}${s}${colors.reset}`,
  magenta: (s) => `${colors.magenta}${s}${colors.reset}`,
  cyan: (s) => `${colors.cyan}${s}${colors.reset}`,
  passBadge: () => `\x1b[32m\x1b[1m✓ PASS\x1b[0m`,
  failBadge: () => `\x1b[31m\x1b[1m✗ FAIL\x1b[0m`,
  skipBadge: () => `\x1b[33m\x1b[1m⚠ SKIP\x1b[0m`,
  timeoutBadge: () => `\x1b[35m\x1b[1m⏳ TIMEOUT\x1b[0m`,
}

// --- Test Suite Registry Catalog ---
export const TEST_SUITES = [
  {
    id: 'exam-resume',
    name: 'Exam Attempt Disconnect & Auto-Resume',
    script: 'scripts/test_exam_resume.mjs',
    milestone: 'M1 (Exams)',
    tier: 1,
    tierCategory: 'Tier 1: Core Lifecycle & State Restoration',
    tags: ['r1', 'm1', 'exams', 'resume', 'drafts', 'tier1', 'tier2'],
    timeoutMs: 45000,
    required: true,
  },
  {
    id: 'exam-timer',
    name: 'Server-Side Timer & Expiry Enforcement',
    script: 'scripts/test_exam_server_timer.mjs',
    milestone: 'M1 (Exams)',
    tier: 1,
    tierCategory: 'Tier 1: Server Authoritative Timers',
    tags: ['r1', 'm1', 'exams', 'timer', 'expiry', 'tier1', 'tier2'],
    timeoutMs: 45000,
    required: true,
  },
  {
    id: 'exam-double-submit',
    name: 'Double Submit Concurrency & Idempotency',
    script: 'scripts/test_exam_double_submit.mjs',
    milestone: 'M1 (Exams)',
    tier: 2,
    tierCategory: 'Tier 2: Concurrency & Race Conditions',
    tags: ['r1', 'm1', 'exams', 'double-submit', 'locking', 'idempotency', 'tier2'],
    timeoutMs: 45000,
    required: true,
  },
  {
    id: 'exam-snapshot',
    name: 'Question Snapshot Immutability Integrity',
    script: 'scripts/test_exam_snapshot_integrity.mjs',
    milestone: 'M1 (Exams)',
    tier: 2,
    tierCategory: 'Tier 2: Data Snapshot & Mutation Isolation',
    tags: ['r1', 'm1', 'exams', 'snapshot', 'immutability', 'tier2'],
    timeoutMs: 45000,
    required: true,
  },
  {
    id: 'mastery-map',
    name: 'Taxonomy Tree & Mathematical Mastery Math',
    script: 'scripts/test_mastery_map.mjs',
    milestone: 'M2 (Mastery)',
    tier: 3,
    tierCategory: 'Tier 3: Taxonomy & Mastery Integration',
    tags: ['r2', 'm2', 'mastery', 'taxonomy', 'math', 'tier1', 'tier3'],
    timeoutMs: 60000,
    required: true,
  },
  {
    id: 'rescue-system',
    name: 'At-Risk Detection & WhatsApp Cooldown',
    script: 'scripts/test_rescue_system.mjs',
    milestone: 'M3 (Rescue)',
    tier: 3,
    tierCategory: 'Tier 3: Rescue Queue & Notification Engine',
    tags: ['r3', 'm3', 'rescue', 'whatsapp', 'cooldown', 'rate-limit', 'tier1', 'tier3'],
    timeoutMs: 60000,
    required: true,
  },
  {
    id: 'e2e-integration',
    name: 'Comprehensive Multi-Module Student Journey',
    script: 'scripts/test_e2e_full_integration.mjs',
    milestone: 'M4 (Integration)',
    tier: 4,
    tierCategory: 'Tier 4: Real-World Multi-Module Workloads',
    tags: ['r4', 'm4', 'integration', 'e2e', 'student-journey', 'tier4'],
    timeoutMs: 120000,
    required: true,
  },
]

// --- CLI Arguments Parser ---
export function parseArgs(rawArgs = process.argv.slice(2)) {
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

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i]
    if (arg === '--bail' || arg === '-b') {
      options.bail = true
    } else if (arg === '--strict' || arg === '-c') {
      options.strict = true
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    } else if (arg === '--json' || arg === '-j') {
      options.json = true
    } else if (arg === '--skip-preflight') {
      options.skipPreflight = true
    } else if (arg === '--list' || arg === '-l') {
      options.listOnly = true
    } else if (arg.startsWith('--tier=')) {
      options.tier = arg.split('=')[1].trim()
    } else if (arg === '-t' && rawArgs[i + 1]) {
      options.tier = rawArgs[++i].trim()
    } else if (arg.startsWith('--milestone=')) {
      options.milestone = arg.split('=')[1].trim().toLowerCase()
    } else if (arg === '-m' && rawArgs[i + 1]) {
      options.milestone = rawArgs[++i].trim().toLowerCase()
    } else if (arg.startsWith('--suite=')) {
      options.suite = arg.split('=')[1].trim().toLowerCase()
    } else if (arg === '-s' && rawArgs[i + 1]) {
      options.suite = rawArgs[++i].trim().toLowerCase()
    } else if (arg.startsWith('--timeout=')) {
      options.timeoutOverride = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--report-file=')) {
      options.reportFile = arg.split('=')[1].trim()
    }
  }

  return options
}

// --- Environment Variables & Preflight Routine ---
export function loadEnvironment() {
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
}

export async function preflightCheck() {
  loadEnvironment()

  const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!dbUrl) {
    return {
      ok: false,
      error: 'DATABASE_URL or DIRECT_URL is missing in process.env / .env',
      database: null,
    }
  }

  const maskedUrl = dbUrl.replace(/:\/\/(.*?):(.*?)@/, '://$1:****@')

  const client = new Client({
    connectionString: dbUrl,
    connectionTimeoutMillis: 5000,
  })

  try {
    await client.connect()
    const res = await client.query('SELECT 1 AS alive, current_database() AS db')
    await client.end()

    if (!res.rows || res.rows.length === 0) {
      return {
        ok: false,
        error: 'Database ping returned empty query response.',
        database: maskedUrl,
      }
    }

    return {
      ok: true,
      database: maskedUrl,
      dbName: res.rows[0]?.db || 'postgres',
    }
  } catch (err) {
    return {
      ok: false,
      error: `PostgreSQL connection failed: ${err.message}`,
      database: maskedUrl,
    }
  }
}

// --- Assertion Metrics Extraction Parser ---
export function parseAssertionMetrics(stdout) {
  if (!stdout || typeof stdout !== 'string') {
    return { passed: 0, failed: 0, total: 0 }
  }

  let passed = 0
  let failed = 0

  // Pattern 1: Explicit Results / Summary line across various script formats
  // e.g. "RESULTS: 12 PASSED, 0 FAILED", "VERIFICATION COMPLETE: 28 passed, 0 failed", "TIER 4 INTEGRATION SUITE RESULTS: 24 PASSED, 0 FAILED"
  const summaryMatch = stdout.match(/(?:RESULTS|VERIFICATION COMPLETE|COMPLETE|SUMMARY)[^\n\r]*?:\s*(\d+)\s+passed[,\s]+(\d+)\s+failed/i)
  if (summaryMatch) {
    passed = parseInt(summaryMatch[1], 10)
    failed = parseInt(summaryMatch[2], 10)
    return { passed, failed, total: passed + failed }
  }

  // Pattern 2: Line-by-line markers
  const lines = stdout.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (
      trimmed.startsWith('[PASS]') ||
      trimmed.startsWith('✓') ||
      trimmed.startsWith('✔') ||
      (trimmed.startsWith('✅') && !trimmed.includes('VERIFICATION COMPLETE'))
    ) {
      passed++
    } else if (
      trimmed.startsWith('[FAIL]') ||
      trimmed.startsWith('✗') ||
      trimmed.startsWith('✘') ||
      trimmed.startsWith('❌') ||
      trimmed.includes('AssertionError')
    ) {
      failed++
    }
  }

  return { passed, failed, total: passed + failed }
}

// --- Subprocess Test Suite Execution ---
export function runSuite(suite, options = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const scriptFullPath = path.resolve(process.cwd(), suite.script)

    // Check script file availability on disk
    if (!fs.existsSync(scriptFullPath)) {
      const durationMs = Date.now() - startTime
      if (options.strict) {
        return resolve({
          id: suite.id,
          name: suite.name,
          script: suite.script,
          milestone: suite.milestone,
          tier: suite.tier,
          status: 'FAILED',
          exitCode: 1,
          durationMs,
          assertions: { passed: 0, failed: 1, total: 1 },
          error: `Missing required test script: ${suite.script} (Strict mode active)`,
          stdout: '',
          stderr: '',
        })
      }

      return resolve({
        id: suite.id,
        name: suite.name,
        script: suite.script,
        milestone: suite.milestone,
        tier: suite.tier,
        status: 'SKIPPED',
        exitCode: 0,
        durationMs,
        assertions: { passed: 0, failed: 0, total: 0 },
        error: `File not found on disk: ${suite.script} (Pending implementation)`,
        stdout: '',
        stderr: '',
      })
    }

    const timeoutLimit = options.timeoutOverride || suite.timeoutMs || 45000
    const childEnv = {
      ...process.env,
      NODE_ENV: 'test',
      MOCK_WHATSAPP: 'true',
      WHATSAPP_SANDBOX: 'true',
      FORCE_COLOR: '1',
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

    // Timeout Watchdog
    const timer = setTimeout(() => {
      isTimedOut = true
      child.kill('SIGTERM')
      setTimeout(() => {
        try {
          child.kill('SIGKILL')
        } catch (e) {}
      }, 3000)
    }, timeoutLimit)

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString('utf8')
      stdoutData += text
      if (options.verbose) {
        process.stdout.write(text)
      }
    })

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf8')
      stderrData += text
      if (options.verbose) {
        process.stderr.write(text)
      }
    })

    child.on('close', (code, signal) => {
      clearTimeout(timer)
      const durationMs = Date.now() - startTime
      let assertions = parseAssertionMetrics(stdoutData)

      // Fallback assertion count if script produced zero recognized markers
      if (assertions.total === 0) {
        if (code === 0) {
          assertions = { passed: 1, failed: 0, total: 1 }
        } else {
          assertions = { passed: 0, failed: 1, total: 1 }
        }
      }

      if (isTimedOut) {
        resolve({
          id: suite.id,
          name: suite.name,
          script: suite.script,
          milestone: suite.milestone,
          tier: suite.tier,
          status: 'TIMED_OUT',
          exitCode: code ?? 124,
          durationMs,
          assertions,
          error: `Test suite execution timed out after ${(timeoutLimit / 1000).toFixed(1)}s`,
          stdout: stdoutData,
          stderr: stderrData,
        })
      } else if (code === 0 && assertions.failed === 0) {
        resolve({
          id: suite.id,
          name: suite.name,
          script: suite.script,
          milestone: suite.milestone,
          tier: suite.tier,
          status: 'PASSED',
          exitCode: 0,
          durationMs,
          assertions,
          stdout: stdoutData,
          stderr: stderrData,
        })
      } else {
        resolve({
          id: suite.id,
          name: suite.name,
          script: suite.script,
          milestone: suite.milestone,
          tier: suite.tier,
          status: 'FAILED',
          exitCode: code ?? 1,
          durationMs,
          assertions,
          error: `Process exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`,
          stdout: stdoutData,
          stderr: stderrData,
        })
      }
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({
        id: suite.id,
        name: suite.name,
        script: suite.script,
        milestone: suite.milestone,
        tier: suite.tier,
        status: 'FAILED',
        exitCode: 1,
        durationMs: Date.now() - startTime,
        assertions: { passed: 0, failed: 1, total: 1 },
        error: `Failed to spawn process: ${err.message}`,
        stdout: stdoutData,
        stderr: stderrData,
      })
    })
  })
}

// --- Main Runner Entry Point ---
export async function main() {
  const options = parseArgs()

  // 1. List Suites and Exit
  if (options.listOnly) {
    console.log(c.bold('\nRegistered LMS Upgrade E2E Test Suites Catalog:'))
    console.table(
      TEST_SUITES.map((s) => ({
        ID: s.id,
        Milestone: s.milestone,
        Tier: `Tier ${s.tier}`,
        Script: s.script,
        Timeout: `${s.timeoutMs / 1000}s`,
      }))
    )
    process.exit(0)
  }

  console.log('='.repeat(100))
  console.log(c.bold('                LMS UPGRADE E2E MASTER TEST RUNNER & VERIFICATION SUITE'))
  console.log('='.repeat(100))

  // 2. Pre-flight Environment & Database Ping
  if (!options.skipPreflight) {
    process.stdout.write('  Performing Pre-flight Database Reachability Check... ')
    const preflight = await preflightCheck()
    if (!preflight.ok) {
      console.log(c.red('FAILED ✗'))
      console.error(c.red(`\n  ✗ Pre-flight Error: ${preflight.error}`))
      console.error(c.dim('  Please ensure PostgreSQL is accessible or pass --skip-preflight to bypass.\n'))
      process.exit(2)
    }
    console.log(`${c.green('OK ✓')} ${c.dim(`(${preflight.database})`)}`)
  } else {
    console.log(c.yellow('  Pre-flight database reachability check skipped via --skip-preflight.'))
  }

  // 3. Filter Suites
  let selectedSuites = [...TEST_SUITES]

  if (options.tier && options.tier.toLowerCase() !== 'all') {
    const tierNum = parseInt(options.tier, 10)
    selectedSuites = selectedSuites.filter((s) => s.tier === tierNum)
  }

  if (options.milestone && options.milestone !== 'all') {
    const target = options.milestone.toLowerCase()
    selectedSuites = selectedSuites.filter(
      (s) =>
        s.milestone.toLowerCase().includes(target) ||
        s.tags.some((tag) => tag.toLowerCase() === target)
    )
  }

  if (options.suite) {
    const target = options.suite.toLowerCase()
    selectedSuites = selectedSuites.filter(
      (s) =>
        s.id.toLowerCase().includes(target) ||
        s.name.toLowerCase().includes(target) ||
        s.script.toLowerCase().includes(target)
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

  // 4. Sequential Execution Loop
  for (let i = 0; i < selectedSuites.length; i++) {
    const suite = selectedSuites[i]
    process.stdout.write(`  [${i + 1}/${selectedSuites.length}] Running ${c.bold(suite.name)}... `)

    const res = await runSuite(suite, options)
    results.push(res)
    totalPassedAsserts += res.assertions.passed
    totalFailedAsserts += res.assertions.failed

    if (res.status === 'PASSED') {
      console.log(
        `${c.passBadge()} ${c.dim(
          `(${(res.durationMs / 1000).toFixed(2)}s, ${res.assertions.passed} assertions)`
        )}`
      )
    } else if (res.status === 'SKIPPED') {
      console.log(`${c.skipBadge()} ${c.yellow(`(${res.error})`)}`)
    } else if (res.status === 'TIMED_OUT') {
      console.log(
        `${c.timeoutBadge()} ${c.red(
          `(Timed out after ${(res.durationMs / 1000).toFixed(1)}s)`
        )}`
      )
    } else {
      console.log(`${c.failBadge()} ${c.red(`(Failed with exit code ${res.exitCode})`)}`)
      if (!options.verbose && res.stderr) {
        const errorSnippet = res.stderr
          .split('\n')
          .filter((l) => l.trim().length > 0)
          .slice(0, 5)
          .join('\n    ')
        if (errorSnippet) {
          console.error(c.dim(`    ${errorSnippet}`))
        }
      }
    }

    if (options.bail && (res.status === 'FAILED' || res.status === 'TIMED_OUT')) {
      console.log(c.red('\n  --bail flag active: Aborting remaining test execution.'))
      break
    }
  }

  const globalElapsedMs = Date.now() - globalStart

  // 5. ANSI Execution Summary Dashboard
  console.log('\n' + '─'.repeat(100))
  console.log(c.bold('                               E2E EXECUTION SUMMARY DASHBOARD'))
  console.log('─'.repeat(100))

  for (const r of results) {
    const badge =
      r.status === 'PASSED'
        ? c.green('✓ PASS')
        : r.status === 'SKIPPED'
        ? c.yellow('⚠ SKIP')
        : r.status === 'TIMED_OUT'
        ? c.magenta('⏳ TIME')
        : c.red('✗ FAIL')

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
    `  Total Suites: ${c.bold(totalSuites)} | Passed: ${c.green(passedSuites)} | Failed: ${
      failedSuites > 0 ? c.red(failedSuites) : '0'
    } | Skipped: ${c.yellow(skippedSuites)}`
  )
  console.log(
    `  Total Assertions: ${c.bold(totalPassedAsserts + totalFailedAsserts)} (${c.green(
      totalPassedAsserts + ' Passed'
    )}, ${totalFailedAsserts > 0 ? c.red(totalFailedAsserts + ' Failed') : '0 Failed'})`
  )
  console.log(`  Total Elapsed Time: ${c.bold((globalElapsedMs / 1000).toFixed(2) + 's')}`)

  // 6. JSON Reporting
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
      console.log(c.dim(`\n  Structured JSON report written to: ${options.reportFile}`))
    }

    if (options.json) {
      console.log('\n' + JSON.stringify(reportData, null, 2))
    }
  }

  // 7. Exit Code Propagation
  if (failedSuites > 0 || (options.strict && skippedSuites > 0)) {
    console.log(c.red('\n  💥 VERIFICATION FAILED — One or more suites encountered errors or missing files.\n'))
    process.exit(1)
  } else {
    console.log(c.green('\n  🎉 ALL E2E VERIFICATION SUITES COMPLETED SUCCESSFULLY (Exit Code 0)\n'))
    process.exit(0)
  }
}

// Execute main if invoked as entrypoint
if (
  process.argv[1] &&
  (path.resolve(process.argv[1]) === path.resolve(import.meta.filename || '') ||
    process.argv[1].endsWith('run_all_e2e_tests.mjs'))
) {
  main().catch((err) => {
    console.error('Fatal Test Runner Error:', err)
    process.exit(1)
  })
}
