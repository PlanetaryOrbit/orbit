export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  devtools: {
    enabled: false,
  },

  nitro: {
    experimental: {
      websocket: true,
    },
  },

  devServer: {
    https: {
      key: './certs/key.pem',
      cert: './certs/cert.pem',
    },
  },

  vite: {
    build: {
      target: 'es2022',
      cssMinify: 'lightningcss',
      sourcemap: false,
      reportCompressedSize: false,
    },
  },
});
