<script lang="ts">
  /**
   * Chapter 4, D2: two point sources, in phase or in opposition. When they are much closer
   * than a wavelength and opposed, the air just shuttles from one to the other (acoustic
   * short circuit): the near field is strong, the radiated power collapses as (kd)²/6.
   * Sound: a bass note whose harmonics are weighted by the pair's radiation efficiency.
   */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import { pairDirectivity, pairPowerRatio } from '../../lib/physics/radiation';
  import { startPeriodic, type PeriodicTone } from '../../lib/audio/synth/periodic';
  import VizFrame from './VizFrame.svelte';
  import ColorLegend from './ColorLegend.svelte';
  import PhasorView from './PhasorView.svelte';
  import PolarDiagram from './PolarDiagram.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';
  import ListenButton from '../ui/ListenButton.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('4-pair');
  const C0 = 343.2;
  const NX = 240;
  const NY = 160;
  const F0 = 55; // Hz, listening tone
  let tone: PeriodicTone | null = null;

  const sign = $derived<1 | -1>(scene.views.phase === 'same' ? 1 : -1);
  const dOverLambda = $derived((scene.params.d! * 1e-2 * scene.params.f!) / C0);
  const kd = $derived(2 * Math.PI * dOverLambda);
  const lam = $derived(Math.max(8, Math.min(40, (NX * 0.6) / Math.max(dOverLambda, 1e-9)))); // cells per λ
  const dc = $derived(dOverLambda * lam);
  const ratio = $derived(pairPowerRatio(kd, sign));
  const pmax = $derived.by(() => {
    let m = 0;
    for (let i = 0; i <= 360; i++) m = Math.max(m, pairDirectivity(kd, sign, (Math.PI * i) / 360));
    return m;
  });

  function field(): Float32Array {
    const k = (2 * Math.PI) / lam;
    const out = new Float32Array(NX * NY * 2);
    const x1 = NX / 2 - dc / 2;
    const x2 = NX / 2 + dc / 2;
    const yc = NY / 2;
    for (let j = 0; j < NY; j++) {
      const y = j + 0.5 - yc;
      for (let i = 0; i < NX; i++) {
        const x = i + 0.5;
        const r1 = Math.max(0.6, Math.hypot(x - x1, y));
        const r2 = Math.max(0.6, Math.hypot(x - x2, y));
        const a1 = 1 / (k * r1);
        const a2 = sign / (k * r2);
        out[2 * (j * NX + i)] = a1 * Math.cos(k * r1) + a2 * Math.cos(k * r2);
        out[2 * (j * NX + i) + 1] = a1 * Math.sin(k * r1) + a2 * Math.sin(k * r2);
      }
    }
    return out;
  }

  function spectrum(): number[] {
    const d = scene.params.d! * 1e-2;
    return Array.from({ length: 24 }, (_, i) => {
      const n = i + 1;
      const kdn = (2 * Math.PI * n * F0 * d) / C0;
      return Math.sqrt(pairPowerRatio(kdn, sign) / 2) / n;
    });
  }
  $effect(() => {
    void [scene.params.d, sign];
    tone?.set(F0, spectrum());
  });
</script>

<VizFrame
  scene="4-pair"
  {...number ? { number } : {}}
  {title}
  note="deux sources ponctuelles de même débit ; coupe dans un plan qui les contient"
>
  <div class="grid">
    <div class="stage">
      <PhasorView
        nx={NX}
        ny={NY}
        {field}
        version={[kd, sign, lam]}
        scale={0.3}
        playing={() => scene.playing}
        {alt}
        aspect="{NX} / {NY}"
      />
      <svg class="overlay" viewBox="0 0 {NX} {NY}" preserveAspectRatio="none" aria-hidden="true">
        <line
          x1={NX / 2 - lam / 2}
          x2={NX / 2 + lam / 2}
          y1={NY - 8}
          y2={NY - 8}
          class="scale"
          vector-effect="non-scaling-stroke"
        />
      </svg>
      <span class="lam" style:left="{50}%">λ</span>
    </div>
    <div class="polar">
      <PolarDiagram
        pattern={(th) => pairDirectivity(kd, sign, th - Math.PI / 2) / pmax}
        version={[kd, sign]}
        ariaLabel="Directivité en champ lointain de la paire de sources, axe des sources horizontal."
      />
      <p class="cap">directivité (champ lointain), axe des sources horizontal</p>
    </div>
  </div>
  <div class="readout num" aria-live="polite">
    <span>kd <b>{formatNumber(kd, 2)}</b></span>
    <span>d / λ <b>{formatNumber(dOverLambda, 2)}</b></span>
    <span
      >puissance rayonnée / deux sources isolées <b>{formatNumber(10 * Math.log10(ratio), 1)} dB</b
      ></span
    >
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
    <SymbolSlider scene="4-pair" param="f" />
    <SymbolSlider scene="4-pair" param="d" />
    <ViewToggle scene="4-pair" view="phase" />
    <ListenButton
      label="Écouter une note grave à 55 Hz"
      onstart={async () => {
        tone = await startPeriodic(F0, spectrum());
      }}
      onstop={() => {
        tone?.stop();
        tone = null;
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
  .scale {
    stroke: var(--color-ink);
    stroke-width: 2;
  }
  .lam {
    position: absolute;
    bottom: 12px;
    transform: translateX(-50%);
    font-family: var(--font-serif);
    font-style: italic;
    color: var(--color-ink);
  }
  .cap {
    margin: 0;
    text-align: center;
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
