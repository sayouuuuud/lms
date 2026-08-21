import { prisma } from '../lib/prisma'

async function runTest() {
  console.log('--- STARTING DB SANITY TEST ---')

  let dummyPlanId: string | undefined
  let testLectureId: string | undefined

  try {
    // 1. Check Platform Settings
    const settings = await prisma.platform_settings.findFirst()
    console.log('✅ Platform Settings accessible')
    if (!settings || !('subscription_mode' in settings)) throw new Error('subscription_mode missing')
    if (!('rescue_whatsapp_cooldown_hours' in settings)) throw new Error('rescue_whatsapp_cooldown_hours missing')
    console.log('✅ Settings Schema is up to date')

    // 2. Try creating a dummy plan
    const dummyPlan = await prisma.subscription_plans.create({
      data: {
        title: 'Test Plan',
        description: 'Test Description',
        price: 100,
        duration_days: 30,
        is_active: false,
      },
    })
    dummyPlanId = dummyPlan.id
    console.log('✅ Created dummy subscription plan')

    // 3. Check lectures for is_published and release_date
    const branch = await prisma.branches.findFirst({ select: { id: true } })
    if (!branch) throw new Error('No branch exists for lecture sanity test')

    const testLecture = await prisma.lectures.create({
      data: {
        branch_id: branch.id,
        title: 'Test Lecture',
        slug: 'test-lecture-' + Date.now(),
        description: 'Test',
        price: 0,
        sort_order: 999,
        is_published: true,
        release_date: new Date(),
      },
    })
    testLectureId = testLecture.id
    console.log('✅ Created dummy lecture with is_published and release_date')

    console.log('--- DB SANITY TEST PASSED ---')
  } catch (error) {
    console.error('❌ TEST FAILED:', error)
    process.exitCode = 1
  } finally {
    if (testLectureId) {
      await prisma.lectures.delete({ where: { id: testLectureId } }).catch(() => undefined)
    }
    if (dummyPlanId) {
      await prisma.subscription_plans.delete({ where: { id: dummyPlanId } }).catch(() => undefined)
    }
    await prisma.$disconnect()
  }
}

runTest()
