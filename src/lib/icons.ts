/** Inline SVG icons (24×24, currentColor). Kept as strings so Astro and Svelte share them. */
const s = (d: string) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const f = (d: string) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false">${d}</svg>`;

export const ICONS = {
  play: f('<path d="M8 5.5v13l11-6.5z"/>'),
  pause: f(
    '<rect x="6.5" y="5" width="4" height="14"/><rect x="13.5" y="5" width="4" height="14"/>',
  ),
  slow: s('<circle cx="12" cy="13" r="7.5"/><path d="M12 13V9M9.5 2.5h5"/>'),
  reset: s('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4h4"/>'),
  expand: s('<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>'),
  collapse: s('<path d="M20 4l-6 6M14 5v5h5M4 20l6-6M10 19v-5H5"/>'),
  share: s(
    '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  ),
  theme: s('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>'),
  sound: s(
    '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
  ),
  mute: s('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
  chevronDown: s('<path d="M7 10l5 5 5-5"/>'),
  chevronUp: s('<path d="M7 14l5-5 5 5"/>'),
  close: s('<path d="M6 6l12 12M18 6L6 18"/>'),
  mark: `<svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true" focusable="false"><path d="M3 16c3.2-8 5.3-8 8.5 0s5.3 8 8.5 0 5.3-8 8.5 0" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`,
} as const;

export type IconName = keyof typeof ICONS;
