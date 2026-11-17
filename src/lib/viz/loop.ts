/**
 * Animation loop that only runs while its element is on screen and the tab is visible
 * (battery rule, CLAUDE.md § 9). `frame` receives the elapsed time in seconds.
 */
export function createLoop(
  el: Element,
  frame: (dt: number) => void,
  isPlaying: () => boolean,
): { destroy: () => void; kick: () => void } {
  let visible = false;
  let raf = 0;
  let last = 0;
  const tick = (now: number) => {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    frame(dt);
    schedule();
  };
  const schedule = () => {
    if (!raf && visible && !document.hidden && isPlaying()) raf = requestAnimationFrame(tick);
    else if (!isPlaying()) last = 0;
  };
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (!visible) last = 0;
      schedule();
    },
    { rootMargin: '100px' },
  );
  io.observe(el);
  const onVis = () => {
    last = 0;
    schedule();
  };
  document.addEventListener('visibilitychange', onVis);
  return {
    kick: schedule,
    destroy() {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      if (raf) cancelAnimationFrame(raf);
    },
  };
}

/** Size a canvas to its CSS box, device-pixel ratio capped at `maxDpr`. */
export function fitCanvas(
  canvas: HTMLCanvasElement,
  maxDpr = 2,
): { w: number; h: number; dpr: number } {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const W = Math.max(1, Math.round(r.width * dpr));
  const H = Math.max(1, Math.round(r.height * dpr));
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  return { w: r.width, h: r.height, dpr };
}

/** Read a CSS custom property (colors follow the current theme). */
export const cssVar = (name: string, el: Element = document.documentElement): string =>
  getComputedStyle(el).getPropertyValue(name).trim();

/** Current theme, honoring an explicit choice over the system preference. */
export function currentTheme(): 'light' | 'dark' {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Call `fn` when the theme changes (toggle or system). Returns an unsubscribe function. */
export function onThemeChange(fn: () => void): () => void {
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', fn);
  addEventListener('themechange', fn);
  return () => {
    mq.removeEventListener('change', fn);
    removeEventListener('themechange', fn);
  };
}
