
import { Pool } from 'pg'
import 'dotenv/config'

declare const process: { env: { DATABASE_URL?: string } }

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('Falta configurar DATABASE_URL para conectar con PostgreSQL.')
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Supabase exige TLS
})

export default pool