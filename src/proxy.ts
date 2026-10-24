import { NextResponse, type NextRequest } from 'next/server'

// Presentation only: this marker skips the introduction. It is NOT authentication.
export function proxy(request: NextRequest) {
  if (request.nextUrl.searchParams.get('browse') === '1') {
    const response = NextResponse.next()
    response.cookies.set('parallel-demo-browsing', '1', { path: '/', sameSite: 'lax' })
    return response
  }
  if (request.cookies.get('parallel-demo-browsing')?.value !== '1') {
    return NextResponse.redirect(new URL('/account', request.url))
  }
  return NextResponse.next()
}

export const config = { matcher: '/' }
