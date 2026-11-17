<script lang="ts">
  /**
   * Animated complex field Re{P e^{−iωt}} on a grid. The field is recomputed only when
   * `version` changes; each frame costs one draw (WebGL2) or one CPU pass over the grid
   * when WebGL is unavailable. Internal building block (function props), not an island.
   */
  import { onMount } from 'svelte';
  import { createFieldRenderer, type FieldRenderer } from '../../lib/gl/field-renderer';
  import { createLoop, currentTheme, onThemeChange } from '../../lib/viz/loop';
  import { lut } from '../../lib/viz/luts';

  let {
    nx,
    ny,
    field,
    version,
    scale = 1,
    playing,
    speed = 0.6,
    alt,
    aspect = '16 / 10',
  }: {
    nx: number;
    ny: number;
    /** Interleaved Re, Im, row-major, row 0 at the bottom. */
    field: () => Float32Array;
    version: unknown;
    scale?: number;
    playing: () => boolean;
    speed?: number;
    alt: string;
    aspect?: string;
  } = $props();

  let canvas: HTMLCanvasElement;
  let renderer: FieldRenderer | null = null;
  let data: Float32Array | null = null;
  let cpu: { img: ImageData; off: HTMLCanvasElement } | null = null;
  let phase = 0;

  function upload() {
    data = field();
    renderer?.setPhasor(nx, ny, data);
  }

  function draw() {
    if (!canvas || !data) return;
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = Math.max(1, Math.round(r.width * dpr));
    const H = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    if (renderer) {
      renderer.draw({ source: 'phasor', phase, scale, width: W, height: H });
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!cpu || cpu.img.width !== nx || cpu.img.height !== ny) {
      const off = document.createElement('canvas');
      off.width = nx;
      off.height = ny;
      cpu = { img: new ImageData(nx, ny), off };
    }
    const table = lut('pressure', currentTheme());
    const n = table.length / 4;
    const c = Math.cos(phase);
    const s = Math.sin(phase);
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        const v = Math.max(-1, Math.min(1, (data[2 * k]! * c + data[2 * k + 1]! * s) / scale));
        const t = Math.round(((v + 1) / 2) * (n - 1)) * 4;
        const o = ((ny - 1 - j) * nx + i) * 4; // ImageData row 0 is the top
        cpu.img.data[o] = table[t]!;
        cpu.img.data[o + 1] = table[t + 1]!;
        cpu.img.data[o + 2] = table[t + 2]!;
        cpu.img.data[o + 3] = 255;
      }
    cpu.off.getContext('2d')!.putImageData(cpu.img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(cpu.off, 0, 0, W, H);
  }

  onMount(() => {
    let gl: WebGL2RenderingContext | null;
    try {
      gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    } catch {
      gl = null;
    }
    if (gl) {
      try {
        renderer = createFieldRenderer(gl);
        renderer.setLut(lut('pressure', currentTheme()));
      } catch {
        renderer = null;
      }
    }
    upload();
    draw();
    const loop = createLoop(
      canvas,
      (dt) => {
        phase = (phase + dt * 2 * Math.PI * speed) % (2 * Math.PI);
        draw();
      },
      playing,
    );
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    const off = onThemeChange(() => {
      renderer?.setLut(lut('pressure', currentTheme()));
      draw();
    });
    return () => {
      loop.destroy();
      ro.disconnect();
      off();
      renderer?.dispose();
    };
  });

  $effect(() => {
    void version;
    upload();
    draw();
  });
  // Restart the loop when play is toggled.
  $effect(() => {
    void playing();
    draw();
  });
</script>

<canvas bind:this={canvas} class="phasor" style:aspect-ratio={aspect} role="img" aria-label={alt}
></canvas>

<style>
  .phasor {
    display: block;
    width: 100%;
    background: var(--color-bg);
  }
</style>
