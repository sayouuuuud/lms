import { Client } from 'pg'
import fs from 'fs'

async function checkDiff() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const colsRes = await client.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `)

  const dbCols = new Set(colsRes.rows.map(r => `${r.table_name}.${r.column_name}`))

  // Let's check students and profiles specifically
  const checks = [
    'students.parent_phone',
    'students.address',
    'students.school_name',
    'profiles.parent_phone',
    'profiles.address',
    'profiles.school_name'
  ]

  for (const c of checks) {
    console.log(c, dbCols.has(c) ? 'EXISTS in DB' : 'MISSING from DB')
  }

  await client.end()
}

checkDiff().catch(console.error)
