// Inline SVG icons for mockups (stroke = currentColor).
window.ICONS = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14"/><rect x="13.5" y="5" width="4" height="14"/></svg>',
  slow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="13" r="7.5"/><path d="M12 13V9M9.5 2.5h5"/></svg>',
  reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4h4"/></svg>',
  expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
  theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 14l5-5 5 5"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  mark: '<svg viewBox="0 0 32 32" aria-hidden="true" width="22" height="22"><path d="M3 16c3.2-8 5.3-8 8.5 0s5.3 8 8.5 0 5.3-8 8.5 0" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
};
document.querySelectorAll('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', window.ICONS[el.dataset.icon]));
document.querySelectorAll('[data-tex]').forEach((el) =>
  katex.render(el.dataset.tex, el, { displayMode: el.dataset.display === '1', trust: true, strict: false, throwOnError: false }),
);
document.querySelectorAll('[data-theme-toggle]').forEach((b) =>
  b.addEventListener('click', () => {
    const r = document.documentElement;
    r.dataset.theme = (r.dataset.theme || window.MOCK.theme()) === 'dark' ? 'light' : 'dark';
    location.search = `?theme=${r.dataset.theme}`;
  }),
);
if (matchMedia('(min-width: 761px)').matches) document.querySelectorAll('details[data-margin]').forEach((d) => (d.open = true));
