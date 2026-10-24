
import { NextResponse, type NextRequest } from 'next/server'

// Presentation-only gate, not authentication.
export function middleware(request: NextRequest) {
  if (request.nextUrl.searchParams.get('browse') === '1') {
    const response = NextResponse.next()

    response.cookies.set('parallel-demo-browsing', '1', {
      path: '/',
      sameSite: 'lax',
    })

    return response
  }

  if (request.cookies.get('parallel-demo-browsing')?.value !== '1') {
    return NextResponse.redirect(new URL('/account', request.url))
  }

  return NextResponse.next()
}

export const config = {
  runtime: 'experimental-edge',
  matcher: ['/'],
}
