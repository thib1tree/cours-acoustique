<script lang="ts">
  /**
   * Air column driven by a piston: Eulerian pressure band, Lagrangian slabs, and
   * p/v or energy curves along x. Supports term switches (inertia, compressibility),
   * a reflection coefficient R (progressive → standing) and hover links with equations.
   */
  import { onMount } from 'svelte';
  import { useScene } from '../../lib/scene/scene.svelte';
  import { createLoop, cssVar, currentTheme, fitCanvas, onThemeChange } from '../../lib/viz/loop';
  import { lut, pressureColor } from '../../lib/viz/luts';
  import { formatNumber } from '../../lib/scene/format';
  import { tubeField, tubeModel } from '../../lib/physics/tube';
  import { pressureFromSpl } from '../../lib/physics/levels';
  import { AIR, celsiusToKelvin, gasDensity, gasSoundSpeed } from '../../lib/physics/media';
  import VizFrame from './VizFrame.svelte';
  import ColorLegend from './ColorLegend.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';
  import TermToggles from '../ui/TermToggles.svelte';

  let {
    scene: sceneId,
    number,
    title,
    sliders = [],
    views = [],
    toggles = false,
    alt,
  }: {
    scene: string;
    number?: string;
    title: string;
    sliders?: string[];
    views?: string[];
    toggles?: boolean;
    alt: string;
  } = $props();

  const scene = useScene(sceneId);
  const T = celsiusToKelvin(20);
  const air = { rho0: gasDensity(AIR, T), c0: gasSoundSpeed(AIR, T) };
  const LENGTH = 1.7; // m
  /** Displayed periods per second of animation (the real 500 Hz is slowed down). */
  const RATE = 0.8;

  let canvas: HTMLCanvasElement;
  let phase = 0; // ωt, advanced by the animation
  let tip: { x: number; y: number; text: string } | null = $state(null);
  let stageWidth = $state(800);

  const has = (k: string) => k in scene.params;
  const f = $derived(has('f') ? scene.params.f! : 500);
  const P = $derived(has('L') ? Math.SQRT2 * pressureFromSpl(scene.params.L!) : Math.SQRT2);
  const R = $derived(has('R') ? scene.params.R! : 0);
  const model = $derived(tubeModel(scene.term('inertia'), scene.term('compressibility')));
  const view = $derived(scene.views.view ?? 'both');
  const curves = $derived(scene.views.curves ?? 'pv');
  const omega = $derived(2 * Math.PI * f);
  const field = $derived(tubeField(model, { ...air, omega, P, R, length: LENGTH }));
  const xiPeak = $derived(P / (air.rho0 * air.c0 * omega));
  const slowdown = $derived(f / RATE);
  /** Display factor: drawn amplitude (px) over the true amplitude at screen scale. */
  const amplification = $derived.by(() => {
    const k = (12 * 0.42) / (xiPeak * (stageWidth / LENGTH));
    const e = Math.floor(Math.log10(k));
    const m = Math.round(k / 10 ** (e - 1)) / 10;
    return e >= 4
      ? `${formatNumber(m, 1)} × 10${toSup(e)} fois`
      : `${formatNumber(Math.round(k / 10 ** (e - 1)) * 10 ** (e - 1))} fois`;
  });
  const toSup = (n: number) =>
    String(n)
      .replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]!)
      .replace('-', '⁻');

  function draw() {
    if (!canvas) return;
    const { w, h, dpr } = fitCanvas(canvas);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const theme = currentTheme();
    const table = lut('pressure', theme);
    const ink = cssVar('--color-ink');
    const muted = cssVar('--color-ink-muted');
    const rule = cssVar('--color-rule');
    const cP = cssVar('--color-pressure-pos');
    const cV = cssVar('--color-velocity');
    const cE = cssVar('--color-energy');
    const font = `12px ${cssVar('--font-sans')}`;
    const numFont = `13px ${cssVar('--font-num')}`;
    const t = phase / omega;

    const padL = 36,
      padR = 10,
      X0 = padL + 14,
      X1 = w - padR;
    const Wd = X1 - X0;
    if (Math.abs(stageWidth - Wd) > 1) stageWidth = Wd;
    const xOf = (px: number) => ((px - X0) / Wd) * LENGTH;
    const bandTop = 10;
    const bandH = Math.round(h * 0.38);
    const pScale = P * (1 + R);
    const hov = scene.hovered;

    // Piston
    const spacing = 12;
    const A = spacing * 0.42; // displayed displacement amplitude (px)
    const ampPx = (xi: number) => (xi / xiPeak) * A;
    const pistonX = X0 - 8 + ampPx(field.xi(0, t));
    ctx.fillStyle = ink;
    ctx.fillRect(pistonX - 6, bandTop - 4, 8, bandH + 8);

    // Eulerian band
    if (view !== 'lagrange') {
      for (let px = X0; px < X1; px += 2) {
        ctx.fillStyle = pressureColor(field.p(xOf(px), t) / pScale, table);
        ctx.fillRect(px, bandTop, 2.5, bandH);
      }
      if (hov === 'compressibility' || hov === 'p') {
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2;
        ctx.strokeRect(X0, bandTop, Wd, bandH);
      }
    } else {
      ctx.strokeStyle = rule;
      ctx.strokeRect(X0, bandTop, Wd, bandH);
    }

    // Lagrangian slabs
    const followed = Math.round((0.37 * Wd) / spacing);
    if (view !== 'euler') {
      const n = Math.floor(Wd / spacing);
      const strong = hov === 'inertia' || hov === 'rho' || hov === 'xi';
      for (let i = 0; i <= n; i++) {
        const x0 = X0 + i * spacing;
        const x = x0 + ampPx(field.xi(xOf(x0), t));
        const isF = i === followed;
        ctx.globalAlpha = isF || strong ? 1 : 0.32;
        ctx.strokeStyle = ink;
        ctx.lineWidth = isF ? 2 : strong ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(x, bandTop + 5);
        ctx.lineTo(x, bandTop + bandH - 5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const x00 = X0 + followed * spacing;
      const amp = Math.abs(ampPx(xiPeak * (model === 'wave' ? Math.max(1 - R, 1e-9) + 2 * R : 1)));
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x00 - amp, bandTop + bandH + 6);
      ctx.lineTo(x00 + amp, bandTop + bandH + 6);
      ctx.moveTo(x00 - amp, bandTop + bandH + 2);
      ctx.lineTo(x00 - amp, bandTop + bandH + 10);
      ctx.moveTo(x00 + amp, bandTop + bandH + 2);
      ctx.lineTo(x00 + amp, bandTop + bandH + 10);
      ctx.stroke();
    }
    if (view === 'euler') {
      // Fixed probe: an Eulerian observer.
      const xp = X0 + 0.62 * Wd;
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.moveTo(xp, bandTop + bandH + 2);
      ctx.lineTo(xp - 6, bandTop + bandH + 12);
      ctx.lineTo(xp + 6, bandTop + bandH + 12);
      ctx.fill();
    }

    // Curves
    const cTop = bandTop + bandH + 24;
    const cH = h - cTop - 26;
    const mid = cTop + cH / 2;
    const zeroY = curves === 'pv' ? mid : cTop + cH;
    ctx.strokeStyle = rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X0, zeroY);
    ctx.lineTo(X1, zeroY);
    ctx.stroke();
    ctx.fillStyle = muted;
    ctx.font = numFont;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('0', X0 - 8, zeroY);
    // x ticks (m)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let m = 0; m <= 17; m++) {
      const x = X0 + (m / 17) * Wd;
      ctx.strokeStyle = rule;
      ctx.beginPath();
      ctx.moveTo(x, h - 22);
      ctx.lineTo(x, h - (m % 5 === 0 ? 14 : 18));
      ctx.stroke();
      if (m % 5 === 0) ctx.fillText(formatNumber(m / 10, 1), x, h - 12);
    }
    ctx.textAlign = 'left';
    ctx.font = font;
    ctx.fillText('x (m)', X1 - 30, h - 12);

    const plot = (fn: (x: number) => number, color: string, width: number, dash: number[] = []) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.beginPath();
      for (let px = X0; px <= X1; px += 2) {
        const y = mid - Math.max(-1.15, Math.min(1.15, fn(xOf(px)))) * (cH / 2) * 0.85;
        if (px === X0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    const Z = air.rho0 * air.c0;
    if (curves === 'pv') {
      plot((x) => field.p(x, t) / pScale, cP, hov === 'p' ? 7 : 5.5);
      plot((x) => (field.v(x, t) * Z) / pScale, cV, hov === 'v' ? 3 : 2);
    } else {
      // Energy densities from a baseline at the bottom, normalized by the largest
      // possible total density e₀ = P²(1+R)²/(ρ₀c₀²).
      const e0 = ((P * P) / (air.rho0 * air.c0 * air.c0)) * (1 + R) ** 2;
      const ek = (x: number) => (0.5 * air.rho0 * field.v(x, t) ** 2) / e0;
      const ep = (x: number) => field.p(x, t) ** 2 / (2 * air.rho0 * air.c0 ** 2) / e0;
      const bottom = cTop + cH;
      const area = (
        fn: (x: number) => number,
        color: string,
        width: number,
        dash: number[],
        alpha: number,
      ) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.globalAlpha = alpha;
        ctx.setLineDash(dash);
        ctx.beginPath();
        for (let px = X0; px <= X1; px += 2) {
          const y = bottom - Math.min(1.1, fn(xOf(px))) * cH * 0.9;
          if (px === X0) ctx.moveTo(px, y);
          else ctx.lineTo(px, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      };
      area(ek, cE, 6, [], 0.45);
      area(ep, cE, 2, [7, 4], 1);
      // Instantaneous intensity p·v as arrows along the band's lower edge.
      const I0 = ((P * P) / Z) * (1 + R) ** 2;
      ctx.fillStyle = cE;
      for (let px = X0 + 20; px < X1 - 10; px += 36) {
        const I = (field.p(xOf(px), t) * field.v(xOf(px), t)) / I0;
        const len = Math.min(16, Math.abs(I) * 16);
        if (len < 1.5) continue;
        const y = bandTop + bandH + 14;
        const dir = Math.sign(I);
        ctx.beginPath();
        ctx.moveTo(px + dir * len, y);
        ctx.lineTo(px - dir * 2, y - 5);
        ctx.lineTo(px - dir * 2, y + 5);
        ctx.fill();
      }
    }

    if (model === 'none') {
      ctx.fillStyle = cssVar('--color-bg');
      ctx.globalAlpha = 0.85;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = ink;
      ctx.font = `15px ${cssVar('--font-sans')}`;
      ctx.textAlign = 'center';
      ctx.fillText('Sans inertie ni compressibilité, plus rien ne relie p et v.', w / 2, h / 2);
    }
  }

  function onPointer(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left;
    const X0 = 50;
    const Wd = r.width - 10 - X0;
    const x = ((px - X0) / Wd) * LENGTH;
    if (x < 0 || x > LENGTH) {
      tip = null;
      return;
    }
    const t = phase / omega;
    const p = field.p(x, t);
    const v = field.v(x, t);
    tip = {
      x: px,
      y: e.clientY - r.top,
      text: `x = ${formatNumber(x, 2)} m   p = ${formatNumber(p, 2)} Pa   v = ${formatNumber(v * 1000, 2)} mm/s`,
    };
  }

  onMount(() => {
    const loop = createLoop(
      canvas,
      (dt) => {
        phase = (phase + 2 * Math.PI * RATE * dt * (scene.slow ? 0.25 : 1)) % (2 * Math.PI * 1000);
        draw();
      },
      () => scene.playing,
    );
    const ro = new ResizeObserver(() => draw());
    ro.observe(canvas);
    const off = onThemeChange(draw);
    return () => {
      loop.destroy();
      ro.disconnect();
      off();
    };
  });

  // Redraw on any parameter change, even when paused; restart the clock on reset.
  $effect(() => {
    void [field, view, curves, scene.hovered, scene.playing];
    draw();
  });
  $effect(() => {
    void scene.epoch;
    phase = 0;
    draw();
  });
</script>

<VizFrame
  scene={sceneId}
  {...number ? { number } : {}}
  {title}
  note="déplacements amplifiés {amplification}, temps ralenti {formatNumber(
    Math.round(slowdown),
  )} fois"
>
  <canvas
    bind:this={canvas}
    class="tube"
    role="img"
    aria-label={alt}
    onpointermove={onPointer}
    onpointerdown={onPointer}
    onpointerleave={() => (tip = null)}
  ></canvas>
  {#if tip}
    <div class="tip num" style:left="{Math.min(tip.x, 9999)}px" style:top="{tip.y}px" role="status">
      {tip.text}
    </div>
  {/if}
  {#snippet legend()}
    <div class="keys">
      {#if curves === 'pv'}
        <span class="key"
          ><i class="thick" style:background="var(--color-pressure-pos)"></i>pression</span
        >
        <span class="key"><i style:background="var(--color-velocity)"></i>vitesse × ρ₀c₀</span>
      {:else}
        <span class="key"
          ><i class="thick soft" style:background="var(--color-energy)"></i>énergie cinétique</span
        >
        <span class="key"><i class="dash"></i>énergie potentielle</span>
        <span class="key"><b class="arrow">▶</b>intensité instantanée</span>
      {/if}
    </div>
    <ColorLegend
      label="pression"
      symbol="p"
      unit="Pa"
      min="−{formatNumber(P * (1 + R), 2)}"
      mid="0"
      max="+{formatNumber(P * (1 + R), 2)}"
    />
  {/snippet}
  {#snippet controls()}
    {#each sliders as s (s)}<SymbolSlider scene={sceneId} param={s} />{/each}
    {#each views as v (v)}<ViewToggle scene={sceneId} view={v} />{/each}
    {#if toggles}<TermToggles scene={sceneId} />{/if}
  {/snippet}
</VizFrame>

<style>
  .tube {
    display: block;
    width: 100%;
    height: 340px;
    touch-action: pan-y;
  }
  .tip {
    position: absolute;
    transform: translate(-50%, calc(-100% - 12px));
    background: var(--color-ink);
    color: var(--color-bg);
    padding: 4px 8px;
    border-radius: var(--radius);
    font-size: 0.8125rem;
    white-space: nowrap;
    pointer-events: none;
  }
  .keys {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
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
    display: inline-block;
  }
  .key i.thick {
    height: 5px;
  }
  .key i.soft {
    opacity: 0.45;
  }
  .key i.dash {
    background: repeating-linear-gradient(
      to right,
      var(--color-energy) 0 6px,
      transparent 6px 10px
    );
  }
  .arrow {
    color: var(--color-energy);
    font-size: 11px;
  }
  @media (max-width: 760px) {
    .tube {
      height: 280px;
    }
  }
</style>
