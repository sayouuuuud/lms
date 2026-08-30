import fs from 'fs'
import path from 'path'
import pg from 'pg'
const { Client } = pg

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile()
  } catch (e) {}
} else if (fs.existsSync('.env')) {
  const envConfig = fs.readFileSync('.env', 'utf8')
  for (const line of envConfig.split('\n')) {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#')) continue
    const separatorIndex = trimmedLine.indexOf('=')
    if (separatorIndex !== -1) {
      const key = trimmedLine.slice(0, separatorIndex).trim()
      const value = trimmedLine.slice(separatorIndex + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  }
}

async function runMigration() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  console.log('Connected to database.')

  const file = path.join('scripts', '005_sync_public_with_db.sql')
  console.log(`\nExecuting: ${file}...`)
  const sql = fs.readFileSync(file, 'utf-8')
  try {
    await client.query(sql)
    console.log(`SUCCESS: ${file}`)
  } catch (err) {
    console.error(`ERROR in ${file}:`, err)
  }
  await client.end()
}
runMigration()
