<script lang="ts">
  /**
   * Chapter 3, D5: transverse modes in a hard-walled duct. A guided mode cos(mπy/b) e^{ik_x x}
   * is two plane waves crossing at ±θ (sin θ = f_c/f); at cut-off they bounce straight
   * across and stop progressing; below it the mode is evanescent.
   */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import { planeWaveAngle } from '../../lib/physics/waveguide';
  import VizFrame from './VizFrame.svelte';
  import ColorLegend from './ColorLegend.svelte';
  import PhasorView from './PhasorView.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('3-duct');
  const NX = 240;
  const NY = 72; // duct width b in cells

  const fr = $derived(scene.params.fr!);
  const m = $derived(Math.round(scene.params.m!));
  const single = $derived(scene.views.show === 'wave');
  const theta = $derived(planeWaveAngle(fr, 1));

  function field(): Float32Array {
    const ky = (m * Math.PI) / NY;
    const k = ky * fr;
    const d = k * k - ky * ky;
    const kx = Math.sqrt(Math.abs(d));
    const out = new Float32Array(NX * NY * 2);
    for (let j = 0; j < NY; j++) {
      const y = j + 0.5;
      for (let i = 0; i < NX; i++) {
        let re: number;
        let im: number;
        if (d >= 0) {
          if (single) {
            // one of the two plane waves: ½ e^{i(kx x + ky y)}
            re = 0.5 * Math.cos(kx * i + ky * y);
            im = 0.5 * Math.sin(kx * i + ky * y);
          } else {
            const t = Math.cos(ky * y);
            re = t * Math.cos(kx * i);
            im = t * Math.sin(kx * i);
          }
        } else {
          const t = Math.cos(ky * y) * Math.exp(-kx * i);
          re = t;
          im = 0;
        }
        out[2 * (j * NX + i)] = re;
        out[2 * (j * NX + i) + 1] = im;
      }
    }
    return out;
  }

  // Zig-zag ray in % coordinates.
  const zig = $derived.by(() => {
    if (theta === null) return '';
    const pts: string[] = [];
    const run = (NY / Math.tan(theta)) * (100 / NX); // % of width per crossing
    let x = 0;
    let top = false;
    pts.push(`0,100`);
    while (x < 100) {
      x += run;
      top = !top;
      pts.push(`${Math.min(x, 100)},${top ? 0 : 100}`);
    }
    return pts.join(' ');
  });
  const evDepth = $derived(fr < 1 ? 1 / (Math.sqrt(1 - fr * fr) * m * Math.PI) : null); // in units of b
</script>

<VizFrame
  scene="3-duct"
  {...number ? { number } : {}}
  {title}
  note="conduit à parois rigides, source à gauche"
>
  <div class="stage">
    <PhasorView
      nx={NX}
      ny={NY}
      {field}
      version={[fr, m, single]}
      scale={1}
      playing={() => scene.playing}
      {alt}
      aspect="{NX} / {NY}"
    />
    {#if theta !== null}
      <svg class="overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={zig} class="zig" vector-effect="non-scaling-stroke" />
      </svg>
    {/if}
  </div>
  <div class="readout num" aria-live="polite">
    {#if theta !== null}
      <span>angle des ondes planes <b>±{formatNumber((theta * 180) / Math.PI, 0)}°</b></span>
      <span>vitesse de phase <b>{formatNumber(1 / Math.cos(theta), 2)} c₀</b></span>
      <span>vitesse de groupe <b>{formatNumber(Math.cos(theta), 2)} c₀</b></span>
    {:else}
      <span
        >sous la coupure : mode évanescent, amplitude divisée par e tous les <b
          >{formatNumber(evDepth ?? 0, 2)} b</b
        ></span
      >
    {/if}
  </div>
  {#snippet legend()}<ColorLegend
      label="pression"
      symbol="p"
      unit="u. a."
      min="−1"
      mid="0"
      max="+1"
    />{/snippet}
  {#snippet controls()}
    <SymbolSlider scene="3-duct" param="fr" />
    <SymbolSlider scene="3-duct" param="m" />
    <ViewToggle scene="3-duct" view="show" />
  {/snippet}
</VizFrame>

<style>
  .stage {
    position: relative;
    border-top: 2px solid var(--color-ink);
    border-bottom: 2px solid var(--color-ink);
  }
  .overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .zig {
    fill: none;
    stroke: var(--color-ink);
    stroke-width: 1.5;
    stroke-dasharray: 5 4;
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
