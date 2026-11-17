<script lang="ts">
  /**
   * Chapter 2, D4: standing wave in front of a wall of specific impedance
   * Z_s = ρ₀c₀(ζ' + iζ''). The envelope |P(x)| reveals |R| (standing-wave ratio) and,
   * by the position of its minima, the phase of R: the impedance-tube measurement.
   */
  import { onMount } from 'svelte';
  import { useScene } from '../../lib/scene/scene.svelte';
  import { createLoop, cssVar, fitCanvas, onThemeChange } from '../../lib/viz/loop';
  import { formatNumber } from '../../lib/scene/format';
  import { C, abs, add, arg, cis, mul } from '../../lib/physics/complex';
  import { absorption, standingWaveRatio, surfaceReflection } from '../../lib/physics/absorption';
  import VizFrame from './VizFrame.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('2-standing');
  const Z0 = 413;
  let canvas: HTMLCanvasElement;
  let phase = 0;

  const Zs = $derived(C(scene.params.res! * Z0, scene.params.reac! * Z0));
  const R = $derived(surfaceReflection(Zs, Z0));
  const alpha = $derived(absorption(Zs, Z0));
  const swr = $derived(standingWaveRatio(R));
  // Wall at x = 0, fluid at x < 0, x in wavelengths. P(x) = e^{ikx} + R e^{−ikx}.
  const P = (x: number) => add(cis(2 * Math.PI * x), mul(R, cis(-2 * Math.PI * x)));
  // |P|² = 1 + |R|² + 2|R| cos(4πx − φ): first minimum in front of the wall (wavelengths).
  // Rigid wall (φ = 0): x = −λ/4.
  const xmin = $derived((arg(R) + Math.PI) / (4 * Math.PI) - 0.5);

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
    const X0 = 40;
    const Xw = w - 40;
    const span = 1.5; // wavelengths shown
    const xOf = (px: number) => ((px - Xw) / (Xw - X0)) * span;
    const pxOf = (x: number) => Xw + (x / span) * (Xw - X0);
    const mid = h / 2;
    const A = h * 0.21;
    // wall
    ctx.fillStyle = ink;
    ctx.fillRect(Xw, 16, 6, h - 32);
    for (let y = 16; y < h - 16; y += 10) {
      ctx.strokeStyle = muted;
      ctx.beginPath();
      ctx.moveTo(Xw + 6, y);
      ctx.lineTo(Xw + 14, y + 8);
      ctx.stroke();
    }
    ctx.strokeStyle = rule;
    ctx.beginPath();
    ctx.moveTo(X0, mid);
    ctx.lineTo(Xw, mid);
    ctx.stroke();
    // envelope ±|P|
    ctx.strokeStyle = ink;
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.25;
    for (const sgn of [1, -1]) {
      ctx.beginPath();
      for (let px = X0; px <= Xw; px += 2) {
        const y = mid - sgn * abs(P(xOf(px))) * A;
        if (px === X0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // instantaneous p
    ctx.strokeStyle = cP;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const e = cis(-phase);
    for (let px = X0; px <= Xw; px += 2) {
      const y = mid - mul(P(xOf(px)), e)[0] * A;
      if (px === X0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();
    // minima markers and λ ticks
    ctx.fillStyle = muted;
    ctx.font = `12px ${cssVar('--font-num')}`;
    ctx.textAlign = 'center';
    for (let k = 0; k <= 3; k++) {
      const x = -k * 0.5;
      ctx.fillRect(pxOf(x) - 0.5, h - 22, 1, 6);
      ctx.fillText(k === 0 ? '0' : `−${formatNumber(k / 2, 1)} λ`, pxOf(x), h - 6);
    }
    for (let x = xmin; x > -span; x -= 0.5) {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(pxOf(x), mid - abs(P(x)) * A, 3.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  onMount(() => {
    const loop = createLoop(
      canvas,
      (dt) => {
        phase = (phase + dt * 2 * Math.PI * 0.5 * (scene.slow ? 0.25 : 1)) % (2 * Math.PI);
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
    void R;
    draw();
  });
</script>

<VizFrame
  scene="2-standing"
  {...number ? { number } : {}}
  {title}
  note="paroi à droite ; tirets : enveloppe |P(x)| mesurée par un micro qu'on déplace"
>
  <canvas bind:this={canvas} class="sw" role="img" aria-label={alt}></canvas>
  <div class="readout num" aria-live="polite">
    <span>|<i>R</i>| = <b>{formatNumber(abs(R), 3)}</b></span>
    <span>phase de <i>R</i> <b>{formatNumber((arg(R) * 180) / Math.PI, 0)}°</b></span>
    <span
      >rapport max/min <b>{Number.isFinite(swr) && swr < 1e4 ? formatNumber(swr, 2) : '∞'}</b></span
    >
    <span>absorption <i>α</i> = <b>{formatNumber(alpha, 2)}</b></span>
  </div>
  {#snippet controls()}
    <SymbolSlider scene="2-standing" param="res" />
    <SymbolSlider scene="2-standing" param="reac" />
  {/snippet}
</VizFrame>

<style>
  .sw {
    display: block;
    width: 100%;
    height: 260px;
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
</style>
