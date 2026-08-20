import { Client } from 'pg'

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const tablesRes = await client.query(`
    SELECT c.relname, c.relrowsecurity,
           (SELECT count(*) FROM pg_policies p WHERE p.tablename = c.relname AND p.schemaname = 'public') AS policy_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `)

  console.log('--- TABLES AUDIT ---')
  for (const row of tablesRes.rows) {
    const policiesRes = await client.query(
      'SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE tablename = $1 AND schemaname = $2',
      [row.relname, 'public']
    )
    console.log(`TABLE: ${row.relname} (RLS: ${row.relrowsecurity}, Policies: ${row.policy_count})`)
    for (const p of policiesRes.rows) {
      console.log(`  - [${p.cmd}] ${p.policyname} (roles: ${p.roles})`)
      if (p.qual) console.log(`      USING: ${p.qual}`)
      if (p.with_check) console.log(`      WITH CHECK: ${p.with_check}`)
    }
  }

  await client.end()
}

main().catch(console.error)
