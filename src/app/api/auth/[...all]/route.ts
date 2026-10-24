import { getAuth } from '@/server/auth'
import { endpoint } from '@/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function GET(request: Request) { return endpoint(() => getAuth().handler(request)) }
export function POST(request: Request) { return endpoint(() => getAuth().handler(request)) }
