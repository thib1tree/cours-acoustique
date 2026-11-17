<script lang="ts">
  /**
   * D6: d'Alembert. Pulses travel at ±c₀ without deforming and cross without
   * perturbing each other. The reader can draw an initial pressure profile.
   * Shows p (carmine) and Z·v (teal); optional split into f and g; energy bars.
   */
  import { onMount } from 'svelte';
  import { useScene } from '../../lib/scene/scene.svelte';
  import { createLoop, cssVar, fitCanvas, onThemeChange } from '../../lib/viz/loop';
  import {
    decompose,
    gaussian,
    pressureAt,
    velocityAt,
    type Profile,
  } from '../../lib/physics/dalembert';
  import VizFrame from './VizFrame.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('1a-dalembert');
  const c0 = 343;
  const Z = 413;
  const HALF = 2; // domain [−2, 2] m
  const SPEED = 0.7; // displayed m per second of animation

  let canvas: HTMLCanvasElement;
  let t = 0;
  let drawn: Float64Array | null = $state(null);
  let drawing = false;
  let drawMode = $state(false);
  const N = 400;

  const w = $derived(scene.params.w! / 100);
  const start = $derived(scene.views.start ?? 'rest');
  const split = $derived(scene.views.parts === 'split');

  function sampled(arr: Float64Array): Profile {
    return (x) => {
      const u = ((x + HALF) / (2 * HALF)) * (N - 1);
      if (u < 0 || u > N - 1) return 0;
      const i = Math.floor(u);
      const a = arr[i]!;
      const b = arr[Math.min(N - 1, i + 1)]!;
      return a + (u - i) * (b - a);
    };
  }

  const state = $derived.by(() => {
    if (drawn) {
      const p0 = sampled(drawn);
      return decompose(p0, start === 'right' ? (x) => p0(x) / Z : () => 0, Z);
    }
    if (start === 'cross') {
      const h = gaussian(1, 0, w);
      return decompose(
        (x) => h(x + 1) - h(x - 1),
        (x) => (h(x + 1) + h(x - 1)) / Z,
        Z,
      );
    }
    const p0 = gaussian(1, start === 'right' ? -1.2 : 0, w);
    return decompose(p0, start === 'right' ? (x) => p0(x) / Z : () => 0, Z);
  });

  function draw() {
    if (!canvas) return;
    const { w: W, h: H, dpr } = fitCanvas(canvas);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const ink = cssVar('--color-ink');
    const muted = cssVar('--color-ink-muted');
    const rule = cssVar('--color-rule');
    const cP = cssVar('--color-pressure-pos');
    const cV = cssVar('--color-velocity');
    const cE = cssVar('--color-energy');
    const barsW = 120;
    const X0 = 12;
    const X1 = W - barsW - 16;
    const mid = H * 0.55;
    const A = H * 0.36;
    const xOf = (px: number) => ((px - X0) / (X1 - X0)) * 2 * HALF - HALF;
    const tp = t / c0;
    ctx.strokeStyle = rule;
    ctx.beginPath();
    ctx.moveTo(X0, mid);
    ctx.lineTo(X1, mid);
    ctx.stroke();
    const line = (fn: (x: number) => number, color: string, width: number, dash: number[] = []) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.beginPath();
      for (let px = X0; px <= X1; px += 2) {
        const y = mid - fn(xOf(px)) * A;
        if (px === X0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    if (split) {
      line((x) => state.f(x - c0 * tp), muted, 1.5, [6, 4]);
      line((x) => state.g(x + c0 * tp), muted, 1.5, [2, 3]);
    }
    line((x) => pressureAt(state, x, tp, c0), cP, scene.hovered === 'p' ? 4 : 2.5);
    line((x) => Z * velocityAt(state, x, tp, c0, Z), cV, scene.hovered === 'v' ? 3 : 1.75);
    // Energy totals (normalized to the initial total).
    let ek = 0;
    let ep = 0;
    for (let i = 0; i <= 200; i++) {
      const x = -HALF * 1.5 + (3 * HALF * i) / 200;
      const p = pressureAt(state, x, tp, c0);
      const zv = Z * velocityAt(state, x, tp, c0, Z);
      ep += p * p;
      ek += zv * zv;
    }
    const tot = ek + ep || 1;
    const bx = W - barsW;
    const bh = H - 60;
    ctx.font = `12px ${cssVar('--font-sans')}`;
    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    ctx.font = `11px ${cssVar('--font-sans')}`;
    ctx.fillText('cinétique', bx + 26, H - 14);
    ctx.fillText('potentielle', bx + 86, H - 14);
    ctx.fillStyle = cE;
    ctx.fillRect(bx + 14, 20 + bh * (1 - ek / tot), 24, (bh * ek) / tot);
    ctx.globalAlpha = 0.45;
    ctx.fillRect(bx + 74, 20 + bh * (1 - ep / tot), 24, (bh * ep) / tot);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ink;
    ctx.strokeRect(bx + 14, 20, 24, bh);
    ctx.strokeRect(bx + 74, 20, 24, bh);
    if (drawMode) {
      ctx.fillStyle = muted;
      ctx.textAlign = 'left';
      ctx.font = `12px ${cssVar('--font-sans')}`;
      ctx.fillText('Dessinez une impulsion avec le doigt ou la souris.', X0 + 4, 16);
    }
  }

  function drawAt(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    const X0 = 12;
    const X1 = r.width - 120 - 16;
    const u = (e.clientX - r.left - X0) / (X1 - X0);
    const val = Math.max(
      -1.2,
      Math.min(1.2, (r.height * 0.55 - (e.clientY - r.top)) / (r.height * 0.36)),
    );
    if (!drawn) drawn = new Float64Array(N);
    const i = Math.round(u * (N - 1));
    for (let k = -4; k <= 4; k++) {
      const j = i + k;
      if (j >= 0 && j < N) drawn[j] = drawn[j]! + (val - drawn[j]!) * Math.exp(-(k * k) / 8);
    }
    drawn = drawn; // trigger reactivity
    t = 0;
    draw();
  }

  onMount(() => {
    const loop = createLoop(
      canvas,
      (dt) => {
        t += dt * SPEED * (scene.slow ? 0.25 : 1);
        // Restart once every pulse has left the window.
        if (t > (start === 'right' || drawn ? 2 * HALF + 3 * w : HALF + 3 * w)) t = 0;
        draw();
      },
      () => scene.playing && !drawing,
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
    void [state, split, scene.hovered];
    draw();
  });
  $effect(() => {
    void [scene.epoch, start, w];
    drawn = null;
    t = 0;
    draw();
  });
</script>

<VizFrame
  scene="1a-dalembert"
  {...number ? { number } : {}}
  {title}
  note="à droite : énergies totales, cinétique et potentielle"
>
  <canvas
    bind:this={canvas}
    class="pulse"
    class:drawable={drawMode}
    role="img"
    aria-label={alt}
    onpointerdown={(e) => {
      if (!drawMode) return;
      drawing = true;
      canvas.setPointerCapture(e.pointerId);
      drawn = null;
      drawAt(e);
    }}
    onpointermove={(e) => drawing && drawAt(e)}
    onpointerup={() => {
      if (!drawing) return;
      drawing = false;
      drawMode = false;
      t = 0;
    }}
  ></canvas>
  {#snippet legend()}
    <div class="keys">
      <span class="key"><i style:background="var(--color-pressure-pos)"></i>pression</span>
      <span class="key"><i style:background="var(--color-velocity)"></i>vitesse × ρ₀c₀</span>
      {#if split}<span class="key"><i class="dash"></i>f et g</span>{/if}
    </div>
  {/snippet}
  {#snippet controls()}
    <div>
      <button
        type="button"
        class="draw-btn"
        aria-pressed={drawMode}
        onclick={() => (drawMode = !drawMode)}
        >{drawMode ? 'Annuler le dessin' : 'Dessiner une impulsion'}</button
      >
    </div>
    <SymbolSlider scene="1a-dalembert" param="w" />
    <ViewToggle scene="1a-dalembert" view="start" />
    <ViewToggle scene="1a-dalembert" view="parts" />
  {/snippet}
</VizFrame>

<style>
  .pulse {
    display: block;
    width: 100%;
    height: 300px;
    touch-action: pan-y;
  }
  .pulse.drawable {
    touch-action: none;
    cursor: crosshair;
  }
  .draw-btn {
    min-height: var(--touch);
    padding: 0 var(--space-4);
    border: 1px solid var(--color-ink);
    border-radius: var(--radius);
    background: none;
    cursor: pointer;
    font-family: var(--font-sans);
  }
  .draw-btn[aria-pressed='true'] {
    background: var(--color-ink);
    color: var(--color-bg);
  }
  .keys {
    display: flex;
    gap: var(--space-4);
    color: var(--color-ink-muted);
  }
  .key {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .key i {
    width: 22px;
    height: 3px;
  }
  .key i.dash {
    background: repeating-linear-gradient(
      to right,
      var(--color-ink-muted) 0 6px,
      transparent 6px 10px
    );
  }
  @media (max-width: 760px) {
    .pulse {
      height: 240px;
    }
  }
</style>
