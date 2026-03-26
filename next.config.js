/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tr.rbxcdn.com',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_DATABASE_CHECK: process.env.DATABASE_URL ? 'true' : '',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://widget.intercom.io https://js.intercomcdn.com https://cdn.posthog.com https://js.posthog.com https://cdn.intercom.com https://uploads.intercomcdn.com https://uranus.planetaryapp.cloud",
              "script-src-elem 'self' 'unsafe-inline' https://static.cloudflareinsights.com/ https://*.posthog.com https://widget.intercom.io https://js.intercomcdn.com https://cdn.posthog.com https://js.posthog.com https://cdn.intercom.com https://uploads.intercomcdn.com https://uranus.planetaryapp.cloud",
              "script-src-attr 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com https://fonts.intercomcdn.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https: https://api.intercom.io https://events.posthog.com https://app.posthog.com https://uranus.planetaryapp.cloud wss://*.intercom.io wss:",
              "frame-src 'self' https://widget.intercom.io",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "media-src 'self' https://audio-ssl.itunes.apple.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;