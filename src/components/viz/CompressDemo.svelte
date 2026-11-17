<script lang="ts">
  /** Prerequisite: the same relative compression costs ~15 000 × more pressure in water. */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import { AIR, TABULATED_MEDIA, adiabaticBulkModulus } from '../../lib/physics/media';
  import VizFrame from './VizFrame.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('fl-compress');
  const K = { air: adiabaticBulkModulus(AIR), water: TABULATED_MEDIA[0]!.modulus };
  const strain = $derived(scene.params.strain! / 100);
  const medium = $derived((scene.views.medium ?? 'air') as 'air' | 'water');
  const dp = $derived(K[medium] * strain);
  const fmtP = (p: number) =>
    p >= 1e6
      ? `${formatNumber(p / 1e6, 1)} MPa`
      : p >= 1e3
        ? `${formatNumber(p / 1e3, 2)} kPa`
        : `${formatNumber(p, 0)} Pa`;
  // Log bar: 1 Pa → 0, 100 MPa → 1
  const bar = (p: number) => Math.max(0, Math.min(1, Math.log10(Math.max(p, 1)) / 8));
</script>

<VizFrame scene="fl-compress" {...number ? { number } : {}} {title} animated={false}>
  <div class="wrap" role="img" aria-label={alt}>
    <svg viewBox="0 0 300 140" class="cyl" aria-hidden="true">
      <rect
        x="20"
        y="30"
        width="240"
        height="80"
        fill="var(--color-surface)"
        stroke="var(--color-ink-muted)"
      />
      <rect x={20 + 240 * (strain * 25)} y="24" width="10" height="92" fill="var(--color-ink)" />
      <text x="140" y="130" text-anchor="middle" class="t">{medium === 'air' ? 'air' : 'eau'}</text>
    </svg>
    <div class="bars">
      {#each ['air', 'water'] as const as m (m)}
        <div class="row" class:active={medium === m}>
          <span class="name">{m === 'air' ? 'air' : 'eau'}</span>
          <span class="track"
            ><span class="fill" style:width="{bar(K[m] * strain) * 100}%"></span></span
          >
          <span class="val num">{fmtP(K[m] * strain)}</span>
        </div>
      {/each}
      <p class="note">
        Surpression nécessaire, échelle logarithmique de 1 Pa à 100 MPa. Rapport des deux : {formatNumber(
          K.water / K.air,
        )}.
      </p>
    </div>
  </div>
  <p class="readout num">Δ<i>p</i> = <i>K</i> Δ<i>V</i>/<i>V</i> = {fmtP(dp)}</p>
  {#snippet controls()}
    <SymbolSlider scene="fl-compress" param="strain" />
    <ViewToggle scene="fl-compress" view="medium" />
  {/snippet}
</VizFrame>

<style>
  .wrap {
    display: grid;
    grid-template-columns: minmax(0, 300px) 1fr;
    gap: var(--space-6);
    align-items: center;
    padding: var(--space-4) 0;
  }
  .cyl {
    width: 100%;
    height: auto;
  }
  .t {
    font-family: var(--font-sans);
    font-size: 12px;
    fill: var(--color-ink-muted);
  }
  .bars {
    display: grid;
    gap: var(--space-3);
  }
  .row {
    display: grid;
    grid-template-columns: 3rem 1fr 6.5rem;
    align-items: center;
    gap: var(--space-3);
    color: var(--color-ink-muted);
  }
  .row.active {
    color: var(--color-ink);
    font-weight: 650;
  }
  .track {
    height: 10px;
    background: var(--color-surface);
  }
  .fill {
    display: block;
    height: 100%;
    background: var(--color-pressure-pos);
  }
  .val {
    text-align: right;
  }
  .note {
    margin: 0;
    color: var(--color-ink-muted);
  }
  .readout {
    border-top: 1px solid var(--color-rule);
    padding-top: var(--space-3);
    font-size: 1rem;
  }
  @media (max-width: 640px) {
    .wrap {
      grid-template-columns: 1fr;
    }
  }
</style>
