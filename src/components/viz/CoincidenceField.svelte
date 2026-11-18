<script lang="ts">
  /**
   * Chapter 8, D2: coincidence. A plane wave hits a 4 mm glass pane at angle θ. Above:
   * incident + reflected; below: transmitted. The pane is forced at the trace wavelength
   * λ/sin θ; when this equals its free bending wavelength, it stops resisting and the
   * wave goes through. Plot: insulation versus angle at the chosen frequency.
   */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import {
    coincidenceFrequency,
    transmissionLoss,
    wallTransmission,
  } from '../../lib/physics/vibro';
  import { plateOf } from '../../scenes/vibro';
  import VizFrame from './VizFrame.svelte';
  import ColorLegend from './ColorLegend.svelte';
  import PhasorView from './PhasorView.svelte';
  import Plot, { type Series } from './Plot.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import TermToggles from '../ui/TermToggles.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('8-coinc');
  const C0 = 343.2;
  const RHO = 1.204;
  const NX = 300;
  const NY = 200;
  const LAM = 50; // cells per wavelength in air
  const plate = plateOf('glass', 4);
  const fc = coincidenceFrequency(C0, plate);

  const fr = $derived(scene.params.fr!);
  const th = $derived((scene.params.theta! * Math.PI) / 180);
  const terms = $derived({ bending: true, damping: scene.term('damping') });
  const T = $derived(wallTransmission(fr * fc, th, plate, RHO, C0, terms));
  const tlNow = $derived(-20 * Math.log10(Math.hypot(T[0], T[1])));
  const thCo = $derived(fr >= 1 ? Math.asin(1 / Math.sqrt(fr)) : null);

  function field(): Float32Array {
    const k = (2 * Math.PI) / LAM;
    const kx = k * Math.sin(th);
    const kz = k * Math.cos(th);
    const R: [number, number] = [1 - T[0], -T[1]];
    const out = new Float32Array(NX * NY * 2);
    for (let j = 0; j < NY; j++) {
      const y = j + 0.5 - NY / 2;
      for (let i = 0; i < NX; i++) {
        const x = i + 0.5 - NX / 2;
        let re: number;
        let im: number;
        if (y > 0) {
          const a = kx * x - kz * y;
          const b = kx * x + kz * y;
          re = Math.cos(a) + R[0] * Math.cos(b) - R[1] * Math.sin(b);
          im = Math.sin(a) + R[0] * Math.sin(b) + R[1] * Math.cos(b);
        } else {
          const a = kx * x - kz * y;
          re = T[0] * Math.cos(a) - T[1] * Math.sin(a);
          im = T[0] * Math.sin(a) + T[1] * Math.cos(a);
        }
        out[2 * (j * NX + i)] = re;
        out[2 * (j * NX + i) + 1] = im;
      }
    }
    return out;
  }

  const TH = Array.from({ length: 179 }, (_, i) => i * 0.5);
  const series: Series[] = $derived([
    {
      points: TH.map(
        (d) => [d, transmissionLoss(fr * fc, (d * Math.PI) / 180, plate, RHO, C0, terms)] as const,
      ),
      color: 'var(--color-ink)',
      width: 2,
    },
  ]);
</script>

<VizFrame
  scene="8-coinc"
  {...number ? { number } : {}}
  {title}
  note="vitre de 4 mm ; onde plane venant d'en haut à gauche"
>
  <div class="stage">
    <PhasorView
      nx={NX}
      ny={NY}
      {field}
      version={[fr, th, terms.damping]}
      scale={2}
      playing={() => scene.playing}
      {alt}
      aspect="{NX} / {NY}"
    />
    <svg class="overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1="50" x2="100" y2="50" class="pane" vector-effect="non-scaling-stroke" />
    </svg>
    {#if tlNow > 20}<span class="faint num"
        >onde transmise {formatNumber(tlNow, 0)} dB sous l'onde incidente : invisible à cette échelle</span
      >{/if}
  </div>
  <div class="readout num" aria-live="polite">
    <span
      >λ<sub>trace</sub> / λ<sub>flexion</sub>
      <b>{formatNumber(1 / (Math.sin(th) * Math.sqrt(fr) || 1e-9), 2)}</b></span
    >
    <span>isolement <b>{formatNumber(-20 * Math.log10(Math.hypot(T[0], T[1])), 1)} dB</b></span>
    <span
      >angle de coïncidence <b
        >{thCo === null ? 'aucun (f < f_c)' : `${formatNumber((thCo * 180) / Math.PI, 0)}°`}</b
      ></span
    >
  </div>
  <div class="pad">
    <p class="ylab">isolement selon l'angle d'incidence, à cette fréquence (dB)</p>
    <Plot
      x={{ min: 0, max: 89, label: 'θ (°)' }}
      y={{ min: 0, max: 70 }}
      {series}
      markers={[
        {
          x: scene.params.theta!,
          y: Math.min(70, -20 * Math.log10(Math.hypot(T[0], T[1]))),
          color: 'var(--color-ink)',
          r: 5,
        },
      ]}
      height={180}
      ariaLabel="Isolement en fonction de l'angle d'incidence : un creux profond à l'angle de coïncidence, s'il existe."
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
    <SymbolSlider scene="8-coinc" param="fr" />
    <SymbolSlider scene="8-coinc" param="theta" />
    <TermToggles scene="8-coinc" />
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
  .faint {
    position: absolute;
    left: 50%;
    top: 75%;
    transform: translate(-50%, -50%);
    max-width: 80%;
    text-align: center;
    color: var(--color-ink-muted);
    font-size: 0.9375rem;
  }
  .pane {
    stroke: var(--color-ink);
    stroke-width: 4;
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
