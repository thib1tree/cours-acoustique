<script lang="ts">
  /**
   * Chapter 2, D1–D2: a pressure pulse meets an interface. Exact solution: reflected
   * pulse R·f, transmitted pulse T·f stretched by c₂/c₁. Shows p and Z₁v on both sides
   * and where the energy goes. Presets: rigid wall, pressure release, air → water…
   */
  import { onMount } from 'svelte';
  import { useScene } from '../../lib/scene/scene.svelte';
  import { createLoop, cssVar, fitCanvas, onThemeChange } from '../../lib/viz/loop';
  import { formatNumber } from '../../lib/scene/format';
  import {
    intensityTransmission,
    pulseAtInterface,
    reflection,
    transmission,
  } from '../../lib/physics/interface';
  import VizFrame from './VizFrame.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('2-interface');
  const L = 2; // display half-width
  const X0 = -1.3; // pulse start
  let canvas: HTMLCanvasElement;
  let t = 0;

  const zr = $derived(scene.params.zr!);
  const cr = $derived(scene.params.cr!);
  const R = $derived(reflection(1, zr));
  const T = $derived(transmission(1, zr));
  const tau = $derived(intensityTransmission(1, zr));
  const sol = $derived(
    pulseAtInterface(
      (s) => Math.exp(-((s - X0) ** 2) / (2 * 0.09 ** 2)),
      { rho: 1, c: 1 },
      { rho: zr / cr, c: cr },
    ),
  );

  const PRESETS = [
    { label: 'Paroi rigide', zr: 1e4, cr: 1 },
    { label: 'Surface libre', zr: 1e-4, cr: 1 },
    { label: 'Air vers eau', zr: 3584, cr: 4.32 },
    { label: 'Eau vers air', zr: 1 / 3584, cr: 1 / 4.32 },
    { label: 'Impédances égales', zr: 1, cr: 2 },
  ];

  function draw() {
    if (!canvas) return;
    const { w, h, dpr } = fitCanvas(canvas);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const ink = cssVar('--color-ink');
    const muted = cssVar('--color-ink-muted');
    const rule = cssVar('--color-rule');
    const cP = cssVar('--color-pressure-pos');
    const cV = cssVar('--color-velocity');
    const sans = cssVar('--font-sans');
    const barsW = 120;
    const Xl = 10;
    const Xr = w - barsW - 20;
    const xOf = (px: number) => ((px - Xl) / (Xr - Xl)) * 2 * L - L;
    const pxOf = (x: number) => Xl + ((x + L) / (2 * L)) * (Xr - Xl);
    const mid = h * 0.55;
    const A = h * 0.2;
    const xi = pxOf(0);
    ctx.fillStyle = cssVar('--color-surface');
    ctx.fillRect(xi, 0, Xr - xi, h);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xi, 8);
    ctx.lineTo(xi, h - 8);
    ctx.stroke();
    ctx.fillStyle = muted;
    ctx.font = `13px ${sans}`;
    ctx.textAlign = 'left';
    ctx.fillText('milieu 1', Xl + 4, 20);
    ctx.fillText('milieu 2', xi + 8, 20);
    ctx.strokeStyle = rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Xl, mid);
    ctx.lineTo(Xr, mid);
    ctx.stroke();
    const curve = (fn: (x: number) => number, color: string, width: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let px = Xl; px <= Xr; px += 1.5) {
        const y = mid - Math.max(-2.3, Math.min(2.3, fn(xOf(px)))) * A;
        if (px === Xl) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();
    };
    curve((x) => sol.p(x, t), cP, scene.hovered === 'p' ? 6.5 : 5);
    curve((x) => sol.v(x, t), cV, scene.hovered === 'v' ? 2.5 : 1.75);
    // Energy bars: incident = 1, reflected R², transmitted τ (once the pulse has hit).
    const hit = t > -X0 + 0.25;
    const bx = w - barsW;
    const bh = h - 70;
    const bars: [string, number, string][] = [
      ['réfléchie', hit ? R * R : 0, cssVar('--color-energy')],
      ['transmise', hit ? tau : 0, cssVar('--color-energy')],
    ];
    bars.forEach(([label, val, col], i) => {
      const x = bx + 14 + i * 56;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, 24, 28, bh);
      ctx.fillStyle = col;
      ctx.globalAlpha = i === 0 ? 1 : 0.55;
      ctx.fillRect(x, 24 + bh * (1 - val), 28, bh * val);
      ctx.globalAlpha = 1;
      ctx.fillStyle = muted;
      ctx.font = `11px ${sans}`;
      ctx.textAlign = 'center';
      ctx.fillText(label, x + 14, h - 30);
      ctx.font = `12px ${cssVar('--font-num')}`;
      ctx.fillText(hit ? `${formatNumber(100 * val, val < 0.01 ? 2 : 0)} %` : '', x + 14, h - 14);
    });
  }

  onMount(() => {
    const loop = createLoop(
      canvas,
      (dt) => {
        t += dt * 0.55 * (scene.slow ? 0.25 : 1);
        if (t > 3.6) t = 0;
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
    void [sol, scene.hovered];
    draw();
  });
  $effect(() => {
    void scene.epoch;
    t = 0;
    draw();
  });
</script>

<VizFrame
  scene="2-interface"
  {...number ? { number } : {}}
  {title}
  note="à droite : part de l'énergie incidente"
>
  <canvas bind:this={canvas} class="iface" role="img" aria-label={alt}></canvas>
  <div class="readout num" aria-live="polite">
    <span><i>R</i> = <b>{formatNumber(R, 3)}</b></span>
    <span><i>T</i> = 1 + <i>R</i> = <b>{formatNumber(T, 3)}</b></span>
    <span>énergie transmise <b>{formatNumber(100 * tau, tau < 0.01 ? 2 : 1)} %</b></span>
  </div>
  {#snippet legend()}
    <div class="keys">
      <span class="key"><i style:background="var(--color-pressure-pos)"></i>pression</span>
      <span class="key"><i style:background="var(--color-velocity)"></i>vitesse × Z₁</span>
    </div>
  {/snippet}
  {#snippet controls()}
    <SymbolSlider scene="2-interface" param="zr" />
    <SymbolSlider scene="2-interface" param="cr" />
    <div class="presets" role="group" aria-label="Préréglages">
      {#each PRESETS as pr (pr.label)}
        <button type="button" onclick={() => scene.apply({ params: { zr: pr.zr, cr: pr.cr } })}
          >{pr.label}</button
        >
      {/each}
    </div>
  {/snippet}
</VizFrame>

<style>
  .iface {
    display: block;
    width: 100%;
    height: 280px;
  }
  .readout {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-6);
    padding: var(--space-3) 0;
    border-top: 1px solid var(--color-rule);
    font-size: 1rem;
  }
  b {
    font-weight: 600;
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
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    grid-column: 1 / -1;
  }
  .presets button {
    min-height: var(--touch);
    padding: 0 var(--space-3);
    border: 1px solid var(--color-rule);
    border-radius: var(--radius);
    background: none;
    cursor: pointer;
    font-family: var(--font-sans);
  }
  .presets button:hover {
    border-color: var(--color-ink);
  }
  @media (max-width: 760px) {
    .iface {
      height: 230px;
    }
  }
</style>
