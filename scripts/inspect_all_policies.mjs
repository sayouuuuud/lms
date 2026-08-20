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
import { Client } from 'pg'

async function inspectPolicies() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const res = await client.query(`
    SELECT tablename, policyname, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `)

  console.log(`Found ${res.rowCount} RLS policies:`)
  for (const row of res.rows) {
    console.log(`[${row.tablename}] ${row.policyname} (${row.cmd}) -> USING (${row.qual})`)
  }

  await client.end()
}

inspectPolicies().catch(console.error)
