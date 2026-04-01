import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

export function middleware(request: NextRequest) {
  const adminToken = process.env.ADMIN_API_TOKEN;

  // ADMIN_API_TOKEN が未設定なら全拒否（404）
  if (!adminToken) {
    return NextResponse.json(null, { status: 404 });
  }

  const authorization = request.headers.get('authorization');

  if (authorization) {
    const [scheme, encoded] = authorization.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded);
      const [user, password] = decoded.split(':');
      if (user === 'admin' && password === adminToken) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse(null, {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Admin Area"',
    },
  });
}
