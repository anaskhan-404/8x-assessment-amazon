import { config } from 'dotenv'
import { getDatabase } from '../src/db'
import { seedCatalogue } from '../src/db/seed'
config({ path: '.env.local', quiet: true })
config({ path: '.env', quiet: true })
try {
  const db = getDatabase()
  console.log(await seedCatalogue(db))
  await db.$client.end()
} catch {
  console.error('Seed failed. Check DATABASE_URL and apply migrations first.')
  process.exitCode = 1
}
