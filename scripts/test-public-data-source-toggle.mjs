import fs from 'fs'
import path from 'path'
import pg from 'pg'

if (typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile() } catch (e) {}
} else if (fs.existsSync('.env')) {
  const envConfig = fs.readFileSync('.env', 'utf8')
  for (const line of envConfig.split('\n')) {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#')) continue
    const separatorIndex = trimmedLine.indexOf('=')
    if (separatorIndex !== -1) {
      const key = trimmedLine.slice(0, separatorIndex).trim()
      const value = trimmedLine.slice(separatorIndex + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  }
}

async function runTests() {
  console.log('🧪 Starting Public Data Source Toggle & Static Mode Test Suite...\n')
  const { Client } = pg
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  let passed = 0
  let failed = 0

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`)
      passed++
    } else {
      console.error(`  ❌ FAIL: ${testName}`)
      failed++
    }
  }

  try {
    // 1. Verify schema column in platform_settings
    console.log('1. Checking Database Schema:')
    const colRes = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'platform_settings' AND column_name = 'sync_public_with_db'
    `)
    assert(colRes.rows.length === 1, 'Column sync_public_with_db exists in platform_settings table')
    assert(colRes.rows[0].data_type === 'boolean', 'Column sync_public_with_db is of type boolean')

    // 2. Test toggling to true in DB
    console.log('\n2. Testing Dynamic DB Mode (sync_public_with_db = true):')
    await client.query('UPDATE platform_settings SET sync_public_with_db = true WHERE id = 1')
    const trueRow = await client.query('SELECT sync_public_with_db FROM platform_settings WHERE id = 1')
    assert(trueRow.rows[0].sync_public_with_db === true, 'Database has sync_public_with_db = true')

    // Dynamic curriculum resolution
    const { getCurriculum, getStageBySlug, getBranchBySlug, getCourseBySlug, getFreeLectureBySlug } = await import('../lib/curriculum.ts')
    const { isPublicSyncWithDbEnabled } = await import('../lib/platform-settings.ts')
    const { getSiteContent } = await import('../lib/site-content.ts')
    const { getFreeLectureWatch } = await import('../lib/free-lecture-data.ts')
    const { getPublicSubscriptionContext } = await import('../lib/subscription-public.ts')
    const { DEFAULT_SITE_CONTENT } = await import('../lib/site-content-defaults.ts')
    const { stages: staticStages } = await import('../lib/landing-data.ts')

    const isEnabledTrue = await isPublicSyncWithDbEnabled()
    assert(isEnabledTrue === true, 'isPublicSyncWithDbEnabled() returns true when DB has true')

    const dbCurriculum = await getCurriculum()
    assert(Array.isArray(dbCurriculum) && dbCurriculum.length > 0, `getCurriculum() returned ${dbCurriculum.length} stages from DB`)

    // 3. Test toggling to false in DB (Static Mode)
    console.log('\n3. Testing Static Mode (sync_public_with_db = false):')
    await client.query('UPDATE platform_settings SET sync_public_with_db = false WHERE id = 1')
    const falseRow = await client.query('SELECT sync_public_with_db FROM platform_settings WHERE id = 1')
    assert(falseRow.rows[0].sync_public_with_db === false, 'Database has sync_public_with_db = false')

    const isEnabledFalse = await isPublicSyncWithDbEnabled()
    assert(isEnabledFalse === false, 'isPublicSyncWithDbEnabled() returns false when DB has false')

    // Static curriculum
    const staticCurriculum = await getCurriculum()
    assert(Array.isArray(staticCurriculum) && staticCurriculum.length === 3, 'getCurriculum() in static mode returns exactly 3 stages (sec-1, sec-2, sec-3)')
    assert(staticCurriculum[0].id === 'sec-1', 'First stage in static mode is sec-1')
    assert(staticCurriculum[1].id === 'sec-2', 'Second stage in static mode is sec-2')
    assert(staticCurriculum[2].id === 'sec-3', 'Third stage in static mode is sec-3')

    // Verify stage 1 branches, lectures, and monthlyCourses
    const sec1 = await getStageBySlug('sec-1')
    assert(sec1 !== undefined && sec1.branches.length === 3, 'getStageBySlug("sec-1") returns stage with 3 branches')
    assert(sec1.branches[0].id === 'alg-identities', 'First branch of sec-1 is alg-identities')
    assert(sec1.branches[0].monthlyCourses.length === 3, 'Branch alg-identities has 3 static monthly courses')

    const branch = await getBranchBySlug('sec-1', 'alg-identities')
    assert(branch !== undefined, 'getBranchBySlug("sec-1", "alg-identities") finds branch')

    const course = await getCourseBySlug('sec-1', 'alg-identities', 'complex-numbers')
    assert(course !== undefined && course.course.id === 'complex-numbers', 'getCourseBySlug("sec-1", "alg-identities", "complex-numbers") finds course')
    assert(course.course.price === 120, 'Static course complex-numbers has correct price (120)')

    const freeLecture = await getFreeLectureBySlug('sec-1', 'alg-identities', 'complex-numbers', 'complex-numbers')
    assert(freeLecture !== undefined, 'getFreeLectureBySlug finds complex-numbers lecture preview')

    const freeWatch = await getFreeLectureWatch('sec-1', 'alg-identities', 'complex-numbers', 'complex-numbers')
    assert(freeWatch !== undefined && freeWatch.lessons.length > 0, `getFreeLectureWatch returns ${freeWatch?.lessons?.length} lessons in static mode`)
    assert(freeWatch.lessons[0].videoUrl !== null, 'Free lesson has a playable video URL in static mode')

    // Static site content
    const siteContent = await getSiteContent()
    assert(siteContent.hero.title === DEFAULT_SITE_CONTENT.hero.title, 'getSiteContent() returns DEFAULT_SITE_CONTENT in static mode')
    assert(siteContent.features.items.length === DEFAULT_SITE_CONTENT.features.items.length, 'getSiteContent() features match default content')
    assert(siteContent.testimonials.items.length === DEFAULT_SITE_CONTENT.testimonials.items.length, 'getSiteContent() testimonials match default content')

    // Static subscription context
    const subCtx = await getPublicSubscriptionContext()
    assert(subCtx.subscriptionsEnabled === false, 'getPublicSubscriptionContext() disables subscription marketing in static mode')

    // 4. Restore DB mode (sync_public_with_db = true)
    console.log('\n4. Restoring Database Mode (sync_public_with_db = true):')
    await client.query('UPDATE platform_settings SET sync_public_with_db = true WHERE id = 1')
    const restoredRow = await client.query('SELECT sync_public_with_db FROM platform_settings WHERE id = 1')
    assert(restoredRow.rows[0].sync_public_with_db === true, 'Database successfully restored to sync_public_with_db = true')
    const isRestored = await isPublicSyncWithDbEnabled()
    assert(isRestored === true, 'isPublicSyncWithDbEnabled() restored to true')

  } catch (error) {
    console.error('Error during test execution:', error)
    failed++
  } finally {
    await client.end()
  }

  console.log(`\n========================================`)
  console.log(`Test Results: ${passed} passed, ${failed} failed`)
  console.log(`========================================\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

runTests()
