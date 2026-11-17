<script lang="ts">
  /**
   * Chapter 3, D1–D3: resonances of a cylindrical tube open at the far end.
   * Top: input impedance |Z_in|/Z_c (dB) vs frequency; a reed instrument (closed at the
   * mouthpiece) plays at the maxima, a flute (open at the mouthpiece) at the minima.
   * Bottom: standing wave of the selected resonance. Radiation terms can be switched off.
   * Sound: a tone whose harmonics are weighted by the impedance (or admittance) of the tube.
   */
  import { onMount } from 'svelte';
  import { useScene } from '../../lib/scene/scene.svelte';
  import { createLoop, cssVar, fitCanvas, onThemeChange } from '../../lib/viz/loop';
  import { formatNumber } from '../../lib/scene/format';
  import { type Complex, abs, cis, mul, re } from '../../lib/physics/complex';
  import {
    END_CORRECTION,
    extrema,
    idealResonances,
    openTubeInput,
    refineExtremum,
    radiationImpedance,
  } from '../../lib/physics/tubes';
  import { startPeriodic, type PeriodicTone } from '../../lib/audio/synth/periodic';
  import VizFrame from './VizFrame.svelte';
  import Plot, { type Series } from './Plot.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';
  import TermToggles from '../ui/TermToggles.svelte';
  import ListenButton from '../ui/ListenButton.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('3-tube');
  const C0 = 343.2;
  const YLIM = 75; // dB, plot range
  let canvas: HTMLCanvasElement;
  let phase = 0;
  let tone: PeriodicTone | null = null;

  const L = $derived(scene.params.L!);
  const a = $derived(scene.params.a! / 1000);
  const reed = $derived(scene.views.excite !== 'flute');
  const terms = $derived({ resistance: scene.term('radres'), mass: scene.term('radmass') });
  const fmax = $derived((5.5 * C0) / (2 * L));
  const F = $derived(Array.from({ length: 1400 }, (_, i) => 1 + (i / 1399) * fmax));
  const Zdb = $derived(
    F.map((f) => 20 * Math.log10(abs(openTubeInput(f, L, a, C0, terms)) + 1e-9)),
  );
  const peaks = $derived.by(() => {
    const df = F[1]! - F[0]!;
    const sign = reed ? 1 : -1;
    return extrema(F, Zdb, sign)
      .slice(0, 6)
      .map((f) =>
        refineExtremum(
          (x) => abs(openTubeInput(x, L, a, C0, terms)),
          Math.max(0.5, f - 2 * df),
          f + 2 * df,
          sign,
        ),
      );
  });
  const ideal = $derived(
    idealResonances(L, C0, reed ? 'closed-open' : 'open-open', 6).filter((f) => f < fmax),
  );
  const n = $derived(Math.round(scene.params.n!));
  const fn = $derived(peaks[n - 1] ?? peaks[0] ?? ideal[0]!);
  const zdb = (f: number) => 20 * Math.log10(abs(openTubeInput(f, L, a, C0, terms)) + 1e-9);
  const clip = (d: number) => Math.max(-YLIM, Math.min(YLIM, d));
  // The resonances are very sharp (relative width ~ (ka)²): refine the curve around every
  // extremum so the drawn peaks reach their true height instead of the grid's.
  const curve = $derived.by(() => {
    const extra: number[] = [];
    for (const f of [...extrema(F, Zdb, 1), ...extrema(F, Zdb, -1)])
      for (let e = -6; e <= -2; e += 0.25) extra.push(f * (1 - 10 ** e), f * (1 + 10 ** e), f);
    const pts = [
      ...F.map((f, i) => [f, Zdb[i]!] as const),
      ...extra.filter((f) => f > 0 && f < fmax).map((f) => [f, zdb(f)] as const),
    ];
    return pts.sort((p, q) => p[0] - q[0]);
  });
  const series: Series[] = $derived([
    {
      points: curve.map(([f, d]) => [f, clip(d)] as const),
      color: 'var(--color-ink)',
      width: 1.75,
    },
  ]);
  const markers = $derived(
    peaks.map((f, i) => ({
      x: f,
      y: clip(zdb(f)),
      color: i + 1 === n ? 'var(--color-pressure-pos)' : 'var(--color-ink)',
      r: i + 1 === n ? 6 : 4,
    })),
  );

  /** Harmonic amplitudes of the played note, weighted by the tube's response. */
  function spectrum(): number[] {
    const f1 = peaks[0] ?? ideal[0]!;
    return Array.from({ length: 12 }, (_, i) => {
      const z = abs(openTubeInput((i + 1) * f1, L, a, C0, terms));
      const w = reed ? z : 1 / Math.max(z, 1e-3);
      return Math.min(w, 30) / (i + 1);
    });
  }
  $effect(() => {
    void [peaks, reed];
    tone?.set(peaks[0] ?? ideal[0]!, spectrum());
  });

  function draw() {
    if (!canvas) return;
    const { w, h, dpr } = fitCanvas(canvas);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const ink = cssVar('--color-ink');
    const muted = cssVar('--color-ink-muted');
    const cP = cssVar('--color-pressure-pos');
    const cV = cssVar('--color-velocity');
    const X0 = 40;
    const X1 = w - 70;
    const top = 18;
    const bot = h - 18;
    const mid = (top + bot) / 2;
    // tube walls
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X0, top);
    ctx.lineTo(X1, top);
    ctx.moveTo(X0, bot);
    ctx.lineTo(X1, bot);
    ctx.stroke();
    if (reed) {
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(X0, top);
      ctx.lineTo(X0, bot);
      ctx.stroke();
    }
    // field along the tube: P(x) = P_L cos k(L−x) − i Z_c V_L sin k(L−x), V_L = P_L/Z_L
    const k = (2 * Math.PI * fn) / C0;
    const ZL = radiationImpedance(k * a, terms);
    const VL: Complex =
      abs(ZL) > 1e-9
        ? [ZL[0] / (ZL[0] ** 2 + ZL[1] ** 2), -ZL[1] / (ZL[0] ** 2 + ZL[1] ** 2)]
        : [1e6, 0];
    const P = (x: number): Complex => {
      const u = k * (L - x);
      return [Math.cos(u) - -VL[1] * Math.sin(u), -VL[0] * Math.sin(u)];
    };
    const Vx = (x: number): Complex => {
      const u = k * (L - x);
      return [VL[0] * Math.cos(u), VL[1] * Math.cos(u) - Math.sin(u)];
    };
    let pmax = 1e-9;
    let vmax = 1e-9;
    for (let i = 0; i <= 200; i++) {
      pmax = Math.max(pmax, abs(P((i / 200) * L)));
      vmax = Math.max(vmax, abs(Vx((i / 200) * L)));
    }
    const e = cis(-phase);
    const A = (bot - top) * 0.42;
    const curve = (
      fnc: (x: number) => Complex,
      color: string,
      norm: number,
      width: number,
      dash: number[] = [],
    ) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.beginPath();
      for (let px = X0; px <= X1; px += 2) {
        const x = ((px - X0) / (X1 - X0)) * L;
        const y = mid - (re(mul(fnc(x), e)) / norm) * A;
        if (px === X0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    curve(P, cP, pmax, 3);
    curve(Vx, cV, vmax, 1.75);
    // outer air plug (end correction) beyond the open end
    if (scene.term('radmass')) {
      const dpx = ((END_CORRECTION.unflanged * a) / L) * (X1 - X0);
      ctx.fillStyle = ink;
      ctx.globalAlpha = scene.hovered === 'radmass' ? 0.3 : 0.12;
      ctx.fillRect(X1, top + 2, Math.max(3, dpx), bot - top - 4);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = muted;
    ctx.font = `12px ${cssVar('--font-sans')}`;
    ctx.textAlign = 'left';
    ctx.fillText(reed ? 'anche' : 'biseau', 4, mid + 4);
    ctx.fillText('ouvert', X1 + 8, mid + 4);
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
    void [fn, reed, terms, scene.hovered];
    draw();
  });

  const PRESETS = [
    { label: 'Clarinette (simplifiée)', L: 0.6, a: 7.5, excite: 'reed' },
    { label: 'Flûte (simplifiée)', L: 0.6, a: 9.5, excite: 'flute' },
    { label: 'Conduit auditif', L: 0.025, a: 3.5, excite: 'reed' },
  ];
</script>

<VizFrame
  scene="3-tube"
  {...number ? { number } : {}}
  {title}
  note="tube cylindrique ouvert au bout ; parois rigides, sans pertes"
>
  <div class="pad">
    <p class="ylab">|Z<sub>entrée</sub>| / ρ₀c₀ (dB)</p>
    <Plot
      x={{ min: 0, max: fmax, label: 'f (Hz)' }}
      y={{ min: -YLIM, max: YLIM, label: '' }}
      {series}
      {markers}
      vlines={ideal.map((f) => ({ x: f, color: 'var(--color-ink-muted)', dash: '3 4' }))}
      height={220}
      ariaLabel={alt}
    />
    <canvas
      bind:this={canvas}
      class="mode"
      role="img"
      aria-label="Pression et vitesse le long du tube pour la résonance choisie."
    ></canvas>
  </div>
  <div class="readout num" aria-live="polite">
    <span>résonance {n} : <b>{formatNumber(fn, 0)} Hz</b></span>
    <span>tube idéal : <b>{formatNumber(ideal[n - 1] ?? 0, 0)} Hz</b></span>
    <span
      >rapport f₂/f₁ : <b>{peaks.length > 1 ? formatNumber(peaks[1]! / peaks[0]!, 2) : '–'}</b
      ></span
    >
    <span>correction de bout <b>{formatNumber(END_CORRECTION.unflanged * a * 1000, 1)} mm</b></span>
  </div>
  {#snippet legend()}
    <div class="keys">
      <span class="key"><i style:background="var(--color-pressure-pos)"></i>pression</span>
      <span class="key"><i style:background="var(--color-velocity)"></i>vitesse</span>
      <span class="key"><i class="dash"></i>résonances du tube idéal</span>
    </div>
  {/snippet}
  {#snippet controls()}
    <SymbolSlider scene="3-tube" param="L" />
    <SymbolSlider scene="3-tube" param="a" />
    <SymbolSlider scene="3-tube" param="n" />
    <ViewToggle scene="3-tube" view="excite" />
    <TermToggles scene="3-tube" />
    <div class="presets" role="group" aria-label="Préréglages">
      {#each PRESETS as pr (pr.label)}
        <button
          type="button"
          onclick={() =>
            scene.apply({ params: { L: pr.L, a: pr.a, n: 1 }, views: { excite: pr.excite } })}
          >{pr.label}</button
        >
      {/each}
    </div>
    <ListenButton
      label="Écouter la note"
      onstart={async () => {
        tone = await startPeriodic(peaks[0] ?? ideal[0]!, spectrum());
      }}
      onstop={() => {
        tone?.stop();
        tone = null;
      }}
    />
  {/snippet}
</VizFrame>

<style>
  .ylab {
    margin: 0 0 var(--space-1);
    font-family: var(--font-sans);
    font-size: 0.8125rem;
    color: var(--color-ink-muted);
  }
  .pad {
    padding-top: var(--space-3);
  }
  .mode {
    display: block;
    width: 100%;
    height: 130px;
    margin-top: var(--space-3);
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
  }
  .key i.dash {
    background: repeating-linear-gradient(
      to right,
      var(--color-ink-muted) 0 3px,
      transparent 3px 7px
    );
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
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
</style>
