import { Client } from 'pg'
import fs from 'fs'

async function checkAllPrismaModels() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const colsRes = await client.query(`
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema IN ('public', 'auth')
  `)
  const dbCols = new Set(colsRes.rows.map(r => `${r.table_schema}.${r.table_name}.${r.column_name}`))
  const pubCols = new Set(colsRes.rows.map(r => `${r.table_name}.${r.column_name}`))

  const schema = fs.readFileSync('prisma/schema.prisma', 'utf-8')
  const lines = schema.split('\n')
  let currentModel = null
  let currentSchema = 'public'
  const missing = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const modelMatch = trimmed.match(/^model\s+([A-Za-z0-9_]+)\s+\{/)
    if (modelMatch) {
      currentModel = modelMatch[1]
      // check schema
      currentSchema = 'public'
      for (let j = i; j < Math.min(i + 40, lines.length); j++) {
        if (lines[j].includes('@@schema("auth")')) currentSchema = 'auth'
        if (lines[j].trim() === '}') break
      }
      continue
    }
    if (trimmed === '}') {
      currentModel = null
      continue
    }
    if (currentModel && trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('@@')) {
      const parts = trimmed.split(/\s+/)
      const fieldName = parts[0]
      const fieldType = parts[1]
      const isScalar = ['Int', 'String', 'Boolean', 'DateTime', 'Json', 'Float', 'Decimal', 'BigInt', 'Bytes', 'student_device_status', 'factor_type', 'factor_status', 'code_challenge_method', 'oauth_response_type', 'oauth_authorization_status', 'aal_level'].includes(fieldType?.replace('?', '').replace('[]', ''))
      if (isScalar) {
        const full = `${currentModel}.${fieldName}`
        const dbFull = `${currentSchema}.${currentModel}.${fieldName}`
        if (!dbCols.has(dbFull) && !pubCols.has(full)) {
          missing.push({ schema: currentSchema, model: currentModel, field: fieldName, type: fieldType })
        }
      }
    }
  }

  console.log('Actual missing columns count:', missing.length)
  console.log(missing)

  await client.end()
}

checkAllPrismaModels().catch(console.error)
