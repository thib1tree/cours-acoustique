<script lang="ts">
  /**
   * Chapter 4, D3: the baffled piston. Field from the Rayleigh integral (computed in a
   * worker), on-axis pressure with its near-field oscillations and the Rayleigh distance,
   * and the far-field directivity 2J₁(ka sin θ)/(ka sin θ).
   */
  import { onMount } from 'svelte';
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import { pistonDirectivity } from '../../lib/physics/special';
  import {
    firstNullAngle,
    halfPowerAngle,
    lastAxialMaximum,
    pistonOnAxis,
  } from '../../lib/physics/radiation';
  import { computePistonField, pistonDomain } from '../../lib/viz/piston-field';
  import VizFrame from './VizFrame.svelte';
  import ColorLegend from './ColorLegend.svelte';
  import PhasorView from './PhasorView.svelte';
  import PolarDiagram from './PolarDiagram.svelte';
  import Plot from './Plot.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('4-piston');
  const NX = 320;
  const NY = 200;

  const ka = $derived(scene.params.ka!);
  const zMax = $derived(pistonDomain(ka));
  const xMax = $derived((zMax * NY) / (2 * NX));
  const zR = $derived(ka / 2);
  const zLast = $derived.by(() => {
    const k = lastAxialMaximum(ka);
    return k === null ? null : k / ka;
  });
  const th3 = $derived(halfPowerAngle(ka));
  const th0 = $derived(firstNullAngle(ka));
  const deg = (x: number) => formatNumber((x * 180) / Math.PI, 0);

  let data = new Float32Array(NX * NY * 2);
  let version = $state(0);
  let scale = $state(1);
  let worker: Worker | null = null;
  let pending = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function accept(d: Float32Array) {
    data = d;
    let m = 0;
    for (let i = 0; i < d.length; i += 2) m = Math.max(m, Math.hypot(d[i]!, d[i + 1]!));
    scale = Math.max(1e-6, 0.55 * m);
    version++;
  }
  function request() {
    const msg = { ka, nx: NX, ny: NY, zMax, id: ++pending };
    if (worker) worker.postMessage(msg);
    else accept(computePistonField(msg));
  }
  onMount(() => {
    try {
      worker = new Worker(new URL('../../lib/viz/piston-field.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = (e: MessageEvent<{ id: number; data: Float32Array }>) => {
        if (e.data.id === pending) accept(e.data.data);
      };
    } catch {
      worker = null;
    }
    request();
    return () => worker?.terminate();
  });
  $effect(() => {
    void ka;
    clearTimeout(timer);
    timer = setTimeout(request, 60);
  });

  const axis = $derived(
    Array.from({ length: 600 }, (_, i) => {
      const z = 0.005 + (zMax * i) / 599;
      return [z, pistonOnAxis(ka, ka * z)] as const;
    }),
  );
  const vlines = $derived([
    { x: zR, color: 'var(--color-ink)', label: 'distance de Rayleigh', dash: '4 4' },
  ]);
  const markers = $derived(
    zLast !== null ? [{ x: zLast, y: 2, color: 'var(--color-pressure-pos)', r: 4 }] : [],
  );
</script>

<VizFrame
  scene="4-piston"
  {...number ? { number } : {}}
  {title}
  note="piston rigide de rayon a dans un baffle infini ; coupe par l'axe"
>
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
    <svg class="overlay" viewBox="0 0 {NX} {NY}" preserveAspectRatio="none" aria-hidden="true">
      <line
        x1="1"
        x2="1"
        y1={NY / 2 - (NY / 2) * (1 / xMax)}
        y2={NY / 2 + (NY / 2) * (1 / xMax)}
        class="piston"
        vector-effect="non-scaling-stroke"
      />
      <line
        x1={(zR / zMax) * NX}
        x2={(zR / zMax) * NX}
        y1="0"
        y2={NY}
        class="rayleigh"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  </div>
  <div class="readout num" aria-live="polite">
    {#if th3 !== null}
      <span>demi-angle à −3 dB <b>{deg(th3)}°</b></span>
    {:else}
      <span>pas de faisceau : moins de 3 dB d'écart dans tout le demi-espace</span>
    {/if}
    {#if th0 !== null}<span>premier zéro <b>{deg(th0)}°</b></span>{/if}
    <span>distance de Rayleigh <b>{formatNumber(zR, 1)} a</b></span>
  </div>
  <div class="grid">
    <div>
      <p class="ylab">|p| sur l'axe / ρ₀c₀U</p>
      <Plot
        x={{ min: 0, max: zMax, label: 'z / a' }}
        y={{ min: 0, max: 2.2 }}
        series={[{ points: axis, color: 'var(--color-pressure-pos)', width: 2 }]}
        {vlines}
        {markers}
        height={200}
        ariaLabel="Amplitude de la pression sur l'axe du piston en fonction de la distance : oscillations en champ proche, puis décroissance en 1/z au-delà de la distance de Rayleigh."
      />
    </div>
    <div>
      <PolarDiagram
        half
        pattern={(th) => pistonDirectivity(ka, th)}
        version={ka}
        ariaLabel="Directivité du piston en champ lointain."
      />
      <p class="cap">directivité en champ lointain</p>
    </div>
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
    <SymbolSlider scene="4-piston" param="ka" />
  {/snippet}
</VizFrame>

<style>
  .stage {
    position: relative;
    border-left: 4px solid var(--color-ink);
  }
  .overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .piston {
    stroke: var(--color-velocity);
    stroke-width: 6;
  }
  .rayleigh {
    stroke: var(--color-ink);
    stroke-width: 1;
    stroke-dasharray: 4 4;
  }
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    gap: var(--space-5);
    align-items: center;
    padding-top: var(--space-3);
  }
  @media (max-width: 720px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .ylab {
    margin: 0 0 var(--space-1);
    font-family: var(--font-sans);
    font-size: 0.8125rem;
    color: var(--color-ink-muted);
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
    border-bottom: 1px solid var(--color-rule);
    font-size: 1rem;
  }
  b {
    font-weight: 600;
  }
</style>
