<script lang="ts">
  /**
   * Home page: a live 2D wave field (leapfrog FDTD on the GPU, CPU fallback).
   * Every click or touch emits a pressure pulse that propagates, reflects on the rigid
   * edges and interferes with the others. Pauses off-screen and in hidden tabs; with
   * reduced motion, a still frame is shown and pulses still work frame by frame.
   */
  import { onMount } from 'svelte';
  import { createGpuFdtd, type GpuFdtd } from '../../lib/gl/fdtd-gpu';
  import { createFieldRenderer, type FieldRenderer } from '../../lib/gl/field-renderer';
  import {
    addPulse,
    createFdtd2D,
    stepFdtd2D,
    type Fdtd2DState,
    type Grid2D,
  } from '../../lib/physics/fdtd2d';
  import { currentTheme, onThemeChange } from '../../lib/viz/loop';
  import { lut } from '../../lib/viz/luts';
  import { playPulse } from '../../lib/audio/synth/click';
  import { audio } from '../../lib/audio/engine';
  import { ICONS } from '../../lib/icons';

  let { alt }: { alt: string } = $props();
  let canvas: HTMLCanvasElement;
  let sound = $state(false);
  let mode = $state<'gpu' | 'cpu'>('gpu');
  const COURANT = 0.5;
  const DAMPING = 4e-4;
  const AMP = 1;
  const SCALE = 0.12;

  onMount(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let gl: WebGL2RenderingContext | null = null;
    let sim: GpuFdtd | null = null;
    let renderer: FieldRenderer | null = null;
    let cpu: { g: Grid2D; s: Fdtd2DState; img: ImageData; off: HTMLCanvasElement } | null = null;
    let nx = 0;
    let ny = 0;
    let cell = 4;

    function setup() {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      // ~3 CSS px per cell on large screens, coarser on small/weak devices.
      cell = r.width < 700 ? 3.5 : 3;
      nx = Math.max(64, Math.round(r.width / cell));
      ny = Math.max(64, Math.round(r.height / cell));
      sim?.dispose();
      sim = null;
      cpu = null;
      try {
        gl = canvas.getContext('webgl2', {
          antialias: false,
          alpha: false,
          preserveDrawingBuffer: false,
        });
      } catch {
        gl = null;
      }
      if (gl) {
        sim = createGpuFdtd(gl, nx, ny, COURANT, DAMPING);
        renderer ??= createFieldRenderer(gl);
        renderer.setLut(lut('pressure', currentTheme()));
      }
      if (!sim) {
        mode = 'cpu';
        const cw = Math.round(nx / 2);
        const ch = Math.round(ny / 2);
        const g: Grid2D = { nx: cw, ny: ch, courant: COURANT, damping: DAMPING * 2 };
        const off = document.createElement('canvas');
        off.width = cw;
        off.height = ch;
        cpu = { g, s: createFdtd2D(g), img: new ImageData(cw, ch), off };
      }
      seed();
    }

    function pulseAt(fx: number, fy: number, a = AMP) {
      if (sim) sim.pulse(fx * nx, (1 - fy) * ny, a, 2.2);
      else if (cpu) addPulse(cpu.g, cpu.s, fx * cpu.g.nx, fy * cpu.g.ny, a, 1.4);
    }

    function step(n: number) {
      if (sim) sim.step(n);
      else if (cpu) stepFdtd2D(cpu.g, cpu.s, Math.max(1, Math.round(n / 2)));
    }

    function draw() {
      if (sim && renderer && gl) {
        renderer.draw({
          source: 'texture',
          texture: sim.texture(),
          scale: SCALE,
          width: canvas.width,
          height: canvas.height,
        });
      } else if (cpu) {
        const table = lut('pressure', currentTheme());
        const { s, img, off, g } = cpu;
        const n = table.length / 4;
        for (let k = 0; k < g.nx * g.ny; k++) {
          const v = Math.max(-1, Math.min(1, s.curr[k]! / SCALE));
          const i = Math.round(((v + 1) / 2) * (n - 1)) * 4;
          img.data[4 * k] = table[i]!;
          img.data[4 * k + 1] = table[i + 1]!;
          img.data[4 * k + 2] = table[i + 2]!;
          img.data[4 * k + 3] = 255;
        }
        off.getContext('2d')!.putImageData(img, 0, 0);
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
      }
    }

    function seed() {
      // A deterministic opening scene: three pulses, staggered.
      pulseAt(0.62, 0.32);
      step(140);
      pulseAt(0.84, 0.62);
      step(60);
      pulseAt(0.42, 0.22);
      step(60);
      draw();
    }

    setup();

    let raf = 0;
    let visible = true;
    const loop = () => {
      raf = 0;
      step(2);
      draw();
      schedule();
    };
    const schedule = () => {
      if (!raf && visible && !document.hidden && !reduced) raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      schedule();
    });
    io.observe(canvas);
    document.addEventListener('visibilitychange', schedule);

    const onDown = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width;
      const fy = (e.clientY - r.top) / r.height;
      pulseAt(fx, fy);
      if (sound) void playPulse(0.7 + (1 - fy) * 0.8);
      if (reduced) {
        // Frame by frame: advance a little so the pulse is visible.
        step(40);
        draw();
      }
    };
    canvas.addEventListener('pointerdown', onDown);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pulseAt(0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.4);
        if (sound) void playPulse(1);
      }
    };
    canvas.addEventListener('keydown', onKey);
    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(setup, 200);
    };
    addEventListener('resize', onResize);
    const offTheme = onThemeChange(() => {
      renderer?.setLut(lut('pressure', currentTheme()));
      draw();
    });
    schedule();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener('visibilitychange', schedule);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('keydown', onKey);
      removeEventListener('resize', onResize);
      offTheme();
      sim?.dispose();
      renderer?.dispose();
    };
  });
</script>

<canvas bind:this={canvas} class="field" role="img" aria-label={alt} tabindex="0" data-mode={mode}
></canvas>
<button
  type="button"
  class="listen"
  aria-pressed={sound}
  onclick={async () => {
    sound = !sound;
    if (sound) await audio.start();
  }}
>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- static icon -->
  {@html sound ? ICONS.sound : ICONS.mute}{sound ? 'Son activé' : 'Écouter'}
</button>

<style>
  .field {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    touch-action: manipulation;
    cursor: crosshair;
  }
  .listen {
    position: absolute;
    top: var(--space-3);
    right: var(--space-4);
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--touch);
    padding: 0 var(--space-4);
    border: 1px solid var(--color-ink);
    border-radius: var(--radius);
    background: var(--color-bg);
    font-family: var(--font-sans);
    font-weight: 650;
    font-size: var(--text-ui);
    cursor: pointer;
  }
  .listen[aria-pressed='true'] {
    background: var(--color-ink);
    color: var(--color-bg);
  }
</style>
