// @ts-check
import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default defineConfig([
  ...nextVitals,
  {
    files: ['**/*.{js,ts}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
]);
