<script lang="ts">
  /**
   * Chapter 8, D3: double wall. Two masses coupled by the air spring of the cavity: a
   * mass–air–mass resonance f₀ where insulation collapses, then 18 dB per octave instead
   * of 6, and cavity resonances unless the cavity is filled with an absorber.
   */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import { abs } from '../../lib/physics/complex';
  import {
    doubleWallTransmission,
    limpMassTransmission,
    massAirMassFrequency,
  } from '../../lib/physics/vibro';
  import VizFrame from './VizFrame.svelte';
  import Plot, { type Series } from './Plot.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import TermToggles from '../ui/TermToggles.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('8-double');
  const C0 = 343.2;
  const RHO = 1.204;
  const SIGMA = 10000; // Pa·s/m², TODO-VERIFY: typical flow resistivity of a light mineral wool

  const w = $derived({
    m1: scene.params.m1!,
    m2: scene.params.m2!,
    d: scene.params.d! * 1e-3,
    ...(scene.term('fill') ? { sigma: SIGMA } : {}),
  });
  const f0 = $derived(massAirMassFrequency(w, RHO, C0));
  const fcav = $derived(C0 / (2 * w.d));
  const F = Array.from({ length: 300 }, (_, i) => 20 * 250 ** (i / 299));
  const dbl = $derived(
    F.map((f) => [f, -20 * Math.log10(abs(doubleWallTransmission(f, w, RHO, C0)))] as const),
  );
  const single = $derived(
    F.map(
      (f) => [f, -20 * Math.log10(abs(limpMassTransmission(f, w.m1 + w.m2, RHO, C0)))] as const,
    ),
  );
  const series: Series[] = $derived([
    {
      points: single,
      color: 'var(--color-ink-muted)',
      width: 1.5,
      dash: '5 4',
      label: 'paroi simple de même masse',
      labelAt: 'end',
    },
    { points: dbl, color: 'var(--color-ink)', width: 2 },
  ]);
  const at1k = $derived(
    -20 * Math.log10(abs(doubleWallTransmission(1000, w, RHO, C0))) +
      20 * Math.log10(abs(limpMassTransmission(1000, w.m1 + w.m2, RHO, C0))),
  );
</script>

<VizFrame
  scene="8-double"
  {...number ? { number } : {}}
  {title}
  animated={false}
  note="incidence normale ; parois souples (sans rigidité de flexion)"
>
  <div class="readout num" aria-live="polite">
    <span>résonance masse-air-masse <b>{formatNumber(f0, 0)} Hz</b></span>
    <span>première résonance de la lame <b>{formatNumber(fcav, 0)} Hz</b></span>
    <span>gain sur la paroi simple à 1 kHz <b>{formatNumber(at1k, 1)} dB</b></span>
  </div>
  <div class="pad">
    <p class="ylab">indice d'affaiblissement (dB)</p>
    <Plot
      x={{ min: 20, max: 5000, log: true, label: 'f (Hz)' }}
      y={{ min: -10, max: 120 }}
      {series}
      vlines={[
        { x: f0, color: 'var(--color-ink)', label: 'f₀', dash: '3 4' },
        ...(fcav < 5000
          ? [{ x: fcav, color: 'var(--color-ink-muted)', label: 'c₀/2d', dash: '3 4' }]
          : []),
      ]}
      height={240}
      ariaLabel={alt}
    />
  </div>
  {#snippet controls()}
    <SymbolSlider scene="8-double" param="m1" />
    <SymbolSlider scene="8-double" param="m2" />
    <SymbolSlider scene="8-double" param="d" />
    <TermToggles scene="8-double" />
  {/snippet}
</VizFrame>

<style>
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
    border-bottom: 1px solid var(--color-rule);
    font-size: 1rem;
  }
  b {
    font-weight: 600;
  }
</style>
