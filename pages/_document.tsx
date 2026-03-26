import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://widget.intercom.io https://js.intercomcdn.com https://cdn.posthog.com https://js.posthog.com https://cdn.intercom.com https://uploads.intercomcdn.com https://uranus.planetaryapp.cloud; " +
            "script-src-elem 'self' 'unsafe-inline' https://static.cloudflareinsights.com/ https://*.posthog.com https://widget.intercom.io https://js.intercomcdn.com https://cdn.posthog.com https://js.posthog.com https://cdn.intercom.com https://uploads.intercomcdn.com https://uranus.planetaryapp.cloud; " +
            "script-src-attr 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src 'self' https://fonts.gstatic.com https://fonts.intercomcdn.com; " +
            "img-src 'self' data: https: blob:; " +
			"media-src 'self' https://audio-ssl.itunes.apple.com; " +
            "connect-src 'self' https: https://api.intercom.io https://events.posthog.com https://app.posthog.com https://uranus.planetaryapp.cloud wss://*.intercom.io wss:; " +
            "frame-src 'self' https://widget.intercom.io; " +
            "base-uri 'self'; form-action 'self';"
          }
        />
        {/* Prevent MIME type sniffing */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        {/* Additional XSS protection */}
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        {/* Control referrer information */}
        <meta
          httpEquiv="Referrer-Policy"
          content="strict-origin-when-cross-origin"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
