const webpack = require("webpack");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
        protocol: "https",
        hostname: "tr.rbxcdn.com",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_DATABASE_CHECK: process.env.DATABASE_URL ? "true" : "",
  },
  webpack: (config) => {
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "");
      }),
    );
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://cdn.posthog.com https://js.posthog.com https://uranus.planetaryapp.cloud",
              "script-src-elem 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://*.posthog.com https://cdn.posthog.com https://js.posthog.com https://uranus.planetaryapp.cloud",
              "script-src-attr 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://events.posthog.com https://app.posthog.com https://uranus.planetaryapp.cloud",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "media-src 'self' https://audio-ssl.itunes.apple.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
