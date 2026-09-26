export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  devtools: {
    enabled: false,
  },

  runtimeConfig: {
    redisUrl: '',
  },

  nitro: {
    experimental: {
      websocket: true,
    },
    compressPublicAssets: true,
    minify: true,
  },

  devServer: {
    https: {
      key: './certs/key.pem',
      cert: './certs/cert.pem',
    },
  },

  vite: {
    build: {
      target: 'baseline-widely-available',
      cssMinify: 'lightningcss',
      minify: 'esbuild',
      sourcemap: false,
      reportCompressedSize: false,
      cssCodeSplit: true,
      modulePreload: {
        polyfill: false,
      },
    },

    optimizeDeps: {
      exclude: ['vue-sonner'],
    },
  },

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      htmlAttrs: {
        translate: 'no',
      },
      meta: [
        {
          charset: 'utf-8',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
      ],

      script: [
        {
          innerHTML: `
            (() => {
              const theme = localStorage.getItem('theme') || 'dark';

              if (theme === 'dark') {
                document.documentElement.classList.add('dark');
              }
            })();
          `,
        },
      ],
    },
  },

  css: ['~/styles/entry.scss', 'vue-sonner/style.css'],

  modules: ['@nuxt/image', '@nuxt/fonts', '@nuxtjs/i18n'],

  i18n: {
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    locales: [
      {
        code: 'en',
        name: 'English',
        language: 'en-US',
        file: 'en.json',
        dir: 'ltr',
      },
      {
        code: 'de',
        name: 'Deutsch',
        language: 'de-DE',
        file: 'de.json',
        dir: 'ltr',
      },
      {
        code: 'cs',
        name: 'Čeština',
        language: 'cs-CZ',
        file: 'cs.json',
        dir: 'ltr',
      },
      {
        code: 'fr',
        name: 'Français',
        language: 'fr-FR',
        file: 'fr.json',
        dir: 'ltr',
      },
      {
        code: 'ur',
        name: 'اردو',
        language: 'ur-PK',
        file: 'ur.json',
        dir: 'rtl',
      },
    ],

    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'locale',
      redirectOn: 'root',
      fallbackLocale: 'en',
    },

    defaultDirection: 'ltr',
  },
});
