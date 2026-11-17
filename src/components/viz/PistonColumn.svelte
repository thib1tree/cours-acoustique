<script lang="ts">
  /**
   * D7: p = ρ₀c₀v without calculus. A piston starts moving at speed v; the front
   * advances at c₀; in dt the mass ρ₀c₀dt (per m²) is set in motion at v, which takes
   * the impulse p·dt. Air vs water at the same piston speed.
   */
  import { onMount } from 'svelte';
  import { useScene } from '../../lib/scene/scene.svelte';
  import { createLoop, cssVar, currentTheme, fitCanvas, onThemeChange } from '../../lib/viz/loop';
  import { lut, pressureColor } from '../../lib/viz/luts';
  import { formatNumber } from '../../lib/scene/format';
  import {
    AIR,
    TABULATED_MEDIA,
    celsiusToKelvin,
    celerityFromModulus,
    gasDensity,
    gasSoundSpeed,
  } from '../../lib/physics/media';
  import VizFrame from './VizFrame.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('1b-piston');
  const T = celsiusToKelvin(20);
  const water = TABULATED_MEDIA[0]!;
  const MEDIA = {
    air: { rho: gasDensity(AIR, T), c: gasSoundSpeed(AIR, T) },
    water: { rho: water.rho, c: celerityFromModulus(water.modulus, water.rho) },
  };
  const m = $derived(MEDIA[(scene.views.medium ?? 'air') as 'air' | 'water']);
  const v = $derived(scene.params.v! / 1000);
  const p = $derived(m.rho * m.c * v);
  let canvas: HTMLCanvasElement;
  let s = 0; // front position as a fraction of the tube

  function draw() {
    if (!canvas) return;
    const { w, h, dpr } = fitCanvas(canvas);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const ink = cssVar('--color-ink');
    const muted = cssVar('--color-ink-muted');
    const rule = cssVar('--color-rule');
    const cV = cssVar('--color-velocity');
    const X0 = 40,
      X1 = w - 16,
      top = 24,
      bh = h * 0.5;
    const xf = X0 + s * (X1 - X0);
    ctx.fillStyle = pressureColor(0.55, lut('pressure', currentTheme()));
    ctx.fillRect(X0, top, xf - X0, bh);
    ctx.strokeStyle = rule;
    ctx.strokeRect(X0, top, X1 - X0, bh);
    const shift = 7 * s; // displayed displacement of the piston
    ctx.fillStyle = ink;
    ctx.fillRect(X0 - 10 + shift, top - 6, 10, bh + 12);
    const n = Math.floor((X1 - X0) / 14);
    ctx.strokeStyle = ink;
    for (let i = 1; i < n; i++) {
      const x0 = X0 + i * 14;
      const x = x0 < xf ? x0 + shift * (1 - (x0 - X0) / Math.max(1, xf - X0)) : x0;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(x, top + 5);
      ctx.lineTo(x, top + bh - 5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xf, top - 10);
    ctx.lineTo(xf, top + bh + 10);
    ctx.stroke();
    ctx.setLineDash([]);
    const arrow = (x0: number, x1: number, y: number, color: string, label: string) => {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1 - 6, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x1 - 9, y - 5);
      ctx.lineTo(x1 - 9, y + 5);
      ctx.fill();
      ctx.font = `italic 17px ${cssVar('--font-serif')}`;
      ctx.textAlign = 'center';
      ctx.fillText(label, (x0 + x1) / 2, y - 8);
    };
    arrow(X0 + 6, X0 + 66, top + bh + 36, cV, 'v');
    if (xf + 70 < X1) arrow(xf + 6, xf + 66, top + bh + 36, ink, 'c₀');
    ctx.fillStyle = muted;
    ctx.font = `12px ${cssVar('--font-sans')}`;
    ctx.textAlign = 'left';
    if (xf - X0 > 140) ctx.fillText('fluide mis en mouvement à v', X0 + 6, top + bh + 58);
  }

  onMount(() => {
    const loop = createLoop(
      canvas,
      (dt) => {
        s += dt * 0.22 * (scene.slow ? 0.25 : 1);
        if (s > 1.15) s = 0;
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
    void [m, v, scene.epoch];
    s = 0.6;
    draw();
  });
</script>

<VizFrame scene="1b-piston" {...number ? { number } : {}} {title}>
  <canvas bind:this={canvas} class="piston" role="img" aria-label={alt}></canvas>
  <div class="readout num" aria-live="polite">
    <span><i>ρ</i>₀ = {formatNumber(m.rho, m.rho < 10 ? 3 : 1)} kg/m³</span>
    <span><i>c</i>₀ = {formatNumber(m.c)} m/s</span>
    <span><i>ρ</i>₀<i>c</i>₀ = {formatNumber(m.rho * m.c)} Pa·s/m</span>
    <span class="p"><i>p</i> = {p < 1 ? formatNumber(p, 3) : formatNumber(p)} Pa</span>
  </div>
  {#snippet controls()}
    <SymbolSlider scene="1b-piston" param="v" />
    <ViewToggle scene="1b-piston" view="medium" />
  {/snippet}
</VizFrame>

<style>
  .piston {
    display: block;
    width: 100%;
    height: 220px;
  }
  .readout {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-6);
    padding: var(--space-3) 0;
    border-top: 1px solid var(--color-rule);
    font-size: 1rem;
  }
  .p {
    font-weight: 600;
  }
</style>
