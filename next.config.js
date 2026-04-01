import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

// Development環境でD1バインディングをエミュレート
if (process.env.NODE_ENV === 'development') {
  await setupDevPlatform();
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // Cloudflare Pages では /_next/image が使えないため
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://tail-match.llll-ll.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
          { key: 'Cache-Control', value: 'public, max-age=300, s-maxage=300' },
        ],
      },
    ];
  },
};

export default nextConfig;
