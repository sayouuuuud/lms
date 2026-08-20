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

async function fixName() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  await client.query(`
    UPDATE public.students s
    SET name = COALESCE(NULLIF(p.full_name, ''), split_part(s.email, '@', 1), 'طالب')
    FROM public.profiles p
    WHERE s.user_id = p.id AND (s.name LIKE 'Hacked%' OR s.name LIKE 'Attempted%');
  `)
  await client.end()
}

fixName().catch(console.error)
