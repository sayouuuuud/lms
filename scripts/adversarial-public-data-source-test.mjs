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

async function runAdversarialTests() {
  console.log('🚀 Starting Comprehensive Adversarial Test Suite...\n')
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
    const { getCurriculum, getStageBySlug, getBranchBySlug, getCourseBySlug, getFreeLectureBySlug } = await import('../lib/curriculum.ts')
    const { isPublicSyncWithDbEnabled } = await import('../lib/platform-settings.ts')
    const { getSiteContent } = await import('../lib/site-content.ts')
    const { getFreeLectureWatch } = await import('../lib/free-lecture-data.ts')
    const { getPublicSubscriptionContext } = await import('../lib/subscription-public.ts')
    const { DEFAULT_SITE_CONTENT } = await import('../lib/site-content-defaults.ts')
    const { getStaticStages, stages: rawStaticStages } = await import('../lib/landing-data.ts')

    // SECTION 1: Schema & Defaults
    console.log('--- SECTION 1: Database Schema & Column Verification ---')
    const colRes = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'platform_settings' AND column_name = 'sync_public_with_db'
    `)
    assert(colRes.rows.length === 1, 'Column sync_public_with_db exists in platform_settings')
    assert(colRes.rows[0].data_type === 'boolean', 'Column type is boolean')

    // SECTION 2: Dynamic DB Mode (sync_public_with_db = true)
    console.log('\n--- SECTION 2: Dynamic DB Mode Verification ---')
    await client.query('UPDATE platform_settings SET sync_public_with_db = true WHERE id = 1')
    assert(await isPublicSyncWithDbEnabled() === true, 'isPublicSyncWithDbEnabled() is true')

    const dbCurriculum = await getCurriculum()
    assert(Array.isArray(dbCurriculum) && dbCurriculum.length > 0, `DB Curriculum loaded ${dbCurriculum.length} stages`)
    
    const dbSiteContent = await getSiteContent()
    assert(typeof dbSiteContent === 'object' && dbSiteContent.hero !== undefined, 'getSiteContent() returns site content structure in DB mode')

    const dbSubCtx = await getPublicSubscriptionContext()
    assert(typeof dbSubCtx.mode === 'string', `getPublicSubscriptionContext() returns valid mode (${dbSubCtx.mode})`)

    // SECTION 3: Static Mode (sync_public_with_db = false) Full Walkthrough
    console.log('\n--- SECTION 3: Static Mode Full Deep Coverage (All Stages, Branches, Courses) ---')
    await client.query('UPDATE platform_settings SET sync_public_with_db = false WHERE id = 1')
    assert(await isPublicSyncWithDbEnabled() === false, 'isPublicSyncWithDbEnabled() is false')

    // Test getCurriculum
    const staticStages = await getCurriculum()
    assert(staticStages.length === 3, 'Static curriculum has exactly 3 stages')
    assert(staticStages[0].id === 'sec-1', 'Stage 1 id is sec-1')
    assert(staticStages[1].id === 'sec-2', 'Stage 2 id is sec-2')
    assert(staticStages[2].id === 'sec-3', 'Stage 3 id is sec-3')

    // Deep check across all 3 stages and 9 branches
    let totalCoursesTested = 0
    let totalLecturesTested = 0
    let totalFreePreviewsTested = 0

    for (const st of staticStages) {
      assert(st.title && st.title.length > 0, `Stage ${st.id} has title: ${st.title}`)
      assert(st.image && st.image.startsWith('/stages/'), `Stage ${st.id} has valid image path: ${st.image}`)
      assert(Array.isArray(st.branches) && st.branches.length === 3, `Stage ${st.id} has exactly 3 branches`)

      const stageLookup = await getStageBySlug(st.id)
      assert(stageLookup !== undefined && stageLookup.id === st.id, `getStageBySlug('${st.id}') resolves correctly`)

      for (const br of st.branches) {
        assert(br.id && br.id.length > 0, `Branch has valid id: ${br.id}`)
        assert(br.title && br.title.length > 0, `Branch ${br.id} has title: ${br.title}`)
        assert(Array.isArray(br.topics) && br.topics.length > 0, `Branch ${br.id} has topics`)
        assert(Array.isArray(br.monthlyCourses) && br.monthlyCourses.length > 0, `Branch ${br.id} has monthlyCourses`)

        const branchLookup = await getBranchBySlug(st.id, br.id)
        assert(branchLookup !== undefined && branchLookup.branch.id === br.id, `getBranchBySlug('${st.id}', '${br.id}') resolves correctly`)

        for (const cr of br.monthlyCourses) {
          totalCoursesTested++
          assert(cr.id && cr.id.length > 0, `Course has valid id: ${cr.id}`)
          assert(cr.price > 0, `Course ${cr.id} has positive price: ${cr.price}`)
          assert(Array.isArray(cr.lectures) && cr.lectures.length > 0, `Course ${cr.id} has lectures`)

          const courseLookup = await getCourseBySlug(st.id, br.id, cr.id)
          assert(courseLookup !== undefined && courseLookup.course.id === cr.id, `getCourseBySlug('${st.id}', '${br.id}', '${cr.id}') resolves correctly`)

          for (const lec of cr.lectures) {
            totalLecturesTested++
            assert(lec.id && lec.id.length > 0, `Lecture has valid id: ${lec.id}`)
            assert(Array.isArray(lec.lessons) && lec.lessons.length > 0, `Lecture ${lec.id} has lessons`)

            const hasFreeLesson = lec.isFree || lec.lessons.some((l) => l.isFree)
            if (hasFreeLesson) {
              totalFreePreviewsTested++
              const freeLec = await getFreeLectureBySlug(st.id, br.id, cr.id, lec.id)
              assert(freeLec !== undefined, `getFreeLectureBySlug('${st.id}', '${br.id}', '${cr.id}', '${lec.id}') resolves free lecture`)

              const freeWatch = await getFreeLectureWatch(st.id, br.id, cr.id, lec.id)
              assert(freeWatch !== undefined, `getFreeLectureWatch('${st.id}', '${br.id}', '${cr.id}', '${lec.id}') resolves watch payload`)
              assert(freeWatch.lessons.length > 0, `getFreeLectureWatch returned ${freeWatch.lessons.length} watchable lessons`)
              assert(freeWatch.lessons[0].videoUrl !== null, `Free lesson has playable videoUrl: ${freeWatch.lessons[0].videoUrl}`)
            }
          }
        }
      }
    }

    console.log(`\n  ℹ️ Deep sweep tested: ${totalCoursesTested} monthly courses, ${totalLecturesTested} lectures, ${totalFreePreviewsTested} free preview lectures.`)

    // SECTION 4: Edge Cases & Negative Paths
    console.log('\n--- SECTION 4: Adversarial Edge Cases & Bogus Slugs ---')
    assert(await getStageBySlug('non-existent-stage') === undefined, 'getStageBySlug returns undefined for non-existent stage')
    assert(await getBranchBySlug('sec-1', 'bogus-branch') === undefined, 'getBranchBySlug returns undefined for bogus branch')
    assert(await getBranchBySlug('bogus-stage', 'alg-identities') === undefined, 'getBranchBySlug returns undefined for bogus stage')
    assert(await getCourseBySlug('sec-1', 'alg-identities', 'bogus-course') === undefined, 'getCourseBySlug returns undefined for bogus course')
    assert(await getFreeLectureBySlug('sec-1', 'alg-identities', 'complex-numbers', 'bogus-lecture') === undefined, 'getFreeLectureBySlug returns undefined for bogus lecture')
    assert(await getFreeLectureWatch('sec-1', 'alg-identities', 'complex-numbers', 'bogus-lecture') === undefined, 'getFreeLectureWatch returns undefined for bogus lecture')

    // SECTION 5: Site Content & Subscription Isolation
    console.log('\n--- SECTION 5: Site Content & Subscription Isolation ---')
    const staticSiteContent = await getSiteContent()
    assert(staticSiteContent.hero.title === DEFAULT_SITE_CONTENT.hero.title, 'getSiteContent() exactly matches DEFAULT_SITE_CONTENT hero.title')
    assert(staticSiteContent.hero.badge === DEFAULT_SITE_CONTENT.hero.badge, 'getSiteContent() exactly matches DEFAULT_SITE_CONTENT hero.badge')
    assert(staticSiteContent.navbar.title === DEFAULT_SITE_CONTENT.navbar.title, 'getSiteContent() exactly matches DEFAULT_SITE_CONTENT navbar.title')

    const staticSubCtx = await getPublicSubscriptionContext()
    assert(staticSubCtx.mode === 'purchases_only', 'getPublicSubscriptionContext mode is purchases_only in static mode')
    assert(staticSubCtx.subscriptionsEnabled === false, 'getPublicSubscriptionContext subscriptionsEnabled is false in static mode')

    // SECTION 6: Auth DB Connectivity Unaffected
    console.log('\n--- SECTION 6: Auth DB Connectivity Verification ---')
    const userCount = await client.query('SELECT count(*) FROM auth.users')
    assert(userCount.rows.length === 1, `Auth "auth.users" table remains accessible (count: ${userCount.rows[0].count})`)
    const profileCount = await client.query('SELECT count(*) FROM public.profiles')
    assert(profileCount.rows.length === 1, `Auth "public.profiles" table remains accessible (count: ${profileCount.rows[0].count})`)

    // Restore to dynamic mode
    await client.query('UPDATE platform_settings SET sync_public_with_db = true WHERE id = 1')
    assert(await isPublicSyncWithDbEnabled() === true, 'Successfully restored sync_public_with_db to true')

  } catch (err) {
    console.error('Fatal error during adversarial tests:', err)
    failed++
  } finally {
    await client.end()
  }

  console.log(`\n========================================`)
  console.log(`Adversarial Test Suite Results: ${passed} passed, ${failed} failed`)
  console.log(`========================================\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

runAdversarialTests()
