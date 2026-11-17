import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { AstroPWAIntegration as AstroPWA } from '@vite-pwa/astro';

// Deployed on GitHub Pages under /cours-acoustique/ (see docs/plan-phase-1.md, D-Q1).
export default defineConfig({
  site: 'https://thib1tree.github.io',
  base: '/cours-acoustique/',
  trailingSlash: 'always',
  // Inline CSS: no render-blocking stylesheet request before the first paint.
  build: { inlineStylesheets: 'auto' },
  integrations: [
    svelte(),
    mdx(),
    // Installable, offline-capable course (read and manipulate without network).
    AstroPWA({
      base: '/cours-acoustique/',
      scope: '/cours-acoustique/',
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: "Cours d'acoustique interactif",
        short_name: 'Acoustique',
        description: "Cours d'acoustique interactif, niveau master et au-delà.",
        lang: 'fr',
        start_url: '/cours-acoustique/',
        scope: '/cours-acoustique/',
        display: 'standalone',
        background_color: '#F6F7F9',
        theme_color: '#1E2431',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      generateSW: {
        navigateFallback: null,
        globPatterns: ['**/*.{html,js,css,woff2,svg}'],
        globIgnores: ['lab/**', '**/*cyrillic*', '**/*vietnamese*'],
      },
    }),
  ],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [[rehypeKatex, { strict: 'error', output: 'html' }]],
  },
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr'],
  },
});
