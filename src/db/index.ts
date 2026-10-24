import 'server-only'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import ws from 'ws'
import * as schema from './schema'
import { requiredEnv } from '../server/errors'

neonConfig.webSocketConstructor = ws
let database: ReturnType<typeof connect> | undefined

function connect() {
  return drizzle(new Pool({ connectionString: requiredEnv('DATABASE_URL'), max: 5 }), { schema })
}

// Lazy initialization: static builds never need database credentials.
export function getDatabase() { return database ??= connect() }
export type Database = ReturnType<typeof getDatabase>
