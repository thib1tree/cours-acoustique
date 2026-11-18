<script lang="ts">
  /**
   * Chapter 6, D1: a plane wave grazes the edge of a rigid screen (a noise barrier).
   * Exact Sommerfeld field; switching the diffracted wave off leaves geometrical
   * acoustics (a sharp, silent shadow). Plots: level at the listener versus frequency,
   * and level around the edge at the listener's distance. Sound: noise heard at the
   * listener, shaped by the same transfer function.
   */
  import { onMount } from 'svelte';
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import { abs } from '../../lib/physics/complex';
  import { halfPlane } from '../../lib/physics/diffraction';
  import { EDGE_PHI0 } from '../../scenes/diffraction';
  import { createFieldClient } from '../../lib/viz/field-client';
  import { shapedNoise } from '../../lib/audio/fft';
  import { startBufferLoop, type BufferLoop } from '../../lib/audio/synth/buffer-loop';
  import VizFrame from './VizFrame.svelte';
  import ColorLegend from './ColorLegend.svelte';
  import PhasorView from './PhasorView.svelte';
  import Plot, { type Series } from './Plot.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import TermToggles from '../ui/TermToggles.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';
  import ListenButton from '../ui/ListenButton.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('6-edge');
  const C0 = 343.2;
  const NX = 288;
  const NY = 216;
  const W = 12 * 2 * Math.PI; // domain width in units of 1/k: twelve wavelengths
  const H = (W * NY) / NX;
  let voice: BufferLoop | null = null;

  const f = $derived(scene.params.f!);
  const r = $derived(scene.params.r!);
  const th = $derived((scene.params.theta! * Math.PI) / 180);
  const diff = $derived(scene.term('diff'));
  const level = (freq: number, theta: number, d = diff) => {
    const u = halfPlane((2 * Math.PI * freq * r) / C0, Math.PI / 2 - theta, EDGE_PHI0);
    return 20 * Math.log10(Math.max(abs(d ? u.total : u.geometric), 1e-5));
  };
  const L = $derived(level(f, th));

  // Field (computed off the main thread).
  let data = new Float32Array(NX * NY * 2);
  let version = $state(0);
  const client = createFieldClient((d) => {
    data = d;
    version++;
  });
  onMount(() => () => client.dispose());
  let first = true;
  $effect(() => {
    client.request(
      { kind: 'edge', nx: NX, ny: NY, width: W, phi0: EDGE_PHI0, diffracted: diff },
      first ? 0 : 30,
    );
    first = false;
  });

  // Listener position in the picture (%), clamped to the frame.
  const krL = $derived((2 * Math.PI * f * r) / C0);
  const listener = $derived.by(() => {
    let x = krL * Math.cos(-th);
    let y = krL * Math.sin(-th);
    const s = Math.min(
      1,
      (W / 2 - 1) / Math.max(Math.abs(x), 1e-9),
      (H / 2 - 1) / Math.max(Math.abs(y), 1e-9),
    );
    const inside = s >= 1;
    x *= s;
    y *= s;
    return { x: 50 + (100 * x) / W, y: 50 - (100 * y) / H, inside };
  });

  const F = Array.from({ length: 160 }, (_, i) => 63 * (8000 / 63) ** (i / 159));
  const clip = (v: number) => Math.max(-40, Math.min(8, v));
  const fSeries: Series[] = $derived([
    {
      points: F.map((x) => [x, clip(level(x, th, true))] as const),
      color: 'var(--color-ink)',
      width: 2,
    },
    {
      points: F.map((x) => [x, clip(level(x, th, false))] as const),
      color: 'var(--color-ink-muted)',
      width: 1.5,
      dash: '4 4',
    },
  ]);
  const TH = Array.from({ length: 221 }, (_, i) => -30 + i * 0.5);
  const aSeries: Series[] = $derived([
    {
      points: TH.map((d) => [d, clip(level(f, (d * Math.PI) / 180, true))] as const),
      color: 'var(--color-ink)',
      width: 2,
    },
    {
      points: TH.map((d) => [d, clip(level(f, (d * Math.PI) / 180, false))] as const),
      color: 'var(--color-ink-muted)',
      width: 1.5,
      dash: '4 4',
    },
  ]);

  function render(rate: number) {
    const NF = 256;
    const fs = Array.from({ length: NF }, (_, i) => 20 * 1000 ** (i / (NF - 1)));
    const gains = fs.map((x) => (scene.views.hear === 'free' ? 1 : 10 ** (level(x, th) / 20)));
    const gain = (x: number) => {
      if (x < 30 || x > 18000) return 0;
      const u = Math.log(x / 20) / Math.log(1000);
      const k = Math.min(NF - 2, Math.max(0, Math.floor(u * (NF - 1))));
      const w = u * (NF - 1) - k;
      return (gains[k]! * (1 - w) + gains[k + 1]! * w) / Math.sqrt(x);
    };
    // Keep the free-field loudness as the reference, so the shadow is heard as quieter.
    const x = shapedNoise(1 << 17, rate, gain, 7);
    const ref = shapedNoise(1 << 17, rate, (q) => (q < 30 || q > 18000 ? 0 : 1 / Math.sqrt(q)), 7);
    let m = 1e-12;
    for (const v of ref) m = Math.max(m, Math.abs(v));
    const out = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) out[i] = (0.5 * x[i]!) / m;
    return out;
  }
  $effect(() => {
    void [f, r, th, diff, scene.views.hear];
    voice?.update(render(voice.rate));
  });
</script>

<VizFrame
  scene="6-edge"
  {...number ? { number } : {}}
  {title}
  note="écran rigide mince, onde plane venant de la gauche ; domaine de 12 longueurs d'onde"
>
  <div class="stage">
    <PhasorView
      nx={NX}
      ny={NY}
      field={() => data}
      {version}
      scale={1.6}
      playing={() => scene.playing}
      {alt}
      aspect="{NX} / {NY}"
    />
    <svg class="overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <line x1="50" y1="50" x2="100" y2="50" class="boundary" vector-effect="non-scaling-stroke" />
      <line x1="50" y1="50" x2="50" y2="100" class="screen" vector-effect="non-scaling-stroke" />
    </svg>
    <span
      class="ear"
      class:out={!listener.inside}
      style:left="{listener.x}%"
      style:top="{listener.y}%"
      title="auditeur"
    ></span>
  </div>
  <div class="readout num" aria-live="polite">
    <span
      >niveau chez l'auditeur <b>{formatNumber(L, 1)} dB</b>
      <small>(par rapport au champ libre)</small></span
    >
    <span
      >auditeur à <b>{formatNumber((r * f) / C0, 1)} λ</b> de l'arête{listener.inside
        ? ''
        : ' (hors cadre)'}</span
    >
  </div>
  <div class="plots">
    <div>
      <p class="ylab">niveau chez l'auditeur (dB) selon la fréquence</p>
      <Plot
        x={{ min: 63, max: 8000, log: true, label: 'f (Hz)' }}
        y={{ min: -40, max: 8 }}
        series={fSeries}
        markers={[{ x: f, y: clip(L), color: 'var(--color-ink)', r: 5 }]}
        height={190}
        ariaLabel="Niveau chez l'auditeur en fonction de la fréquence : il baisse d'environ 3 dB par octave dans l'ombre."
      />
    </div>
    <div>
      <p class="ylab">niveau à la distance r, selon l'angle sous la limite de l'ombre (dB)</p>
      <Plot
        x={{ min: -30, max: 80, label: 'θ (°)' }}
        y={{ min: -40, max: 8 }}
        series={aSeries}
        vlines={[
          { x: 0, color: 'var(--color-ink-muted)', dash: '3 4', label: 'limite de l’ombre' },
        ]}
        markers={[{ x: scene.params.theta!, y: clip(L), color: 'var(--color-ink)', r: 5 }]}
        height={190}
        ariaLabel="Niveau en fonction de l'angle autour de l'arête : −6 dB exactement sur la limite de l'ombre, décroissance progressive dans l'ombre."
      />
    </div>
  </div>
  {#snippet legend()}
    <div class="keys">
      <span class="key"><i style:background="var(--color-ink)"></i>avec diffraction</span>
      <span class="key"><i class="dash"></i>acoustique géométrique</span>
    </div>
    <ColorLegend label="pression" symbol="p" unit="u. a." min="−" mid="0" max="+" />
  {/snippet}
  {#snippet controls()}
    <SymbolSlider scene="6-edge" param="f" />
    <SymbolSlider scene="6-edge" param="r" />
    <SymbolSlider scene="6-edge" param="theta" />
    <TermToggles scene="6-edge" />
    <ViewToggle scene="6-edge" view="hear" />
    <ListenButton
      label="Écouter un bruit large bande"
      onstart={async () => {
        voice = await startBufferLoop(render, false);
      }}
      onstop={() => {
        voice?.stop();
        voice = null;
      }}
    />
  {/snippet}
</VizFrame>

<style>
  .stage {
    position: relative;
  }
  .overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .screen {
    stroke: var(--color-ink);
    stroke-width: 5;
  }
  .boundary {
    stroke: var(--color-ink);
    stroke-width: 1;
    stroke-dasharray: 5 4;
  }
  .ear {
    position: absolute;
    width: 14px;
    height: 14px;
    margin: -7px 0 0 -7px;
    border: 2px solid var(--color-ink);
    border-radius: 50%;
    background: var(--color-bg);
    pointer-events: none;
  }
  .ear.out {
    border-style: dashed;
  }
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
    border-bottom: 1px solid var(--color-rule);
    font-size: 1rem;
  }
  small {
    color: var(--color-ink-muted);
    font-size: 0.875rem;
  }
  b {
    font-weight: 600;
  }
  .keys {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
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
