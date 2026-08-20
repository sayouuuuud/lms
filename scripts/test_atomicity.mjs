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
import { runWithUserContext, prisma, rawPrisma } from '../lib/prisma.ts'

async function testAtomicity() {
  const student = await rawPrisma.students.findFirst({ where: { user_id: { not: null } } })
  const originalName = student.name
  console.log(`Original student name: "${originalName}"`)

  try {
    await runWithUserContext({ id: student.user_id, role: 'student' }, async () => {
      await prisma.$transaction(async (tx) => {
        console.log('Inside outer transaction, updating student name...')
        await tx.students.update({
          where: { id: student.id },
          data: { name: 'HACKED_SHOULD_ROLLBACK' }
        })
        console.log('Throwing intentional error to trigger rollback...')
        throw new Error('INTENTIONAL_ROLLBACK')
      })
    })
  } catch (err) {
    console.log(`Caught error: ${err.message}`)
  }

  const afterStudent = await rawPrisma.students.findUnique({ where: { id: student.id } })
  console.log(`After rollback, student name in DB is: "${afterStudent.name}"`)

  // Restore original name
  await rawPrisma.students.update({
    where: { id: student.id },
    data: { name: originalName }
  })

  if (afterStudent.name === 'HACKED_SHOULD_ROLLBACK') {
    console.error('FATAL BUG: Transaction rollback FAILED! Outer transaction was bypassed!')
    process.exit(1)
  } else {
    console.log('PASS: Transaction rolled back properly.')
  }
}

testAtomicity().catch(console.error)
