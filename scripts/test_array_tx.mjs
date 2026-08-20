import fs from 'fs'
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
import { prisma, rawPrisma, runWithUserContext } from '../lib/prisma.ts'

async function testArrayTx() {
  console.log('--- TEST 1: Admin array tx ---')
  try {
    const res = await prisma.$transaction([
      prisma.user.findFirst({ select: { id: true } }),
      prisma.profiles.findFirst({ select: { id: true } })
    ])
    console.log('Admin array tx result:', res)
  } catch (err) {
    console.error('Admin array tx failed:', err)
  }

  console.log('\n--- TEST 2: Student array tx ---')
  try {
    const student = await rawPrisma.students.findFirst({ where: { user_id: { not: null } } })
    const res2 = await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
      return await prisma.$transaction([
        prisma.students.findMany({ select: { id: true } }),
        prisma.courses.findMany({ take: 1, select: { id: true } })
      ])
    })
    console.log('Student array tx result:', res2)
  } catch (err) {
    console.error('Student array tx failed:', err)
  }

  console.log('\n--- TEST 3: Atomicity of array tx with error in step 2 ---')
  try {
    const student = await rawPrisma.students.findFirst({ where: { user_id: { not: null } } })
    const originalPhone = student.phone
    const testPhone = '01099999999'

    try {
      await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
        return await prisma.$transaction([
          prisma.students.update({ where: { id: student.id }, data: { phone: testPhone } }),
          // Deliberate failure:
          prisma.students.update({ where: { id: '00000000-0000-0000-0000-000000000000' }, data: { phone: 'xyz' } })
        ])
      })
    } catch (e) {
      console.log('Caught expected error from array tx:', e.message)
    }

    const checkStudent = await rawPrisma.students.findUnique({ where: { id: student.id } })
    console.log(`Original phone: ${originalPhone}, Current phone: ${checkStudent.phone}`)
    if (checkStudent.phone === testPhone) {
      console.error('CRITICAL BUG: Array transaction step 1 was committed even though step 2 failed! (NO ROLLBACK)')
      // Revert phone
      await rawPrisma.students.update({ where: { id: student.id }, data: { phone: originalPhone } })
    } else {
      console.log('PASS: Array transaction properly rolled back step 1!')
    }
  } catch (err) {
    console.error('Test 3 failed:', err)
  }

  process.exit(0)
}

testArrayTx()
