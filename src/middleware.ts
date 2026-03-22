import { NextResponse, type NextRequest } from 'next/server'

// DEV MODE: all auth checks bypassed
export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|api).*)',
  ],
}