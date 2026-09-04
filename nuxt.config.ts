import tailwindcss from '@tailwindcss/vite';

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
    plugins: [tailwindcss()],
    build: {
      target: 'es2022',

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
        lang: 'en',
        translate: 'no',
      },

      bodyAttrs: {
        class: 'bg-ctp-crust text-ctp-text font-sans antialiased',
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

  css: ['~/assets/styles.css', 'vue-sonner/style.css'],

  modules: ['@nuxt/image', '@nuxt/fonts'],
});
