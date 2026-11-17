<script lang="ts">
  /**
   * Chapter 2, D5: how to absorb. Absorption coefficient α(f) at normal incidence for
   * (a) a thin resistive screen at distance d from a rigid wall (terms switchable), or
   * (b) a porous layer of thickness d glued to the wall (Delany–Bazley).
   */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import {
    absorption,
    delanyBazley,
    resistiveScreen,
    rigidBackedLayer,
  } from '../../lib/physics/absorption';
  import VizFrame from './VizFrame.svelte';
  import Plot, { type Series } from './Plot.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';
  import TermToggles from '../ui/TermToggles.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('2-absorber');
  const Z0 = 413;
  const RHO = 1.204;
  const C0 = 343.2;
  const F = Array.from({ length: 241 }, (_, i) => 50 * (10000 / 50) ** (i / 240));

  const d = $derived(scene.params.d! / 100);
  const porous = $derived(scene.views.model === 'porous');
  const fq = $derived(C0 / (4 * d));
  const alphaAt = (f: number): number => {
    const k = (2 * Math.PI * f) / C0;
    if (porous) {
      const { Zc, k: kc } = delanyBazley(f, scene.params.sigma! * 1000, RHO, C0);
      return absorption(rigidBackedLayer(Zc, kc, d), Z0);
    }
    return absorption(
      resistiveScreen(scene.params.r! * Z0, d, k, Z0, {
        r: scene.term('r'),
        gap: scene.term('gap'),
      }),
      Z0,
    );
  };
  // Delany–Bazley is only valid for 0.01 < ρ₀f/σ < 1: draw the rest dashed.
  const valid = (f: number) =>
    !porous ||
    ((RHO * f) / (scene.params.sigma! * 1000) > 0.01 &&
      (RHO * f) / (scene.params.sigma! * 1000) < 1);
  const series: Series[] = $derived.by(() => {
    const pts = F.map((f) => [f, Math.max(0, alphaAt(f))] as const);
    const inside = pts.filter(([f]) => valid(f));
    const below = pts.filter(([f]) => !valid(f) && f < (inside[0]?.[0] ?? Infinity));
    const above = pts.filter(([f]) => !valid(f) && f > (inside.at(-1)?.[0] ?? -Infinity));
    const out: Series[] = [
      { points: inside, color: 'var(--color-energy)', width: 2.5, fill: 'var(--color-energy)' },
    ];
    if (below.length)
      out.push({
        points: [...below, ...(inside[0] ? [inside[0]] : [])],
        color: 'var(--color-energy)',
        width: 1.5,
        dash: '4 4',
      });
    if (above.length)
      out.push({
        points: [...(inside.at(-1) ? [inside.at(-1)!] : []), ...above],
        color: 'var(--color-energy)',
        width: 1.5,
        dash: '4 4',
      });
    return out;
  });
  const vlines = $derived(
    [1, 3, 5]
      .map((n) => n * fq)
      .filter((f) => f < 10000)
      .map((f, i) => ({
        x: f,
        color: 'var(--color-ink-muted)',
        label: i === 0 ? 'd = λ/4' : `${2 * i + 1}λ/4`,
      })),
  );
</script>

<VizFrame
  scene="2-absorber"
  {...number ? { number } : {}}
  {title}
  animated={false}
  note="incidence normale, paroi rigide derrière"
>
  <div class="wrap">
    <svg class="scheme" viewBox="0 0 120 80" aria-hidden="true">
      <rect x="104" y="6" width="8" height="68" class="wall" />
      {#if porous}
        <rect
          x={104 - Math.min(90, d * 300)}
          y="6"
          width={Math.min(90, d * 300)}
          height="68"
          class="porous"
        />
      {:else}
        <line
          x1={104 - Math.min(90, d * 300)}
          y1="6"
          x2={104 - Math.min(90, d * 300)}
          y2="74"
          class="screen"
        />
      {/if}
      <line x1={104 - Math.min(90, d * 300)} y1="78" x2="104" y2="78" class="dim" />
      <text x={104 - Math.min(90, d * 300) / 2} y="76" class="t">d</text>
    </svg>
    <Plot
      x={{ min: 50, max: 10000, log: true, label: 'f (Hz)' }}
      y={{ min: 0, max: 1.05, label: 'α' }}
      {series}
      {vlines}
      height={260}
      ariaLabel={alt}
    />
  </div>
  <p class="readout num">
    d = λ/4 pour <b>{formatNumber(fq)} Hz</b> ; α à cette fréquence :
    <b>{formatNumber(alphaAt(fq), 2)}</b>
  </p>
  {#snippet controls()}
    <ViewToggle scene="2-absorber" view="model" />
    <SymbolSlider scene="2-absorber" param="d" />
    {#if porous}<SymbolSlider scene="2-absorber" param="sigma" />{:else}<SymbolSlider
        scene="2-absorber"
        param="r"
      />{/if}
    {#if !porous}<TermToggles scene="2-absorber" />{/if}
  {/snippet}
</VizFrame>

<style>
  .wrap {
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: var(--space-4);
    align-items: center;
    padding-top: var(--space-3);
  }
  .scheme {
    width: 100%;
  }
  .wall {
    fill: var(--color-ink);
  }
  .porous {
    fill: var(--color-energy);
    opacity: 0.35;
  }
  .screen {
    stroke: var(--color-energy);
    stroke-width: 3;
  }
  .dim {
    stroke: var(--color-ink-muted);
  }
  .t {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 9px;
    fill: var(--color-ink);
    text-anchor: middle;
  }
  .readout {
    border-top: 1px solid var(--color-rule);
    padding-top: var(--space-3);
    font-size: 1rem;
  }
  b {
    font-weight: 600;
  }
  @media (max-width: 600px) {
    .wrap {
      grid-template-columns: 1fr;
    }
    .scheme {
      max-width: 160px;
    }
  }
</style>
