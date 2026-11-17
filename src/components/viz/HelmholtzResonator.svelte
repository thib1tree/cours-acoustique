<script lang="ts">
  /**
   * Chapter 3, D4: a Helmholtz resonator is a mass on a spring. Left: the air plug in the
   * neck oscillates while the cavity is compressed and expanded (uniform pressure). Right:
   * the equivalent mass–spring, moving in step. Sound: blowing across the bottle.
   */
  import { onMount } from 'svelte';
  import { useScene } from '../../lib/scene/scene.svelte';
  import { createLoop, cssVar, currentTheme, fitCanvas, onThemeChange } from '../../lib/viz/loop';
  import { lut, pressureColor } from '../../lib/viz/luts';
  import { formatNumber } from '../../lib/scene/format';
  import { END_CORRECTION } from '../../lib/physics/tubes';
  import { distributedFrequency, helmholtzFrequency } from '../../lib/physics/helmholtz';
  import { startBlown, type Blown } from '../../lib/audio/synth/blown';
  import VizFrame from './VizFrame.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import TermToggles from '../ui/TermToggles.svelte';
  import ListenButton from '../ui/ListenButton.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('3-helmholtz');
  const C0 = 343.2;
  let canvas: HTMLCanvasElement;
  let phase = 0;
  let voice: Blown | null = null;

  const r = $derived({
    V: scene.params.V! * 1e-3,
    a: scene.params.a! * 1e-3,
    L: scene.params.Ln! * 1e-2,
  });
  const corr = $derived(scene.term('endcorr'));
  const f0 = $derived(helmholtzFrequency(r, C0, corr));
  // Bottle-like cavity: cylinder of height 6 radii, used for the distributed check.
  const Rc = $derived(Math.cbrt(r.V / (6 * Math.PI)));
  const fd = $derived(distributedFrequency(r, 6 * Rc, C0, corr));
  const lambdaOverSize = $derived(C0 / f0 / Math.max(6 * Rc, r.L));
  $effect(() => {
    voice?.setFrequency(f0);
  });

  function draw() {
    if (!canvas) return;
    const { w, h, dpr } = fitCanvas(canvas);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const ink = cssVar('--color-ink');
    const muted = cssVar('--color-ink-muted');
    const sans = cssVar('--font-sans');
    const table = lut('pressure', currentTheme());
    const narrow = w < 560;
    const bw = narrow ? w * 0.55 : w * 0.42;
    const cx = bw / 2 + 10;
    // bottle geometry in pixels (schematic, not to scale)
    const cavW = bw * 0.62;
    const cavH = h * 0.5;
    const cavTop = h * 0.4;
    const neckW = Math.max(10, Math.min(cavW * 0.5, (r.a / Math.max(Rc, r.a)) * cavW * 0.5));
    const neckH = Math.min(h * 0.28, 20 + r.L * 600);
    const neckTop = cavTop - neckH;
    const x = Math.sin(phase); // plug displacement (outwards positive)
    const p = -x; // cavity pressure: plug moving in compresses the cavity
    ctx.fillStyle = pressureColor(0.7 * p, table);
    ctx.fillRect(cx - cavW / 2, cavTop, cavW, cavH);
    ctx.strokeStyle = ink;
    ctx.lineWidth = scene.hovered === 'V' ? 3 : 2;
    ctx.strokeRect(cx - cavW / 2, cavTop, cavW, cavH);
    ctx.lineWidth = 2;
    ctx.fillStyle = cssVar('--color-bg');
    ctx.fillRect(cx - neckW / 2, neckTop, neckW, neckH + 2);
    ctx.beginPath();
    ctx.moveTo(cx - neckW / 2, cavTop);
    ctx.lineTo(cx - neckW / 2, neckTop);
    ctx.moveTo(cx + neckW / 2, cavTop);
    ctx.lineTo(cx + neckW / 2, neckTop);
    ctx.stroke();
    // air plug (the mass), with the extra air moving at both ends when corrections are on
    const amp = Math.min(14, neckH * 0.2);
    const plugTop = neckTop + amp * -x * -1;
    const extra = corr ? Math.min(neckH * 0.45, END_CORRECTION.unflanged * neckW * 1.6) : 0;
    ctx.fillStyle = ink;
    ctx.globalAlpha = scene.hovered === 'L' ? 0.9 : 0.75;
    ctx.fillRect(cx - neckW / 2 + 3, plugTop - x * amp, neckW - 6, neckH);
    if (corr) {
      ctx.globalAlpha = scene.hovered === 'endcorr' ? 0.45 : 0.22;
      ctx.fillRect(cx - neckW / 2 + 3, plugTop - x * amp - extra, neckW - 6, extra);
      ctx.fillRect(cx - neckW / 2 + 3, plugTop - x * amp + neckH, neckW - 6, extra);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = muted;
    ctx.font = `12px ${sans}`;
    ctx.textAlign = 'left';
    ctx.fillText('masse : air du col', cx + neckW / 2 + 8, neckTop + neckH / 2);
    ctx.fillText('ressort : air de la cavité', cx - cavW / 2, cavTop + cavH + 16);
    // mass–spring analogue
    const mx = narrow ? w * 0.8 : w * 0.72;
    const baseY = h * 0.9;
    const restY = h * 0.42;
    const my = restY - x * 26;
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.fillRect(mx - 40, baseY, 80, 4);
    ctx.beginPath();
    const coils = 9;
    const top = my + 20;
    for (let i = 0; i <= coils * 2; i++) {
      const y = top + ((baseY - top) * i) / (coils * 2);
      const xx = mx + (i === 0 || i === coils * 2 ? 0 : i % 2 ? 12 : -12);
      if (i === 0) ctx.moveTo(xx, y);
      else ctx.lineTo(xx, y);
    }
    ctx.lineWidth = scene.hovered === 'V' ? 2.5 : 1.5;
    ctx.stroke();
    ctx.fillRect(mx - 22, my - 20, 44, 40);
    ctx.fillStyle = cssVar('--color-bg');
    ctx.font = `italic 16px ${cssVar('--font-serif')}`;
    ctx.textAlign = 'center';
    ctx.fillText('m', mx, my + 5);
    ctx.fillStyle = ink;
    ctx.fillText('K', mx + 26, (top + baseY) / 2);
  }

  onMount(() => {
    const loop = createLoop(
      canvas,
      (dt) => {
        phase = (phase + dt * 2 * Math.PI * 0.6 * (scene.slow ? 0.25 : 1)) % (2 * Math.PI);
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
    void [r, corr, scene.hovered];
    draw();
  });
</script>

<VizFrame
  scene="3-helmholtz"
  {...number ? { number } : {}}
  {title}
  note="schéma, pas à l'échelle ; mouvement ralenti"
>
  <canvas bind:this={canvas} class="helm" role="img" aria-label={alt}></canvas>
  <div class="readout num" aria-live="polite">
    <span>modèle masse-ressort <b>{formatNumber(f0, 0)} Hz</b></span>
    <span>modèle d'ondes (cavité cylindrique) <b>{formatNumber(fd, 0)} Hz</b></span>
    <span>écart <b>{formatNumber((100 * (f0 - fd)) / fd, 1)} %</b></span>
    <span>λ / plus grande dimension <b>{formatNumber(lambdaOverSize, 1)}</b></span>
  </div>
  {#snippet controls()}
    <SymbolSlider scene="3-helmholtz" param="V" />
    <SymbolSlider scene="3-helmholtz" param="a" />
    <SymbolSlider scene="3-helmholtz" param="Ln" />
    <TermToggles scene="3-helmholtz" />
    <ListenButton
      label="Souffler sur le goulot"
      onstart={async () => {
        voice = await startBlown(f0);
      }}
      onstop={() => {
        voice?.stop();
        voice = null;
      }}
    />
  {/snippet}
</VizFrame>

<style>
  .helm {
    display: block;
    width: 100%;
    height: 300px;
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
