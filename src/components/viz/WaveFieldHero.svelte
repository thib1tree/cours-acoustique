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

  /**
   * True when WebGL would run on a software rasterizer (no usable GPU). Probed on a
   * throw-away canvas so the visible one can still fall back to a 2D context.
   */
  function softwareRenderer(): boolean {
    try {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const info = probe.getExtension('WEBGL_debug_renderer_info');
      const name = info ? String(probe.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /swiftshader|llvmpipe|software|basic render/i.test(name);
    } catch {
      return true;
    }
  }

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

    let coarsen = 1; // raised when frames are too slow (adaptive resolution)
    let software = softwareRenderer(); // no GPU: still frame, animate briefly after each touch
    let burstUntil = 0;
    function setup() {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      // ~3 CSS px per cell on large screens, coarser on small or slow devices.
      cell = (r.width < 700 ? 3.5 : 3) * coarsen;
      nx = Math.max(64, Math.round(r.width / cell));
      ny = Math.max(64, Math.round(r.height / cell));
      sim?.dispose();
      sim = null;
      cpu = null;
      // A canvas keeps its first context type: only ask for WebGL when it will be used,
      // otherwise the CPU fallback could not get its 2D context.
      if (!software && !gl) {
        try {
          gl = canvas.getContext('webgl2', {
            antialias: false,
            alpha: false,
            preserveDrawingBuffer: false,
          });
        } catch {
          gl = null;
        }
      }
      // Without a GPU, the CPU reference solver is faster than emulated WebGL.
      if (gl && !software) {
        sim = createGpuFdtd(gl, nx, ny, COURANT, DAMPING);
        renderer ??= createFieldRenderer(gl);
        renderer.setLut(lut('pressure', currentTheme()));
      }
      if (!sim) {
        mode = 'cpu';
        // Same grid and scheme as the GPU path: the still frame is computed in chunks.
        const cw = nx;
        const ch = ny;
        const g: Grid2D = { nx: cw, ny: ch, courant: COURANT, damping: DAMPING };
        const off = document.createElement('canvas');
        off.width = cw;
        off.height = ch;
        cpu = { g, s: createFdtd2D(g), img: new ImageData(cw, ch), off };
      }
      seed();
      canvas.dataset.state = `${sim ? 'gpu' : 'cpu'} ${nx}x${ny} coarsen=${coarsen} still=${still()}`;
    }

    function pulseAt(fx: number, fy: number, a = AMP) {
      if (sim) sim.pulse(fx * nx, (1 - fy) * ny, a, 2.2);
      else if (cpu) addPulse(cpu.g, cpu.s, fx * cpu.g.nx, fy * cpu.g.ny, a, 2.2);
    }

    function step(n: number) {
      if (sim) sim.step(n);
      else if (cpu) stepFdtd2D(cpu.g, cpu.s, n);
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
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
      }
    }

    // Opening scene: three pulses emitted at fixed steps of the animation. With reduced
    // motion, the same scene is computed once, in an idle callback, to show a still frame.
    const OPENING: [number, number, number][] = [
      [0, 0.62, 0.32],
      [140, 0.84, 0.62],
      [200, 0.42, 0.22],
    ];
    let clock = 0;
    function stepWithOpening(n: number) {
      for (let i = 0; i < n; i++) {
        for (const [at, x, y] of OPENING) if (clock === at) pulseAt(x, y);
        step(1);
        clock++;
      }
    }
    const still = () => reduced || software;
    function seed() {
      clock = 0;
      if (still()) {
        // Precompute the opening scene in small chunks so the page never blocks.
        const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 30));
        const chunk = () => {
          stepWithOpening(sim ? 4 : 10);
          if (clock % 50 === 0) draw();
          if (clock < 260) idle(chunk);
          else {
            draw();
            canvas.dataset.ready = 'true';
          }
        };
        draw();
        idle(chunk);
      } else {
        draw();
        canvas.dataset.ready = 'true';
      }
    }

    setup();

    let raf = 0;
    let visible = true;
    // Graceful degradation, measured on the real device: three slow frames in a row
    // coarsen the grid; if it is still too slow, switch to a still frame that only
    // animates for a few seconds after each touch (also saves battery).
    let slowStreak = 0;
    let mildStreak = 0;
    let lastFrame = 0;
    const loop = (now: number) => {
      raf = 0;
      if (clock < 260) stepWithOpening(4);
      else step(2);
      draw();
      // GL calls are asynchronous: the cost shows up as the interval between frames.
      const interval = lastFrame ? now - lastFrame : 0;
      lastFrame = now;
      // Budget: ≥ 36 fps (28 ms). Two frames over budget: still frame, animated only
      // after a touch. Mildly slow (20–28 ms) for a while: coarsen the grid once.
      if (interval > 28) slowStreak++;
      else if (interval > 20) mildStreak++;
      else {
        slowStreak = 0;
        mildStreak = 0;
      }
      if (slowStreak >= 2 && !software) {
        software = true;
        burstUntil = 0;
        canvas.dataset.state += ' degraded';
      } else if (mildStreak >= 8 && coarsen === 1) {
        mildStreak = 0;
        coarsen = 1.5;
        setup();
      }
      schedule();
    };
    const animating = () => !reduced && (!software || performance.now() < burstUntil);
    let started = false;
    const schedule = () => {
      if (!started) return;
      if (!raf && visible && !document.hidden && animating()) raf = requestAnimationFrame(loop);
      else if (!raf) lastFrame = 0;
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
      if (software) {
        burstUntil = performance.now() + 5000;
        schedule();
      } else if (reduced) {
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
    // Start animating once the page is idle, so hydration and first frames do not stack.
    const idleStart = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200));
    idleStart(() => {
      started = true;
      schedule();
    });
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
    background: var(--color-bg);
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
