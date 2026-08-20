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

async function findTablesWithoutPolicies() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const tables = await client.query(`
    SELECT c.relname as table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `)

  const policies = await client.query(`
    SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public';
  `)

  const tablesWithPolicies = new Set(policies.rows.map(r => r.tablename))
  const missing = []

  for (const t of tables.rows) {
    if (!tablesWithPolicies.has(t.table_name)) {
      missing.push(t.table_name)
    }
  }

  console.log(`Total public tables: ${tables.rowCount}`)
  console.log(`Tables WITH policies: ${tablesWithPolicies.size}`)
  console.log(`Tables WITHOUT policies: ${missing.length}`)
  console.log('Tables without policies:', missing)

  await client.end()
}

findTablesWithoutPolicies().catch(console.error)
