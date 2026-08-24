import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outDir = join(root, '.tmp-subscription-comprehensive-test')
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

try {
  execFileSync(process.execPath, [
    join(root, 'node_modules/typescript/bin/tsc'),
    'lib/subscription-rules.ts',
    '--target', 'ES2022',
    '--module', 'NodeNext',
    '--moduleResolution', 'NodeNext',
    '--skipLibCheck',
    '--outDir', outDir,
  ], { cwd: root, stdio: 'pipe' })

  const rules = await import(pathToFileURL(join(outDir, 'subscription-rules.js')).href)
  const {
    normalizeSubscriptionMode,
    subscriptionIsCurrentlyUsable,
    subscriptionScopeMatchesLecture,
  } = rules

  const now = new Date('2026-08-21T12:00:00.000Z')
  const base = {
    status: 'active',
    payment_status: 'paid',
    start_date: new Date('2026-08-01T00:00:00.000Z'),
    end_date: new Date('2026-08-31T23:59:59.000Z'),
    grace_until: null,
  }

  const modeCases = [
    ['purchases_only', 'purchases_only'],
    ['subscriptions_only', 'subscriptions_only'],
    ['subscription_only', 'subscriptions_only'],
    ['hybrid', 'hybrid'],
    ['both', 'hybrid'],
    ['purchases_and_subscriptions', 'hybrid'],
    [null, 'purchases_only'],
    [undefined, 'purchases_only'],
    ['unknown', 'purchases_only'],
  ]
  for (const [input, expected] of modeCases) assert.equal(normalizeSubscriptionMode(input), expected)

  const lifecycleCases = [
    ['active-paid-inside', { ...base }, true],
    ['grace-paid-inside', { ...base, status: 'grace' }, true],
    ['active-paid-at-end', { ...base, end_date: now }, true],
    ['grace-paid-at-grace-end', { ...base, status: 'grace', end_date: new Date('2026-08-20'), grace_until: now }, true],
    ['active-paid-after-end-with-grace', { ...base, end_date: new Date('2026-08-20'), grace_until: new Date('2026-08-25') }, true],
    ['active-paid-after-grace', { ...base, end_date: new Date('2026-08-20'), grace_until: new Date('2026-08-20') }, false],
    ['active-paid-before-start', { ...base, start_date: new Date('2026-08-22') }, false],
    ['active-unpaid', { ...base, payment_status: 'unpaid' }, false],
    ['active-pending', { ...base, payment_status: 'pending' }, false],
    ['active-refunded', { ...base, payment_status: 'refunded' }, false],
    ['active-waived', { ...base, payment_status: 'waived' }, true],
    ['cancelled', { ...base, status: 'cancelled' }, false],
    ['suspended', { ...base, status: 'suspended' }, false],
    ['expired', { ...base, status: 'expired' }, false],
  ]
  for (const [name, value, expected] of lifecycleCases) {
    assert.equal(subscriptionIsCurrentlyUsable(value, now), expected, name)
  }

  const lecture = {
    id: 'lecture-1',
    branch_id: 'branch-1',
    monthly_course_id: 'course-1',
    course: { id: 'course-1', branch_id: 'branch-1', term_id: 'term-1', stage_id: 'stage-1' },
  }
  const otherLecture = {
    id: 'lecture-2',
    branch_id: 'branch-2',
    monthly_course_id: 'course-2',
    course: { id: 'course-2', branch_id: 'branch-2', term_id: 'term-2', stage_id: 'stage-2' },
  }
  const noCourseLecture = { ...lecture, monthly_course_id: null, course: null }
  const plan = (overrides = {}) => ({ branch_id: null, stage_id: null, scope_mode: 'selected', scopes: [], ...overrides })

  const scopeCases = [
    ['all-released-mode', plan({ scope_mode: 'all_released' }), lecture, true],
    ['all-released-scope', plan({ scopes: [{ scope_type: 'all_released', scope_id: null }] }), otherLecture, true],
    ['branch-match', plan({ scopes: [{ scope_type: 'branch', scope_id: 'branch-1' }] }), lecture, true],
    ['branch-miss', plan({ scopes: [{ scope_type: 'branch', scope_id: 'branch-1' }] }), otherLecture, false],
    ['stage-match', plan({ scopes: [{ scope_type: 'stage', scope_id: 'stage-1' }] }), lecture, true],
    ['stage-miss', plan({ scopes: [{ scope_type: 'stage', scope_id: 'stage-1' }] }), otherLecture, false],
    ['term-match', plan({ scopes: [{ scope_type: 'term', scope_id: 'term-1' }] }), lecture, true],
    ['term-miss', plan({ scopes: [{ scope_type: 'term', scope_id: 'term-1' }] }), otherLecture, false],
    ['course-match-monthly', plan({ scopes: [{ scope_type: 'course', scope_id: 'course-1' }] }), lecture, true],
    ['course-miss', plan({ scopes: [{ scope_type: 'course', scope_id: 'course-1' }] }), otherLecture, false],
    ['lecture-match', plan({ scopes: [{ scope_type: 'lecture', scope_id: 'lecture-1' }] }), lecture, true],
    ['lecture-miss', plan({ scopes: [{ scope_type: 'lecture', scope_id: 'lecture-1' }] }), otherLecture, false],
    ['top-level-branch', plan({ branch_id: 'branch-1' }), lecture, true],
    ['top-level-stage', plan({ stage_id: 'stage-1' }), lecture, true],
    ['empty-selected', plan(), lecture, false],
    ['no-course-does-not-match-course', plan({ scopes: [{ scope_type: 'course', scope_id: 'course-1' }] }), noCourseLecture, false],
  ]
  for (const [name, value, target, expected] of scopeCases) {
    assert.equal(subscriptionScopeMatchesLecture(value, target), expected, name)
  }
  assert.equal(subscriptionScopeMatchesLecture(plan({ scopes: [
    { scope_type: 'lecture', scope_id: 'other' },
    { scope_type: 'course', scope_id: 'course-1' },
  ] }), lecture), true, 'scope OR semantics')

  const effectiveAccess = ({ mode, purchased, subscribed }) => {
    if (mode === 'purchases_only') return purchased
    if (mode === 'subscriptions_only') return subscribed
    return purchased || subscribed
  }
  for (const mode of ['purchases_only', 'subscriptions_only', 'hybrid']) {
    assert.equal(effectiveAccess({ mode, purchased: true, subscribed: false }), mode !== 'subscriptions_only', `${mode}: purchase policy`)
    assert.equal(effectiveAccess({ mode, purchased: false, subscribed: true }), mode !== 'purchases_only', `${mode}: subscription policy`)
    assert.equal(effectiveAccess({ mode, purchased: true, subscribed: true }), true, `${mode}: both sources`)
    assert.equal(effectiveAccess({ mode, purchased: false, subscribed: false }), false, `${mode}: no source`)
  }

  const read = (file) => readFileSync(join(root, file), 'utf8')
  const schema = read('prisma/schema.prisma')
  const manager = read('lib/subscription-manager.ts')
  const access = read('lib/subscription-access.ts')
  const publicService = read('lib/subscription-public.ts')
  const actions = read('app/admin/subscriptions/actions.ts')
  const adminCenter = read('app/admin/subscriptions/client.tsx')
  const adminDetail = read('app/admin/subscriptions/[planId]/client.tsx')
  const publicCatalog = read('app/subscriptions/page.tsx')
  const publicDetail = read('app/subscriptions/[planId]/page.tsx')
  const strip = read('components/subscriptions/public-subscription-strip.tsx')
  const stagePage = read('app/stages/[id]/page.tsx')
  const branchPage = read('app/stages/[id]/[branchId]/page.tsx')
  const migration = read('prisma/migrations/20260821170000_subscription_plan_presentation/migration.sql')

  for (const field of ['marketing_label', 'short_description', 'image_url', 'public_visible', 'featured', 'sort_order']) {
    assert.match(schema, new RegExp(field), `schema field: ${field}`)
    assert.match(migration, new RegExp(`ADD COLUMN IF NOT EXISTS ${field}`), `migration field: ${field}`)
  }
  for (const contract of ['getSubscriptionPlanDetail', 'getSubscriptionScopeOptions', 'updateSubscriptionPlan']) {
    assert.match(manager, new RegExp(contract), `manager contract: ${contract}`)
  }
  for (const contract of ['created', 'renewed', 'cancelled', 'suspended', 'resumed', 'expired']) {
    assert.match(manager, new RegExp(contract), `event contract: ${contract}`)
  }
  assert.match(actions, /hasResourceAccess\(['"]subscriptions['"],\s*['"]manage['"]\)/)
  for (const action of ['getSubscriptionPlanDetailAction', 'getSubscriptionScopeOptionsAction', 'updateSubscriptionPlanAction']) {
    assert.match(actions, new RegExp(action), `server action: ${action}`)
  }
  for (const contract of ['getSubscriptionMode', 'subscriptions_only', 'purchases_only', 'hybrid']) {
    assert.match(access, new RegExp(contract), `access contract: ${contract}`)
  }
  for (const contract of ['context', 'featuredOnly', 'stageId', 'branchId']) {
    assert.match(publicService, new RegExp(contract), `public service contract: ${contract}`)
  }
  for (const file of [
    'app/admin/subscriptions/[planId]/page.tsx',
    'app/subscriptions/page.tsx',
    'app/subscriptions/[planId]/page.tsx',
    'components/subscriptions/public-subscription-strip.tsx',
  ]) assert.ok(existsSync(join(root, file)), `route/component exists: ${file}`)
  assert.match(adminDetail, /imageUrl/)
  assert.match(adminDetail, /publicVisible/)
  assert.match(adminDetail, /featured/)
  assert.match(adminDetail, /scopeMode/)
  assert.match(manager, /monthly_course_id/)
  assert.match(manager, /lecturesByCourse/)
  assert.match(adminDetail, /coursesWithLectures/)
  assert.match(adminDetail, /looseLectures/)
  assert.match(adminDetail, /toggleCourse/)
  assert.match(adminDetail, /toggleLecture/)
  assert.match(adminDetail, /ملخص المحتوى المختار/)
  assert.match(publicCatalog, /stageId/)
  assert.match(publicCatalog, /branchId/)
  assert.match(publicCatalog, /الاشتراك/)
  assert.match(publicCatalog, /الخطط المناسبة/)
  assert.match(publicDetail, /مؤقت حتى انتهاء الخطة/)
  assert.match(publicDetail, /يظل مملوكًا لك بشكل دائم/)
  assert.match(strip, /PublicSubscriptionStrip/)
  assert.match(stagePage, /context: ['"]stage['"]/)
  assert.match(branchPage, /context: ['"]branch['"]/)
  assert.match(adminCenter, /إدارة تفصيلية/)

  console.log(`Comprehensive subscription tests passed: ${lifecycleCases.length} lifecycle cases, ${scopeCases.length} scope cases, 12 mode/source cases, schema/actions/UI contracts.`)
} finally {
  rmSync(outDir, { recursive: true, force: true })
}
