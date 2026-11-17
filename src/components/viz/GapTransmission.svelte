<script lang="ts">
  /** Chapter 2, real world: a thin air gap between an ultrasound probe and the skin. */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import { layerTransmission } from '../../lib/physics/interface';
  import VizFrame from './VizFrame.svelte';
  import Plot, { type Series } from './Plot.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('2-gap');
  // Water stands for soft tissue on both sides of the gap (see the text for the caveat).
  const Zw = 998.2 * 1482.3;
  const Za = 1.204 * 343.2;
  // 1 nm .. 10 µm (beyond, narrow half-wave resonances of the gap appear).
  const D = Array.from({ length: 201 }, (_, i) => 1e-9 * 1e4 ** (i / 200));
  const kl = $derived((2 * Math.PI * scene.params.f! * 1e6) / 343.2);
  const db = (d: number) => 10 * Math.log10(layerTransmission(Zw, Za, kl, d));
  const series: Series[] = $derived([
    {
      points: D.map((d) => [d * 1e6, Math.max(-80, db(d))] as const),
      color: 'var(--color-energy)',
      width: 2.5,
    },
  ]);
  const at1 = $derived(db(1e-6));
</script>

<VizFrame scene="2-gap" {...number ? { number } : {}} {title} animated={false}>
  <div class="pad">
    <Plot
      x={{ min: 0.001, max: 10, log: true, label: "épaisseur d'air (µm)" }}
      y={{ min: -80, max: 5, label: 'énergie transmise (dB)' }}
      {series}
      markers={[
        {
          x: 1,
          y: at1,
          color: 'var(--color-ink)',
          r: 5,
          label: `1 µm : ${formatNumber(at1, 0)} dB`,
        },
      ]}
      height={260}
      ariaLabel={alt}
    />
  </div>
  {#snippet controls()}<SymbolSlider scene="2-gap" param="f" />{/snippet}
</VizFrame>

<style>
  .pad {
    padding-top: var(--space-3);
  }
</style>
