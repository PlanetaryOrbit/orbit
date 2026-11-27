const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Recoil 0.7.7 and Headless UI v1 both use React APIs removed in React 19.
  // Their small incompatible helpers are redirected to public-API shims.
  webpack: (config, { webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      recoil: path.resolve(__dirname, 'lib/recoil-compat.tsx'),
    };

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /stable-collection\.js$/,
        path.resolve(__dirname, 'lib/headlessui-stable-collection.js'),
      ),
    );

    return config;
  },

  experimental: {
    workerThreads: false,
    cpus: 1,
  },

  typescript: {
    ignoreBuildErrors: true, // if you wanna test build do [p]npm run typecheck
  },

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
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'" + (isDev ? " 'unsafe-eval'" : ''),
              "script-src-elem 'self' 'unsafe-inline' https://static.cloudflareinsights.com" +
                (isDev ? " 'unsafe-eval'" : ''),
              "script-src-attr 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
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
