import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Deployed on GitHub Pages under /cours-acoustique/ (see docs/plan-phase-1.md, D-Q1).
export default defineConfig({
  site: 'https://thib1tree.github.io',
  base: '/cours-acoustique/',
  trailingSlash: 'always',
  integrations: [svelte(), mdx()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [[rehypeKatex, { strict: 'error', output: 'html' }]],
  },
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr'],
  },
});
