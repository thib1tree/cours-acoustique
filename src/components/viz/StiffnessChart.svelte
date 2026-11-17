<script lang="ts">
  /** D2: sound speed as a compromise between stiffness K and inertia ρ₀ (log–log chart). */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import {
    AIR,
    HELIUM,
    TABULATED_MEDIA,
    adiabaticBulkModulus,
    celsiusToKelvin,
    celerityFromModulus,
    gasDensity,
  } from '../../lib/physics/media';
  import VizFrame from './VizFrame.svelte';
  import Plot, { type Marker, type Series } from './Plot.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('1a-stiffness');
  const T = celsiusToKelvin(20);
  const X = { min: 0.1, max: 2e4, log: true, label: 'ρ₀ (kg/m³)' };
  const Y = { min: 1e4, max: 1e12, log: true, label: 'K (Pa)' };

  const media = [
    {
      name: 'hélium',
      rho: gasDensity(HELIUM, T),
      K: adiabaticBulkModulus(HELIUM),
      side: 'right' as const,
    },
    { name: 'air', rho: gasDensity(AIR, T), K: adiabaticBulkModulus(AIR), side: 'right' as const },
    {
      name: TABULATED_MEDIA[0]!.name,
      rho: TABULATED_MEDIA[0]!.rho,
      K: TABULATED_MEDIA[0]!.modulus,
      side: 'left' as const,
    },
    {
      name: 'acier (module M)',
      rho: TABULATED_MEDIA[1]!.rho,
      K: TABULATED_MEDIA[1]!.modulus,
      side: 'left' as const,
    },
  ];

  const isoC = [100, 300, 1000, 3000, 10000];
  const series: Series[] = isoC.map((c) => ({
    points: [
      [X.min, X.min * c * c],
      [Math.min(X.max, Y.max / (c * c)), Math.min(X.max, Y.max / (c * c)) * c * c],
    ],
    color: 'var(--color-rule)',
    width: 1,
    dash: '5 4',
    label: `${formatNumber(c)} m/s`,
    labelAt: 'end' as const,
  }));

  const K = $derived(scene.params.K!);
  const rho = $derived(scene.params.rho!);
  const c = $derived(celerityFromModulus(K, rho));
  const markers: Marker[] = $derived([
    ...media.map((m) => ({
      x: m.rho,
      y: m.K,
      color: 'var(--color-ink)',
      r: 4,
      label: `${m.name}  ${formatNumber(celerityFromModulus(m.K, m.rho))} m/s`,
      labelSide: m.side,
    })),
    { x: rho, y: K, color: 'var(--color-ink)', r: 8, hollow: true },
  ]);

  function onpoint(x: number, y: number) {
    scene.params.rho = Math.min(X.max, Math.max(X.min, x));
    scene.params.K = Math.min(Y.max, Math.max(Y.min, y));
  }
</script>

<VizFrame
  scene="1a-stiffness"
  {...number ? { number } : {}}
  {title}
  animated={false}
  note="Les droites en tirets relient les milieux de même célérité."
>
  <div class="wrap">
    <Plot x={X} y={Y} {series} {markers} height={380} {onpoint} ariaLabel={alt} />
    <div class="readout" aria-live="polite">
      <span class="lbl">célérité</span>
      <span class="big num">{formatNumber(c)} m/s</span>
    </div>
  </div>
  {#snippet controls()}
    <SymbolSlider scene="1a-stiffness" param="K" />
    <SymbolSlider scene="1a-stiffness" param="rho" />
  {/snippet}
</VizFrame>

<style>
  .wrap {
    position: relative;
    padding: var(--space-3) 0;
  }
  .readout {
    position: absolute;
    left: 72px;
    top: 24px;
    display: grid;
    background: var(--color-bg);
    padding: var(--space-2) var(--space-3);
    border-left: 2px solid var(--color-ink);
  }
  .lbl {
    color: var(--color-ink-muted);
  }
  .big {
    font-size: 1.6rem;
  }
</style>
