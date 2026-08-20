import { Client } from 'pg'
import fs from 'fs'
import path from 'path'

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

async function runMigrations() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  console.log('Connected to database.')

  const sqlFiles = [
    path.join('prisma', 'sql', 'A01_assignments_resource.sql'),
    path.join('prisma', 'sql', 'Q01_question_bank.sql'),
    path.join('prisma', 'sql', 'S01_devices_security.sql'),
    path.join('prisma', 'sql', 'T05_order_items_integrity.sql'),
    path.join('prisma', 'sql', 'V01_lecture_views.sql'),
    path.join('prisma', 'sql', 'W01_whatsapp_messages.sql'),
    path.join('prisma', 'sql', 'W02_whatsapp_payment_notify.sql'),
    path.join('scripts', '001_exam_attempts.sql'),
    path.join('scripts', '002_taxonomy_mastery.sql'),
    path.join('scripts', '003_rescue_system.sql'),
    path.join('scripts', '004_release_and_subscriptions.sql'),
    path.join('scripts', 'R01_rls_and_security_setup.sql'),
  ]

  for (const file of sqlFiles) {
    if (fs.existsSync(file)) {
      console.log(`\nExecuting: ${file}...`)
      const sql = fs.readFileSync(file, 'utf-8')
      try {
        await client.query(sql)
        console.log(`SUCCESS: ${file}`)
      } catch (err) {
        console.error(`ERROR in ${file}:`, err.message)
        throw err
      }
    } else {
      console.warn(`File not found: ${file}`)
    }
  }

  console.log('\nAll migrations executed successfully!')
  await client.end()
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
