<script lang="ts">
  /**
   * Chapter 7, D2: image sources. Each wall reflection is replaced by a mirror image of
   * the source; the receiver hears image i at time R_i/c. An "arrival circle" centred on
   * the receiver grows at the speed of sound: every image it swallows is a reflection
   * already heard. The latest one is drawn as a straight line and as its folded path in
   * the real room. Below: the 3-D echogram, whose density of reflections grows like t².
   */
  import { onMount } from 'svelte';
  import { useScene } from '../../lib/scene/scene.svelte';
  import { createLoop, cssVar, fitCanvas, onThemeChange } from '../../lib/viz/loop';
  import { formatNumber } from '../../lib/scene/format';
  import { imageSources, type Vec3 } from '../../lib/physics/room';
  import VizFrame from './VizFrame.svelte';
  import Plot, { type Series } from './Plot.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('7-images');
  const C0 = 343.2;
  const L: Vec3 = [7, 5, 3];
  const S: Vec3 = [2, 1.8, 1.2];
  const R: Vec3 = [5.2, 3.4, 1.6];
  const TMAX = 0.15; // s of sound, shown over ~8 s
  let canvas: HTMLCanvasElement;
  let t = $state(0);

  const alpha = $derived(scene.params.alpha!);
  const N = $derived(Math.round(scene.params.order!));
  const plan = imageSources([L[0], L[1], Infinity], S, R, C0 * TMAX);
  const shown = $derived(plan.filter((i) => i.order <= N));
  const all = imageSources(L, S, R, C0 * TMAX);
  const arrived = $derived(all.filter((im) => im.R <= C0 * t).length);
  // Each reflection as a stem: level relative to the direct sound, (1 − α)^n R₀²/R².
  const series: Series[] = $derived([
    {
      points: all.map(
        (im) =>
          [
            (im.R / C0) * 1000,
            Math.max(-40, 10 * Math.log10(((1 - alpha) ** im.order * all[0]!.R ** 2) / im.R ** 2)),
          ] as const,
      ),
      color: 'var(--color-energy)',
      width: 1,
      stems: true,
    },
  ]);
  const density = $derived((4 * Math.PI * C0 ** 3 * t * t) / (L[0] * L[1] * L[2]) / 1000);

  const fold = (x: number, Li: number) => {
    const m = ((x % (2 * Li)) + 2 * Li) % (2 * Li);
    return m > Li ? 2 * Li - m : m;
  };

  function draw() {
    if (!canvas) return;
    const { w, h, dpr } = fitCanvas(canvas);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const ink = cssVar('--color-ink');
    const muted = cssVar('--color-ink-muted');
    const rule = cssVar('--color-rule');
    const crest = cssVar('--color-pressure-pos');
    const span = 2 * N + 1;
    const ppm = Math.min((w - 8) / (span * L[0]), (h - 8) / (span * L[1]));
    const ox = w / 2 - (L[0] / 2) * ppm;
    const oy = h / 2 + (L[1] / 2) * ppm;
    const X = (x: number) => ox + x * ppm;
    const Y = (y: number) => oy - y * ppm;
    // mirrored rooms
    ctx.strokeStyle = rule;
    ctx.lineWidth = 1;
    for (let i = -N; i <= N; i++)
      for (let j = -N; j <= N; j++) {
        if (Math.abs(i) + Math.abs(j) > N) continue;
        ctx.strokeRect(X(i * L[0]), Y((j + 1) * L[1]), L[0] * ppm, L[1] * ppm);
      }
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(X(0), Y(L[1]), L[0] * ppm, L[1] * ppm);
    // arrival circle
    const rad = C0 * t * ppm;
    ctx.strokeStyle = crest;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(X(R[0]), Y(R[1]), rad, 0, 2 * Math.PI);
    ctx.stroke();
    // images
    let last: (typeof shown)[number] | null = null;
    for (const im of shown) {
      const inside = im.R <= C0 * t;
      if (inside && im.order > 0) last = im;
      const g = Math.sqrt((1 - alpha) ** im.order);
      ctx.globalAlpha = 0.25 + 0.75 * g;
      ctx.fillStyle = inside ? ink : muted;
      ctx.beginPath();
      ctx.arc(X(im.p[0]), Y(im.p[1]), im.order === 0 ? 6 : 4, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // latest reflection: straight line from its image, and the folded path in the room
    if (last) {
      ctx.strokeStyle = muted;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X(last.p[0]), Y(last.p[1]));
      ctx.lineTo(X(R[0]), Y(R[1]));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = 0; k <= 400; k++) {
        const u = k / 400;
        const x = fold(last.p[0] + (R[0] - last.p[0]) * u, L[0]);
        const y = fold(last.p[1] + (R[1] - last.p[1]) * u, L[1]);
        if (k) ctx.lineTo(X(x), Y(y));
        else ctx.moveTo(X(x), Y(y));
      }
      ctx.stroke();
    }
    // receiver
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.fillStyle = cssVar('--color-bg');
    ctx.beginPath();
    ctx.arc(X(R[0]), Y(R[1]), 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  onMount(() => {
    const loop = createLoop(
      canvas,
      (dt) => {
        t = (t + (dt * TMAX) / (scene.slow ? 30 : 8)) % TMAX;
        draw();
      },
      () => scene.playing,
    );
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    const off = onThemeChange(draw);
    return () => {
      loop.destroy();
      ro.disconnect();
      off();
    };
  });
  $effect(() => {
    void [alpha, N];
    draw();
  });
</script>

<VizFrame
  scene="7-images"
  {...number ? { number } : {}}
  {title}
  note="salle de 7 × 5 × 3 m ; vue en plan, images dans le plan horizontal"
>
  <canvas bind:this={canvas} class="lattice" role="img" aria-label={alt}></canvas>
  <div class="readout num" aria-live="polite">
    <span>t <b>{formatNumber(t * 1000, 0)} ms</b></span>
    <span>réflexions arrivées (3D) <b>{arrived - 1}</b></span>
    <span>densité <b>{formatNumber(density, 1)} par ms</b></span>
  </div>
  <div class="pad">
    <p class="ylab">échogramme : niveau de chaque réflexion par rapport au son direct (dB)</p>
    <Plot
      x={{ min: 0, max: TMAX * 1000, label: 't (ms)' }}
      y={{ min: -40, max: 2 }}
      {series}
      vlines={[{ x: t * 1000, color: 'var(--color-pressure-pos)', dash: '2 3' }]}
      height={170}
      ariaLabel="Échogramme : le son direct, puis des réflexions d'abord isolées, de plus en plus serrées et de plus en plus faibles."
    />
  </div>
  {#snippet legend()}
    <div class="keys">
      <span class="key"><i class="s"></i>source et images</span>
      <span class="key"><i class="r"></i>auditeur</span>
      <span class="key"><i class="c"></i>son arrivé à l'instant t</span>
    </div>
  {/snippet}
  {#snippet controls()}
    <SymbolSlider scene="7-images" param="alpha" />
    <SymbolSlider scene="7-images" param="order" />
  {/snippet}
</VizFrame>

<style>
  .lattice {
    display: block;
    width: 100%;
    height: 380px;
  }
  @media (max-width: 720px) {
    .lattice {
      height: 280px;
    }
  }
  .pad {
    padding-top: var(--space-3);
  }
  .ylab {
    margin: 0 0 var(--space-1);
    font-family: var(--font-sans);
    font-size: 0.8125rem;
    color: var(--color-ink-muted);
  }
  .readout {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-6);
    padding: var(--space-3) 0;
    border-top: 1px solid var(--color-rule);
    border-bottom: 1px solid var(--color-rule);
    font-size: 1rem;
  }
  b {
    font-weight: 600;
  }
  .keys {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    color: var(--color-ink-muted);
    font-family: var(--font-sans);
  }
  .key {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .key i {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  .key i.s {
    background: var(--color-ink);
  }
  .key i.r {
    border: 2px solid var(--color-ink);
  }
  .key i.c {
    border: 2px solid var(--color-pressure-pos);
  }
</style>
