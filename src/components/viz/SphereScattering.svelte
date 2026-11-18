<script lang="ts">
  /**
   * Chapter 6, D2: a plane wave meets a rigid sphere. Exact partial-wave field (total or
   * scattered only), far-field pattern, and scattering cross-section versus ka with its
   * two limits: Rayleigh (7/9)(ka)⁴ and the geometric 2πa². Sound: broadband noise as
   * scattered by a sphere of radius a (spectrum weighted by the cross-section).
   */
  import { onMount } from 'svelte';
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import { abs } from '../../lib/physics/complex';
  import {
    farField,
    rigidSphereCoefficients,
    scatteringEfficiency,
  } from '../../lib/physics/scattering';
  import { sphereDomain } from '../../lib/viz/fields';
  import { createFieldClient } from '../../lib/viz/field-client';
  import { shapedNoise } from '../../lib/audio/fft';
  import { startBufferLoop, type BufferLoop } from '../../lib/audio/synth/buffer-loop';
  import VizFrame from './VizFrame.svelte';
  import ColorLegend from './ColorLegend.svelte';
  import PhasorView from './PhasorView.svelte';
  import PolarDiagram from './PolarDiagram.svelte';
  import Plot, { type Series } from './Plot.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';
  import ListenButton from '../ui/ListenButton.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('6-sphere');
  const C0 = 343.2;
  const NX = 288;
  const NY = 192;
  let voice: BufferLoop | null = null;

  const ka = $derived(scene.params.ka!);
  const scattered = $derived(scene.views.show === 'scattered');
  const width = $derived(sphereDomain(ka));
  const A = $derived(rigidSphereCoefficients(ka));
  const Q = $derived(scatteringEfficiency(ka));
  const gF = $derived(abs(farField(ka, 1, A)));
  const gB = $derived(abs(farField(ka, -1, A)));
  const gmax = $derived.by(() => {
    let m = 1e-30;
    for (let i = 0; i <= 180; i++)
      m = Math.max(m, abs(farField(ka, Math.cos((Math.PI * i) / 180), A)));
    return m;
  });

  let data = new Float32Array(NX * NY * 2);
  let version = $state(0);
  let scale = $state(1.5);
  const client = createFieldClient((d) => {
    data = d;
    if (scattered) {
      let m = 1e-9;
      for (let i = 0; i < d.length; i += 2) m = Math.max(m, Math.hypot(d[i]!, d[i + 1]!));
      scale = 0.6 * m;
    } else scale = 1.5;
    version++;
  });
  onMount(() => () => client.dispose());
  let first = true;
  $effect(() => {
    client.request({ kind: 'sphere', ka, nx: NX, ny: NY, width, scattered }, first ? 0 : 60);
    first = false;
  });

  const KA = Array.from({ length: 200 }, (_, i) => 0.05 * 2000 ** (i / 199));
  const series: Series[] = [
    {
      points: KA.map((x) => [x, scatteringEfficiency(x)] as const),
      color: 'var(--color-ink)',
      width: 2,
    },
    {
      points: KA.filter((x) => x < 1.5).map((x) => [x, (7 / 9) * x ** 4] as const),
      color: 'var(--color-ink-muted)',
      width: 1.5,
      dash: '4 4',
      label: 'Rayleigh',
      labelAt: 'end',
    },
    {
      points: [
        [3, 2],
        [100, 2],
      ],
      color: 'var(--color-ink-muted)',
      width: 1.5,
      dash: '4 4',
      label: '2πa²',
      labelAt: 'end',
    },
  ];

  function render(rate: number) {
    const a = scene.params.a! * 1e-2;
    const NF = 200;
    const fs = Array.from({ length: NF }, (_, i) => 20 * 1000 ** (i / (NF - 1)));
    const w = fs.map((f) =>
      scene.views.hear === 'incident'
        ? 1
        : Math.sqrt(scatteringEfficiency((2 * Math.PI * f * a) / C0)),
    );
    const gain = (f: number) => {
      if (f < 30 || f > 18000) return 0;
      const u = Math.log(f / 20) / Math.log(1000);
      const k = Math.min(NF - 2, Math.max(0, Math.floor(u * (NF - 1))));
      const t = u * (NF - 1) - k;
      return (w[k]! * (1 - t) + w[k + 1]! * t) / Math.sqrt(f);
    };
    return shapedNoise(1 << 17, rate, gain, 11);
  }
  $effect(() => {
    void [scene.params.a, scene.views.hear];
    voice?.update(render(voice.rate));
  });
</script>

<VizFrame
  scene="6-sphere"
  {...number ? { number } : {}}
  {title}
  note="sphère rigide immobile ; onde plane venant de la gauche ; coupe par un plan diamétral"
>
  <div class="grid">
    <div class="stage">
      <PhasorView
        nx={NX}
        ny={NY}
        field={() => data}
        {version}
        {scale}
        playing={() => scene.playing}
        {alt}
        aspect="{NX} / {NY}"
      />
      <svg
        class="overlay"
        viewBox="0 0 {NX} {NY}"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <circle cx={NX / 2} cy={NY / 2} r={Math.max(1.5, (ka / width) * NX)} class="ball" />
      </svg>
    </div>
    <div>
      <PolarDiagram
        pattern={(th) => abs(farField(ka, Math.sin(th), A)) / gmax}
        version={ka}
        ariaLabel="Diagramme de diffusion en champ lointain ; l'onde incidente va vers la droite."
      />
      <p class="cap">amplitude diffusée (champ lointain) ; onde incidente vers la droite</p>
    </div>
  </div>
  <div class="readout num" aria-live="polite">
    <span>σ / πa² <b>{formatNumber(Q, Q < 0.01 ? 5 : 3)}</b></span>
    <span>arrière / avant <b>{formatNumber(20 * Math.log10(gB / gF), 1)} dB</b></span>
    <span
      >pour a = {formatNumber(scene.params.a!, 1)} cm, ka = 1 à
      <b>{formatNumber(C0 / (2 * Math.PI * scene.params.a! * 1e-2), 0)} Hz</b></span
    >
  </div>
  <div class="pad">
    <p class="ylab">section efficace de diffusion / πa²</p>
    <Plot
      x={{ min: 0.05, max: 100, log: true, label: 'ka' }}
      y={{ min: 1e-5, max: 4, log: true }}
      {series}
      markers={[{ x: ka, y: Q, color: 'var(--color-ink)', r: 5 }]}
      height={200}
      ariaLabel="Section efficace de diffusion en fonction de ka, en échelles logarithmiques : pente (ka) puissance 4 aux basses fréquences, puis palier à deux fois la section géométrique."
    />
  </div>
  {#snippet legend()}<ColorLegend
      label="pression"
      symbol="p"
      unit="u. a."
      min="−"
      mid="0"
      max="+"
    />{/snippet}
  {#snippet controls()}
    <SymbolSlider scene="6-sphere" param="ka" />
    <ViewToggle scene="6-sphere" view="show" />
    <SymbolSlider scene="6-sphere" param="a" />
    <ViewToggle scene="6-sphere" view="hear" />
    <ListenButton
      label="Écouter un bruit large bande"
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
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    gap: var(--space-4);
    align-items: center;
  }
  @media (max-width: 720px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
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
  .ball {
    fill: var(--color-surface);
    stroke: var(--color-ink);
    stroke-width: 1.5;
  }
  .cap {
    margin: 0;
    text-align: center;
    font-family: var(--font-sans);
    font-size: 0.8125rem;
    color: var(--color-ink-muted);
  }
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
    border-top: 1px solid var(--color-rule);
    border-bottom: 1px solid var(--color-rule);
    font-size: 1rem;
  }
  b {
    font-weight: 600;
  }
</style>
