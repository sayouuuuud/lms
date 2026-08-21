import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(new URL('..', import.meta.url).pathname)
const outDir = join(root, '.tmp-subscription-rules-test')
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

execFileSync(join(root, 'node_modules/.bin/tsc'), [
  'lib/subscription-rules.ts',
  '--target', 'ES2022',
  '--module', 'NodeNext',
  '--moduleResolution', 'NodeNext',
  '--skipLibCheck',
  '--outDir', outDir,
], { cwd: root, stdio: 'pipe' })

const rules = await import(pathToFileURL(join(outDir, 'subscription-rules.js')).href)
const { normalizeSubscriptionMode, subscriptionIsCurrentlyUsable, subscriptionScopeMatchesLecture } = rules

const now = new Date('2026-08-21T12:00:00.000Z')
const baseSubscription = {
  status: 'active',
  payment_status: 'paid',
  start_date: new Date('2026-08-01T00:00:00.000Z'),
  end_date: new Date('2026-08-31T23:59:59.000Z'),
  grace_until: null,
}

assert.equal(normalizeSubscriptionMode('purchases_only'), 'purchases_only')
assert.equal(normalizeSubscriptionMode('subscriptions_only'), 'subscriptions_only')
assert.equal(normalizeSubscriptionMode('subscription_only'), 'subscriptions_only')
assert.equal(normalizeSubscriptionMode('hybrid'), 'hybrid')
assert.equal(normalizeSubscriptionMode('both'), 'hybrid')
assert.equal(normalizeSubscriptionMode(undefined), 'purchases_only')

assert.equal(subscriptionIsCurrentlyUsable(baseSubscription, now), true)
assert.equal(subscriptionIsCurrentlyUsable({ ...baseSubscription, status: 'grace' }, now), true)
assert.equal(subscriptionIsCurrentlyUsable({ ...baseSubscription, end_date: new Date('2026-08-20T00:00:00.000Z'), grace_until: new Date('2026-08-25T00:00:00.000Z') }, now), true)
assert.equal(subscriptionIsCurrentlyUsable({ ...baseSubscription, end_date: new Date('2026-08-20T00:00:00.000Z'), grace_until: new Date('2026-08-20T00:00:00.000Z') }, now), false)
assert.equal(subscriptionIsCurrentlyUsable({ ...baseSubscription, payment_status: 'unpaid' }, now), false)
assert.equal(subscriptionIsCurrentlyUsable({ ...baseSubscription, payment_status: 'pending' }, now), false)
assert.equal(subscriptionIsCurrentlyUsable({ ...baseSubscription, payment_status: 'refunded' }, now), false)
assert.equal(subscriptionIsCurrentlyUsable({ ...baseSubscription, status: 'cancelled' }, now), false)
assert.equal(subscriptionIsCurrentlyUsable({ ...baseSubscription, status: 'suspended' }, now), false)
assert.equal(subscriptionIsCurrentlyUsable({ ...baseSubscription, status: 'expired' }, now), false)
assert.equal(subscriptionIsCurrentlyUsable({ ...baseSubscription, start_date: new Date('2026-08-22T00:00:00.000Z') }, now), false)
assert.equal(subscriptionIsCurrentlyUsable({ ...baseSubscription, end_date: now }, now), true)

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
const plan = (overrides = {}) => ({ branch_id: null, stage_id: null, scope_mode: 'selected', scopes: [], ...overrides })

assert.equal(subscriptionScopeMatchesLecture(plan({ scope_mode: 'all_released' }), lecture), true)
assert.equal(subscriptionScopeMatchesLecture(plan({ branch_id: 'branch-1' }), lecture), true)
assert.equal(subscriptionScopeMatchesLecture(plan({ branch_id: 'branch-1' }), otherLecture), false)
assert.equal(subscriptionScopeMatchesLecture(plan({ stage_id: 'stage-1' }), lecture), true)
assert.equal(subscriptionScopeMatchesLecture(plan({ stage_id: 'stage-1' }), otherLecture), false)
assert.equal(subscriptionScopeMatchesLecture(plan({ scopes: [{ scope_type: 'term', scope_id: 'term-1' }] }), lecture), true)
assert.equal(subscriptionScopeMatchesLecture(plan({ scopes: [{ scope_type: 'term', scope_id: 'term-1' }] }), otherLecture), false)
assert.equal(subscriptionScopeMatchesLecture(plan({ scopes: [{ scope_type: 'course', scope_id: 'course-1' }] }), lecture), true)
assert.equal(subscriptionScopeMatchesLecture(plan({ scopes: [{ scope_type: 'course', scope_id: 'course-1' }] }), otherLecture), false)
assert.equal(subscriptionScopeMatchesLecture(plan({ scopes: [{ scope_type: 'lecture', scope_id: 'lecture-1' }] }), lecture), true)
assert.equal(subscriptionScopeMatchesLecture(plan({ scopes: [{ scope_type: 'lecture', scope_id: 'lecture-1' }] }), otherLecture), false)
assert.equal(subscriptionScopeMatchesLecture(plan({ scopes: [{ scope_type: 'all_released', scope_id: null }] }), otherLecture), true)
assert.equal(subscriptionScopeMatchesLecture(plan(), lecture), false)

const read = (file) => readFileSync(join(root, file), 'utf8')
const manager = read('lib/subscription-manager.ts')
const access = read('lib/subscription-access.ts')
const lectureAccess = read('lib/lecture-access.ts')
const studentData = read('lib/student-lectures-data.ts')
const actions = read('app/admin/subscriptions/actions.ts')
const client = read('app/admin/subscriptions/client.tsx')
const migration = read('prisma/migrations/20260821120000_subscription_governance/migration.sql')

for (const eventType of ['created', 'renewed', 'cancelled', 'suspended', 'resumed', 'expired']) {
  assert.match(manager, new RegExp(`event_type: ['"]${eventType}['"]|${eventType}`), `missing event contract: ${eventType}`)
}
assert.match(manager, /payment_status.*waived/)
for (const status of ['active', 'grace', 'cancelled', 'suspended', 'expired']) {
  assert.match(manager, new RegExp(status), `missing lifecycle status contract: ${status}`)
}
assert.match(actions, /hasResourceAccess\(['"]subscriptions['"],\s*['"]manage['"]\)/)
assert.match(client, /renewSubscriptionAction/)
assert.match(client, /تجديد/)
assert.match(lectureAccess, /getSubscriptionMode/)
assert.match(lectureAccess, /subscriptions_only/)
assert.match(studentData, /getSubscriptionAccessibleContent/)
assert.match(studentData, /getSubscriptionMode/)
assert.match(access, /subscriptionScopeMatchesLecture/)
assert.match(migration, /subscription_plan_scopes/)
assert.match(migration, /subscription_events/)
assert.match(migration, /ON CONFLICT DO NOTHING/)
assert.match(migration, /student_subscriptions_status_check/)
assert.match(migration, /student_subscriptions_payment_status_check/)

assert.ok(existsSync(join(root, 'prisma/migrations/20260821120000_subscription_governance/migration.sql')))
rmSync(outDir, { recursive: true, force: true })
console.log('Subscription governance tests passed: lifecycle, payment, grace, scopes, modes, audit contracts.')
