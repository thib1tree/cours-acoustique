<script lang="ts">
  /**
   * Chapter 5, D2: a vehicle passes at distance d. Received frequency and level versus
   * time, from the exact retarded time; the sound is rendered sample by sample from the
   * same retarded time. Doppler shift, spherical spreading and convective amplification
   * can each be switched off, in the curves and in the sound.
   */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import { convectiveFactor, dopplerSource, passBy, renderPassBy } from '../../lib/physics/moving';
  import { startBufferLoop, type BufferLoop } from '../../lib/audio/synth/buffer-loop';
  import VizFrame from './VizFrame.svelte';
  import Plot, { type Series } from './Plot.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import TermToggles from '../ui/TermToggles.svelte';
  import ListenButton from '../ui/ListenButton.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('5-passby');
  const C0 = 343.2;
  let voice: BufferLoop | null = null;

  const V = $derived(scene.params.V! / 3.6);
  const d = $derived(scene.params.d!);
  const f0 = $derived(scene.params.f0!);
  const M = $derived(V / C0);
  const terms = $derived({
    doppler: scene.term('doppler'),
    spreading: scene.term('spreading'),
    convective: scene.term('convective'),
  });
  // Time window: long enough to hear the approach and the departure.
  const half = $derived(Math.min(6, Math.max(2.5, (6 * d) / V)));
  const pts = $derived(
    Array.from({ length: 500 }, (_, i) => {
      const t = -half + (2 * half * i) / 499;
      const p = passBy(t, V, d, C0);
      const f = terms.doppler ? dopplerSource(f0, M, p.cosTheta) : f0;
      let a = terms.spreading ? d / p.R : 1;
      if (terms.convective) a *= convectiveFactor(M, p.cosTheta);
      return { t, f, L: 20 * Math.log10(a) };
    }),
  );
  const fSeries: Series[] = $derived([
    { points: pts.map((q) => [q.t, q.f] as const), color: 'var(--color-ink)', width: 2 },
  ]);
  const lSeries: Series[] = $derived([
    { points: pts.map((q) => [q.t, q.L] as const), color: 'var(--color-energy)', width: 2 },
  ]);
  const fRange = $derived({ min: f0 / (1 + M) / 1.04, max: (f0 / (1 - M)) * 1.04 });
  const tPass = $derived([
    { x: d / C0, color: 'var(--color-ink-muted)', label: 'passage + d/c₀', dash: '3 4' },
  ]);

  const wave = (cyc: number) => {
    const ph = 2 * Math.PI * cyc;
    return Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.33 * Math.sin(3 * ph) + 0.2 * Math.sin(5 * ph);
  };
  const render = (rate: number) => {
    const sound = renderPassBy(
      { V, d, c: C0, f0, t0: -half, duration: 2 * half, rate, wave },
      terms,
    );
    // half a second of silence before the loop restarts
    const out = new Float32Array(sound.length + Math.round(0.5 * rate));
    out.set(sound);
    // short fades at both ends
    const n = Math.round(0.05 * rate);
    for (let i = 0; i < n; i++) {
      out[i]! *= i / n;
      out[sound.length - 1 - i]! *= i / n;
    }
    return out;
  };
  $effect(() => {
    void [V, d, f0, terms];
    voice?.update(render(voice.rate));
  });
</script>

<VizFrame
  scene="5-passby"
  {...number ? { number } : {}}
  {title}
  animated={false}
  note="trajectoire rectiligne, vitesse constante ; origine des temps : véhicule au plus près"
>
  <div class="plots">
    <div>
      <p class="ylab">fréquence reçue (Hz)</p>
      <Plot
        x={{ min: -half, max: half, label: 't (s)' }}
        y={fRange}
        series={fSeries}
        vlines={tPass}
        height={200}
        ariaLabel={alt}
      />
    </div>
    <div>
      <p class="ylab">niveau reçu (dB ; référence : au plus près, sans mouvement)</p>
      <Plot
        x={{ min: -half, max: half, label: 't (s)' }}
        y={{ min: -30, max: 6 }}
        series={lSeries}
        vlines={tPass}
        height={200}
        ariaLabel="Niveau reçu en fonction du temps."
      />
    </div>
  </div>
  <div class="readout num" aria-live="polite">
    <span>M <b>{formatNumber(M, 3)}</b></span>
    <span>à l'approche <b>{formatNumber(f0 / (1 - M), 0)} Hz</b></span>
    <span>en s'éloignant <b>{formatNumber(f0 / (1 + M), 0)} Hz</b></span>
    <span>chute <b>{formatNumber(12 * Math.log2((1 + M) / (1 - M)), 1)} demi-tons</b></span>
  </div>
  {#snippet controls()}
    <SymbolSlider scene="5-passby" param="V" />
    <SymbolSlider scene="5-passby" param="d" />
    <SymbolSlider scene="5-passby" param="f0" />
    <TermToggles scene="5-passby" />
    <ListenButton
      label="Écouter le passage"
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
  .plots {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-5);
    padding-top: var(--space-3);
  }
  @media (max-width: 720px) {
    .plots {
      grid-template-columns: minmax(0, 1fr);
    }
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
    border-top: 1px solid var(--color-rule);
    font-size: 1rem;
  }
  b {
    font-weight: 600;
  }
</style>
