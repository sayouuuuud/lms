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
import { prisma, rawPrisma, getCurrentUserContext, userContextStorage } from '../lib/prisma.ts'

async function simulateStudentServerActionWithEnter(studentUser) {
  console.log('--- Testing enterWith for student:', studentUser.name, '---')
  
  const ctx = {
    id: studentUser.user_id,
    role: 'student',
    email: studentUser.email
  }

  // With enterWith:
  userContextStorage.enterWith(ctx)
  const student = await prisma.students.findFirst({ where: { user_id: studentUser.user_id } })

  console.log('Inside server action AFTER getCurrentStudent():')
  console.log('   Current userContextStorage store:', getCurrentUserContext())

  // Subsequent student query:
  const allStudents = await prisma.students.findMany()
  console.log(`   allStudents count returned: ${allStudents.length}`)
  
  if (allStudents.length > 1) {
    console.error('   CRITICAL: RLS BYPASS! Student query saw all students!')
  } else {
    console.log('   PASS: Student query was properly isolated (got 1 student)!')
  }
}

async function run() {
  const student = await rawPrisma.students.findFirst({ where: { user_id: { not: null } } })
  await simulateStudentServerActionWithEnter(student)
  process.exit(0)
}

run()
