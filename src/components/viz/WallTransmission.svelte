<script lang="ts">
  /**
   * Chapter 8, D1: sound insulation of a single wall versus frequency. Mass law below the
   * coincidence frequency, a dip at coincidence, then a stiffness-controlled rise. The
   * bending stiffness and the damping can be switched off. Sound: noise heard through the
   * wall (raised by the insulation at 500 Hz so that the timbre stays audible).
   */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import {
    coincidenceFrequency,
    diffuseTL,
    massLaw,
    transmissionLoss,
  } from '../../lib/physics/vibro';
  import { plateOf } from '../../scenes/vibro';
  import { shapedNoise } from '../../lib/audio/fft';
  import { startBufferLoop, type BufferLoop } from '../../lib/audio/synth/buffer-loop';
  import VizFrame from './VizFrame.svelte';
  import Plot, { type Series } from './Plot.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import TermToggles from '../ui/TermToggles.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';
  import ListenButton from '../ui/ListenButton.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('8-wall');
  const C0 = 343.2;
  const RHO = 1.204;
  let voice: BufferLoop | null = null;

  const mat = $derived(scene.views.material ?? 'glass');
  const plate = $derived(plateOf(mat, scene.params.h!));
  const terms = $derived({ bending: scene.term('bending'), damping: scene.term('damping') });
  const diffuse = $derived(scene.views.incidence !== 'normal');
  const fc = $derived(coincidenceFrequency(C0, plate));
  const tl = (f: number) =>
    diffuse ? diffuseTL(f, plate, RHO, C0, terms) : transmissionLoss(f, 0, plate, RHO, C0, terms);
  const F = Array.from({ length: 160 }, (_, i) => 50 * 200 ** (i / 159));
  const curve = $derived(F.map((f) => [f, tl(f)] as const));
  const series: Series[] = $derived([
    { points: curve, color: 'var(--color-ink)', width: 2 },
    {
      points: F.map((f) => [f, massLaw(f, plate.m, RHO, C0)] as const),
      color: 'var(--color-ink-muted)',
      width: 1.5,
      dash: '5 4',
    },
  ]);
  const yMax = $derived(
    Math.max(20, ...curve.map((p) => p[1]), massLaw(10000, plate.m, RHO, C0)) + 5,
  );
  const tl500 = $derived(tl(500));

  function render(rate: number) {
    const NF = 160;
    const fs = Array.from({ length: NF }, (_, i) => 20 * 1000 ** (i / (NF - 1)));
    const g = fs.map((f) => 10 ** ((tl500 - tl(f)) / 20));
    const gain = (f: number) => {
      if (f < 30 || f > 18000) return 0;
      const u = (Math.log(f / 20) / Math.log(1000)) * (NF - 1);
      const k = Math.min(NF - 2, Math.floor(u));
      const w = u - k;
      return Math.min(30, g[k]! * (1 - w) + g[k + 1]! * w) / Math.sqrt(f);
    };
    return shapedNoise(1 << 17, rate, gain, 17);
  }
  $effect(() => {
    void [plate, terms, diffuse];
    voice?.update(render(voice.rate));
  });
</script>

<VizFrame
  scene="8-wall"
  {...number ? { number } : {}}
  {title}
  animated={false}
  note="paroi simple, mince, infinie ; air des deux côtés"
>
  <div class="readout num" aria-live="polite">
    <span>masse surfacique <b>{formatNumber(plate.m, 1)} kg/m²</b></span>
    <span>fréquence de coïncidence <b>{formatNumber(fc, 0)} Hz</b></span>
    <span>isolement à 500 Hz <b>{formatNumber(tl500, 1)} dB</b></span>
  </div>
  <div class="pad">
    <p class="ylab">indice d'affaiblissement (dB)</p>
    <Plot
      x={{ min: 50, max: 10000, log: true, label: 'f (Hz)' }}
      y={{ min: 0, max: yMax }}
      {series}
      vlines={fc > 50 && fc < 10000
        ? [{ x: fc, color: 'var(--color-ink)', label: 'coïncidence', dash: '3 4' }]
        : []}
      height={240}
      ariaLabel={alt}
    />
  </div>
  {#snippet legend()}
    <div class="keys">
      <span class="key"><i style:background="var(--color-ink)"></i>paroi</span>
      <span class="key"><i class="dash"></i>loi de masse</span>
    </div>
  {/snippet}
  {#snippet controls()}
    <SymbolSlider scene="8-wall" param="h" />
    <ViewToggle scene="8-wall" view="material" />
    <ViewToggle scene="8-wall" view="incidence" />
    <TermToggles scene="8-wall" />
    <ListenButton
      label="Écouter à travers la paroi"
      onstart={async () => {
        voice = await startBufferLoop(render);
      }}
      onstop={() => {
        voice?.stop();
        voice = null;
      }}
    />
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
  .keys {
    display: flex;
    gap: var(--space-4);
    color: var(--color-ink-muted);
    font-family: var(--font-sans);
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
</style>
