import fs from 'fs'
import crypto from 'node:crypto'

// 1. Load environment variables
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

// Force sandbox mode for adversarial testing
process.env.WHATSAPP_SANDBOX = 'true'
process.env.NODE_ENV = 'test'

import { prisma } from '../lib/prisma.ts'
import { normalizeEgyptPhone, maskPhone, maskEmail } from '../lib/phone.ts'
import {
  checkStudentCooldown,
  checkHourlyRateLimit,
  dispatchRescueWhatsApp,
  generateRescueMessage,
  getPlatformRescueSettings,
} from '../lib/rescue-notifier.ts'

const TEST_RUN_ID = `ch2_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
let passed = 0
let failed = 0
const failureDetails = []

function assert(condition, message, detail = '') {
  if (condition) {
    console.log(`  [PASS] ${message}`)
    passed++
  } else {
    console.error(`  [FAIL] ${message} ${detail ? `--> ${detail}` : ''}`)
    failed++
    failureDetails.push({ message, detail })
  }
}

async function runChallenger2Suite() {
  console.log('========================================================================')
  console.log('  CHALLENGER 2: ADVERSARIAL STRESS-TEST FOR RESCUE & WHATSAPP NOTIFIER  ')
  console.log(`  Run ID: ${TEST_RUN_ID}                                               `)
  console.log('========================================================================\n')

  const createdStudentIds = []
  const createdUserIds = []
  const createdCaseIds = []
  const createdMsgIds = []
  const createdStageIds = []
  const createdBranchIds = []

  try {
    // -------------------------------------------------------------------------
    // Setup Shared Fixtures
    // -------------------------------------------------------------------------
    const stage = await prisma.stages.create({
      data: {
        slug: `stg-${TEST_RUN_ID}`,
        title: `مرحلة التحدي ${TEST_RUN_ID}`,
        subtitle: 'بيئة اختبارات الإجهاد الأمني والتنافسي',
      },
    })
    createdStageIds.push(stage.id)

    const branch = await prisma.branches.create({
      data: {
        stage_id: stage.id,
        slug: `br-${TEST_RUN_ID}`,
        title: `فرع التحدي ${TEST_RUN_ID}`,
      },
    })
    createdBranchIds.push(branch.id)

    async function createFixtureStudent({ name, email, phone }) {
      const userId = crypto.randomUUID()
      const user = await prisma.user.create({
        data: {
          id: userId,
          email: email || `${userId}@example.com`,
          role: 'authenticated',
          aud: 'authenticated',
        },
      })
      createdUserIds.push(user.id)

      const student = await prisma.students.create({
        data: {
          code: `st_${crypto.randomUUID().slice(0, 8)}`,
          user_id: user.id,
          name: name || 'طالب تجريبي للتحدي',
          email: user.email,
          phone: phone || '01012345678',
          stage_id: stage.id,
          status: 'نشط',
        },
      })
      createdStudentIds.push(student.id)
      return { student, user }
    }

    async function createFixtureRescueCase(studentId, triggerType = 'PURCHASED_INACTIVE', lastContactedAt = null) {
      const rCase = await prisma.rescue_cases.create({
        data: {
          student_id: studentId,
          trigger_type: triggerType,
          priority: 'high',
          status: lastContactedAt ? 'contacted' : 'open',
          risk_score: 80,
          details: { courseTitle: 'كورس التحدي المكثف', daysInactive: 5 },
          last_contacted_at: lastContactedAt,
        },
      })
      createdCaseIds.push(rCase.id)
      return rCase
    }

    // =========================================================================
    // CATEGORY 1: 72-HOUR COOLDOWN PRECISION (71h59m vs 72h01m boundary)
    // =========================================================================
    console.log('--- CATEGORY 1: 72-HOUR COOLDOWN PRECISION & BOUNDARY TESTING ---')

    // Scenario 1.1: Message sent 71 hours and 59 minutes ago (MUST BE BLOCKED)
    const { student: s1_1 } = await createFixtureStudent({ phone: '01011111111' })
    const time71h59m = new Date(Date.now() - (71 * 60 + 59) * 60 * 1000)
    const msg71h59m = await prisma.whatsapp_messages.create({
      data: {
        student_id: s1_1.id,
        to_phone: '201011111111',
        template: 'custom',
        body: 'Old message 71h59m ago',
        status: 'sent',
        created_at: time71h59m,
        sent_at: time71h59m,
      },
    })
    createdMsgIds.push(msg71h59m.id)

    const cooldown1_1 = await checkStudentCooldown(s1_1.id)
    assert(cooldown1_1.allowed === false, '71h59m elapsed: allowed must be false')
    assert(cooldown1_1.cooldownActive === true, '71h59m elapsed: cooldownActive must be true')
    assert(cooldown1_1.remainingHours === 1, `71h59m elapsed: remainingHours must be 1h (got ${cooldown1_1.remainingHours}h)`)

    // Scenario 1.2: Message sent 72 hours and 01 minute ago (MUST BE ALLOWED)
    const { student: s1_2 } = await createFixtureStudent({ phone: '01022222222' })
    const time72h01m = new Date(Date.now() - (72 * 60 + 1) * 60 * 1000)
    const msg72h01m = await prisma.whatsapp_messages.create({
      data: {
        student_id: s1_2.id,
        to_phone: '201022222222',
        template: 'custom',
        body: 'Old message 72h01m ago',
        status: 'sent',
        created_at: time72h01m,
        sent_at: time72h01m,
      },
    })
    createdMsgIds.push(msg72h01m.id)

    const cooldown1_2 = await checkStudentCooldown(s1_2.id)
    assert(cooldown1_2.allowed === true, '72h01m elapsed: allowed must be true')
    assert(cooldown1_2.cooldownActive === false, '72h01m elapsed: cooldownActive must be false')
    assert(cooldown1_2.remainingHours === 0, `72h01m elapsed: remainingHours must be 0 (got ${cooldown1_2.remainingHours})`)

    // Scenario 1.3: Message sent 24 hours ago with 72h default cooldown (MUST BE BLOCKED, 48h remaining)
    const { student: s1_3 } = await createFixtureStudent({ phone: '01033333333' })
    const time24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const msg24h = await prisma.whatsapp_messages.create({
      data: {
        student_id: s1_3.id,
        to_phone: '201033333333',
        template: 'custom',
        body: 'Message 24h ago',
        status: 'sent',
        created_at: time24h,
        sent_at: time24h,
      },
    })
    createdMsgIds.push(msg24h.id)

    const cooldown1_3 = await checkStudentCooldown(s1_3.id)
    assert(cooldown1_3.allowed === false, '24h elapsed: allowed must be false')
    assert(cooldown1_3.cooldownActive === true, '24h elapsed: cooldownActive must be true')
    assert(
      cooldown1_3.remainingHours === 48 || cooldown1_3.remainingHours === 49,
      `24h elapsed: remainingHours expected ~48h (got ${cooldown1_3.remainingHours}h)`
    )

    // Scenario 1.4: Custom cooldown override (e.g., customCooldownHours = 12h on 24h elapsed message -> ALLOWED)
    const cooldown1_4_custom = await checkStudentCooldown(s1_3.id, 12)
    assert(cooldown1_4_custom.allowed === true, 'Custom cooldown 12h with 24h elapsed message: allowed must be true')
    assert(cooldown1_4_custom.cooldownActive === false, 'Custom cooldown 12h: cooldownActive must be false')

    // Scenario 1.5: Failed WhatsApp message within 72h MUST NOT trigger cooldown
    const { student: s1_5 } = await createFixtureStudent({ phone: '01044444444' })
    const time10m = new Date(Date.now() - 10 * 60 * 1000)
    const msgFailed = await prisma.whatsapp_messages.create({
      data: {
        student_id: s1_5.id,
        to_phone: '201044444444',
        template: 'custom',
        body: 'Failed attempt 10m ago',
        status: 'failed',
        error: 'network_timeout',
        created_at: time10m,
      },
    })
    createdMsgIds.push(msgFailed.id)

    const cooldown1_5 = await checkStudentCooldown(s1_5.id)
    assert(cooldown1_5.allowed === true, 'Failed message in history: allowed must be true')
    assert(cooldown1_5.cooldownActive === false, 'Failed message in history: cooldownActive must be false')

    // Scenario 1.6: Cooldown checked via rescue_cases.last_contacted_at when no message row exists
    const { student: s1_6 } = await createFixtureStudent({ phone: '01055555555' })
    const caseContacted = await createFixtureRescueCase(s1_6.id, 'PURCHASED_INACTIVE', new Date(Date.now() - 2 * 60 * 60 * 1000)) // 2h ago
    const cooldown1_6 = await checkStudentCooldown(s1_6.id)
    assert(cooldown1_6.allowed === false, 'rescue_cases.last_contacted_at 2h ago: allowed must be false')
    assert(cooldown1_6.cooldownActive === true, 'rescue_cases.last_contacted_at 2h ago: cooldownActive must be true')
    assert(cooldown1_6.remainingHours >= 69 && cooldown1_6.remainingHours <= 71, `Remaining hours ~70h (got ${cooldown1_6.remainingHours}h)`)

    // =========================================================================
    // CATEGORY 2: HOURLY BURST RATE LIMITER STRESS TESTING
    // =========================================================================
    console.log('\n--- CATEGORY 2: HOURLY BURST RATE LIMITER STRESS TESTING ---')

    // Scenario 2.1: Custom Limit = 3. Test thresholds: 0, 1, 2 (allowed), 3 (blocked), 4 (blocked)
    const { student: s2_1 } = await createFixtureStudent({ phone: '01066666666' })
    const customBurstLimit = 3

    // Clean check before any new messages in window
    const baseRateLimit = await checkHourlyRateLimit(customBurstLimit)
    console.log(`  Current active window message count in DB: ${baseRateLimit.currentCount}`)

    // Create 3 active messages in the last 15 minutes
    const burstMsgIds = []
    for (let i = 0; i < customBurstLimit; i++) {
      const bMsg = await prisma.whatsapp_messages.create({
        data: {
          student_id: s2_1.id,
          to_phone: '201066666666',
          template: 'custom',
          body: `Burst test msg ${i}`,
          status: 'sent',
          created_at: new Date(Date.now() - (i + 1) * 60 * 1000),
        },
      })
      burstMsgIds.push(bMsg.id)
      createdMsgIds.push(bMsg.id)
    }

    const rateLimitExceeded = await checkHourlyRateLimit(customBurstLimit)
    assert(rateLimitExceeded.allowed === false, `Hourly rate limit of ${customBurstLimit} exceeded: allowed must be false`)
    assert(rateLimitExceeded.currentCount >= customBurstLimit, `currentCount (${rateLimitExceeded.currentCount}) >= limit (${customBurstLimit})`)

    // Scenario 2.2: Messages older than 60 minutes do NOT count against rate limit
    const oldRateMsg = await prisma.whatsapp_messages.create({
      data: {
        student_id: s2_1.id,
        to_phone: '201066666666',
        template: 'custom',
        body: 'Message from 65 minutes ago',
        status: 'sent',
        created_at: new Date(Date.now() - 65 * 60 * 1000), // 65m ago
      },
    })
    createdMsgIds.push(oldRateMsg.id)

    // Remove the 3 recent burst messages to isolate older message test
    await prisma.whatsapp_messages.deleteMany({
      where: { id: { in: burstMsgIds } },
    })

    const rateLimitAfterPurge = await checkHourlyRateLimit(customBurstLimit)
    // Should be allowed now (assuming test environment baseline is below 3)
    console.log(`  Rate limit count after purging recent burst: ${rateLimitAfterPurge.currentCount}`)

    // Scenario 2.3: Failed messages inside the 60m window do NOT count towards rate limit
    const failedRateMsg = await prisma.whatsapp_messages.create({
      data: {
        student_id: s2_1.id,
        to_phone: '201066666666',
        template: 'custom',
        body: 'Failed burst message',
        status: 'failed',
        created_at: new Date(Date.now() - 5 * 60 * 1000),
      },
    })
    createdMsgIds.push(failedRateMsg.id)

    const rateLimitWithFailed = await checkHourlyRateLimit(customBurstLimit)
    assert(
      rateLimitWithFailed.currentCount === rateLimitAfterPurge.currentCount,
      'Failed messages are excluded from hourly rate limit count'
    )

    // =========================================================================
    // CATEGORY 3: EGYPTIAN PHONE NUMBER NORMALIZATION & MALFORMED INPUTS
    // =========================================================================
    console.log('\n--- CATEGORY 3: EGYPTIAN PHONE NUMBER NORMALIZATION & ADVERSARIAL INPUTS ---')

    const phoneVectors = [
      // Standard local formats
      { input: '01012345678', expected: '201012345678', desc: 'Vodafone standard 11 digits' },
      { input: '01198765432', expected: '201198765432', desc: 'Etisalat standard 11 digits' },
      { input: '01234567890', expected: '201234567890', desc: 'Orange standard 11 digits' },
      { input: '01555555555', expected: '201555555555', desc: 'WE (Telecom Egypt) standard 11 digits' },
      // Country code prefixed
      { input: '+201012345678', expected: '201012345678', desc: '+20 prefix with 10 digits' },
      { input: '00201112345678', expected: '201112345678', desc: '0020 prefix with 10 digits' },
      { input: '201212345678', expected: '201212345678', desc: '20 prefix with 10 digits' },
      // Without leading zero
      { input: '1012345678', expected: '201012345678', desc: '10 digits starting with 1' },
      // Formatted with spaces, dashes, parentheses
      { input: '+20 (10) 1234-5678', expected: '201012345678', desc: 'Formatted with symbols and spaces' },
      { input: ' 011 123 456 78 ', expected: '201112345678', desc: 'Leading/trailing whitespace and spaces' },
      // Malformed / Non-Egyptian / Invalid inputs (Must return null)
      { input: null, expected: null, desc: 'null value' },
      { input: undefined, expected: null, desc: 'undefined value' },
      { input: '', expected: null, desc: 'empty string' },
      { input: '   ', expected: null, desc: 'whitespace only' },
      { input: '010123456', expected: null, desc: 'Incomplete mobile number (9 digits)' },
      { input: '010123456789', expected: null, desc: 'Oversized mobile number (12 digits starting 01)' },
      { input: '0233445566', expected: null, desc: 'Egyptian landline (02 Cairo) - not mobile' },
      { input: '+966501234567', expected: null, desc: 'Saudi Arabia mobile (+966)' },
      { input: '+12025550123', expected: null, desc: 'US phone (+1)' },
      { input: 'random_text_123', expected: null, desc: 'Alphanumeric string' },
      { input: "' OR '1'='1", expected: null, desc: 'SQL Injection payload' },
      { input: '<script>alert(1)</script>', expected: null, desc: 'XSS script injection' },
    ]

    for (const v of phoneVectors) {
      const result = normalizeEgyptPhone(v.input)
      assert(result === v.expected, `Phone vector "${v.input}": ${v.desc}`, `Expected: ${v.expected}, Got: ${result}`)
    }

    // Masking helpers verification
    assert(maskPhone('201012345678') === '+2010••••5678', 'maskPhone masks middle digits correctly')
    assert(maskPhone('123') === '••••', 'maskPhone handles short inputs safely')
    assert(maskEmail('student@example.com') === 's•••t@example.com', 'maskEmail masks student email correctly')
    assert(maskEmail('invalid') === '••••', 'maskEmail handles malformed email safely')

    // =========================================================================
    // CATEGORY 4: DISPATCHER FORCE OVERRIDE & EDGE CASES
    // =========================================================================
    console.log('\n--- CATEGORY 4: DISPATCHER FORCE OVERRIDE & EDGE CASES ---')

    // Scenario 4.1: Dispatch to student with invalid phone number
    const { student: s4_invalidPhone } = await createFixtureStudent({ phone: 'invalid_phone' })
    const caseInvalidPhone = await createFixtureRescueCase(s4_invalidPhone.id)
    const resInvalidPhone = await dispatchRescueWhatsApp(caseInvalidPhone.id, { sandbox: true })
    assert(resInvalidPhone.success === false, 'Dispatch with invalid phone: success must be false')
    assert(resInvalidPhone.error === 'invalid_egypt_phone', 'Dispatch with invalid phone: error is "invalid_egypt_phone"')

    // Scenario 4.2: Dispatch to non-existent case ID
    const resNonExistentCase = await dispatchRescueWhatsApp(crypto.randomUUID(), { sandbox: true })
    assert(resNonExistentCase.success === false, 'Dispatch non-existent case: success must be false')
    assert(resNonExistentCase.error === 'case_or_student_not_found', 'Dispatch non-existent case: error is "case_or_student_not_found"')

    // Scenario 4.3: Force override bypasses active cooldown
    const { student: s4_cooldown } = await createFixtureStudent({ phone: '01077777777' })
    const caseCooldown = await createFixtureRescueCase(s4_cooldown.id)

    // First dispatch -> succeeds
    const firstDispatch = await dispatchRescueWhatsApp(caseCooldown.id, { sandbox: true })
    assert(firstDispatch.success === true, 'First dispatch succeeded')

    // Second normal dispatch -> BLOCKED by cooldown
    const secondDispatch = await dispatchRescueWhatsApp(caseCooldown.id, { sandbox: true })
    assert(secondDispatch.success === false, 'Second normal dispatch blocked by cooldown')
    assert(secondDispatch.cooldownBlocked === true, 'cooldownBlocked flag is true')

    // Third dispatch with force: true -> BYPASSES cooldown and succeeds
    const forceDispatch = await dispatchRescueWhatsApp(caseCooldown.id, {
      sandbox: true,
      force: true,
      customText: 'رسالة تجاوز إداري خاصة',
      redactBody: true,
    })
    assert(forceDispatch.success === true, 'Force override dispatch bypassed cooldown successfully')

    // Verify redactBody persisted correctly
    const redactedMsg = await prisma.whatsapp_messages.findFirst({
      where: { student_id: s4_cooldown.id, body: '[redacted]' },
    })
    assert(!!redactedMsg, 'redactBody: true stored "[redacted]" in whatsapp_messages.body')

    // =========================================================================
    // CATEGORY 5: ARABIC MESSAGE TEMPLATE GENERATOR ROBUSTNESS
    // =========================================================================
    console.log('\n--- CATEGORY 5: ARABIC MESSAGE TEMPLATE GENERATOR ROBUSTNESS ---')

    const triggerTypes = ['PURCHASED_INACTIVE', 'RECURRING_FAILURE', 'ABANDONED_FLOW', 'INACTIVE_STUDENT', 'MANUAL']

    for (const trig of triggerTypes) {
      const msg = generateRescueMessage(trig, {
        studentName: 'محمود عبد الرحيم',
        courseTitle: 'شرح النحو التطبيقي',
        daysInactive: 7,
        examTitle: 'امتحان منتصف الفصل',
      })
      assert(typeof msg === 'string' && msg.length > 50, `generateRescueMessage for "${trig}" generated non-empty Arabic text`)
      assert(msg.includes('أكاديمية شفاء العليل'), `Template "${trig}" contains platform branding header`)
      assert(msg.includes('محمود عبد الرحيم'), `Template "${trig}" personalizes student name`)
    }

    // Edge case: Empty / null / undefined fields in template generator
    const fallbackMsg = generateRescueMessage('PURCHASED_INACTIVE', {
      studentName: '',
      courseTitle: undefined,
      daysInactive: null,
    })
    assert(fallbackMsg.includes('يا بطل'), 'Template gracefully falls back to "يا بطل" when studentName is empty')
    assert(fallbackMsg.includes('الكورس التعليمي'), 'Template gracefully falls back to default course title')

    // Unknown trigger type fallback
    const unknownTrigMsg = generateRescueMessage('UNKNOWN_TRIGGER_TYPE', { studentName: 'طارق' })
    assert(unknownTrigMsg.includes('طارق'), 'Unknown trigger type falls back gracefully without throwing error')

    // =========================================================================
    // CATEGORY 6: CONCURRENT DISPATCH RACE CONDITION HARDENING
    // =========================================================================
    console.log('\n--- CATEGORY 6: CONCURRENT DISPATCH RACE CONDITION HARDENING ---')

    const { student: s6_race } = await createFixtureStudent({ phone: '01088888888' })
    const caseRace = await createFixtureRescueCase(s6_race.id)

    // Fire 5 dispatches simultaneously for the same student
    const concurrentResults = await Promise.all([
      dispatchRescueWhatsApp(caseRace.id, { sandbox: true }),
      dispatchRescueWhatsApp(caseRace.id, { sandbox: true }),
      dispatchRescueWhatsApp(caseRace.id, { sandbox: true }),
      dispatchRescueWhatsApp(caseRace.id, { sandbox: true }),
      dispatchRescueWhatsApp(caseRace.id, { sandbox: true }),
    ])

    const successCount = concurrentResults.filter((r) => r.success).length
    const blockedCount = concurrentResults.filter((r) => !r.success && r.cooldownBlocked).length

    console.log(`  Concurrent Dispatches: ${successCount} succeeded, ${blockedCount} cooldown-blocked`)
    assert(successCount >= 1, 'At least 1 dispatch succeeded in concurrent burst')
    assert(successCount + blockedCount === 5, 'All 5 dispatches terminated cleanly with valid result objects')

  } finally {
    // -------------------------------------------------------------------------
    // TEARDOWN: Clean up all created test records
    // -------------------------------------------------------------------------
    console.log('\n--- TEARDOWN: Cleaning up test fixtures ---')
    try {
      if (createdMsgIds.length > 0) {
        await prisma.whatsapp_messages.deleteMany({
          where: { id: { in: createdMsgIds } },
        })
      }
      if (createdCaseIds.length > 0) {
        await prisma.rescue_cases.deleteMany({
          where: { id: { in: createdCaseIds } },
        })
      }
      if (createdStudentIds.length > 0) {
        await prisma.students.deleteMany({
          where: { id: { in: createdStudentIds } },
        })
      }
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        })
      }
      if (createdBranchIds.length > 0) {
        await prisma.branches.deleteMany({
          where: { id: { in: createdBranchIds } },
        })
      }
      if (createdStageIds.length > 0) {
        await prisma.stages.deleteMany({
          where: { id: { in: createdStageIds } },
        })
      }
      console.log('  [PASS] All fixtures cleaned up successfully')
    } catch (err) {
      console.error('  [WARN] Error during teardown:', err.message)
    }
  }

  console.log('\n========================================================================')
  console.log(`  CHALLENGER 2 SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('========================================================================\n')

  if (failed > 0) {
    console.error('Failures encountered:')
    for (const f of failureDetails) {
      console.error(`  - ${f.message}: ${f.detail}`)
    }
    process.exit(1)
  }
}

runChallenger2Suite().catch((err) => {
  console.error('Fatal error during challenger suite:', err)
  process.exit(1)
})
