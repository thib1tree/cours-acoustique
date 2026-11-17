<script lang="ts">
  /**
   * Chapter 2, D3: oblique incidence. Complex field on both sides of a vertical
   * interface: incident + reflected in medium 1, transmitted (or evanescent) in medium 2.
   * The trace of the wavefronts along the interface is the same on both sides.
   */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import { type Complex, mul } from '../../lib/physics/complex';
  import { criticalAngle, oblique, planeWave } from '../../lib/physics/interface';
  import VizFrame from './VizFrame.svelte';
  import ColorLegend from './ColorLegend.svelte';
  import PhasorView from './PhasorView.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('2-oblique');
  const NX = 320;
  const NY = 200;
  const LAMBDA1 = 26; // cells per wavelength in medium 1

  const th = $derived((scene.params.theta! * Math.PI) / 180);
  const cr = $derived(scene.params.cr!);
  const rr = $derived(scene.params.rr!);
  const o = $derived(oblique({ rho: 1, c: 1 }, { rho: rr, c: cr }, th));
  const tc = $derived(criticalAngle(1, cr));

  function field(): Float32Array {
    const k1 = (2 * Math.PI) / LAMBDA1;
    const k2 = k1 / cr;
    const ky = k1 * Math.sin(th);
    const kx1 = k1 * Math.cos(th);
    const kx2: Complex = [k2 * o.cosT[0], k2 * o.cosT[1]];
    const out = new Float32Array(NX * NY * 2);
    for (let j = 0; j < NY; j++) {
      const y = j - NY / 2;
      for (let i = 0; i < NX; i++) {
        const x = i - NX / 2;
        let P: Complex;
        if (x < 0) {
          const inc = planeWave([kx1, 0], ky, x, y);
          const ref = mul(o.R, planeWave([-kx1, 0], ky, x, y));
          P = [inc[0] + ref[0], inc[1] + ref[1]];
        } else P = mul(o.T, planeWave(kx2, ky, x, y));
        out[2 * (j * NX + i)] = P[0];
        out[2 * (j * NX + i) + 1] = P[1];
      }
    }
    return out;
  }

  // Ray arrows (in % of the box), drawn from the interface centre.
  const arrow = (angle: number, len: number, back = false) => {
    const dx = Math.cos(angle) * len;
    const dy = -Math.sin(angle) * len * (NX / NY);
    return back
      ? { x1: 50 - dx, y1: 50 - dy, x2: 50, y2: 50 }
      : { x1: 50, y1: 50, x2: 50 + dx, y2: 50 + dy };
  };
  const rays = $derived([
    { ...arrow(th, 26, true), label: 'incidente' },
    { ...arrow(Math.PI - th, 26), label: 'réfléchie' },
    ...(o.thetaT !== null ? [{ ...arrow(o.thetaT, 26), label: 'transmise' }] : []),
  ]);
</script>

<VizFrame
  scene="2-oblique"
  {...number ? { number } : {}}
  {title}
  note="interface verticale, milieu 1 à gauche"
>
  <div class="stage">
    <PhasorView
      nx={NX}
      ny={NY}
      {field}
      version={o}
      scale={2}
      playing={() => scene.playing}
      {alt}
      aspect="{NX} / {NY}"
    />
    <svg class="overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <line x1="50" y1="0" x2="50" y2="100" class="iface" vector-effect="non-scaling-stroke" />
      <line x1="0" y1="50" x2="100" y2="50" class="normal" vector-effect="non-scaling-stroke" />
      <defs>
        <marker
          id="ob-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" class="head" />
        </marker>
      </defs>
      {#each rays as r (r.label)}
        <line
          x1={r.x1}
          y1={r.y1}
          x2={r.x2}
          y2={r.y2}
          class="ray"
          marker-end="url(#ob-arrow)"
          vector-effect="non-scaling-stroke"
        />
      {/each}
    </svg>
    {#if o.thetaT === null}<p class="tag">
        réflexion totale : onde évanescente dans le milieu 2
      </p>{/if}
  </div>
  <div class="readout num" aria-live="polite">
    <span>|<i>R</i>| = <b>{formatNumber(Math.hypot(o.R[0], o.R[1]), 3)}</b></span>
    <span>énergie transmise <b>{formatNumber(100 * o.tau, 1)} %</b></span>
    <span
      >angle transmis <b
        >{o.thetaT === null ? 'aucun' : formatNumber((o.thetaT * 180) / Math.PI, 1) + '°'}</b
      ></span
    >
    <span
      >angle critique <b
        >{tc === null ? 'aucun (c₂ < c₁)' : formatNumber((tc * 180) / Math.PI, 1) + '°'}</b
      ></span
    >
  </div>
  {#snippet legend()}<ColorLegend
      label="pression"
      symbol="p"
      unit="u. a."
      min="−2"
      mid="0"
      max="+2"
    />{/snippet}
  {#snippet controls()}
    <SymbolSlider scene="2-oblique" param="theta" />
    <SymbolSlider scene="2-oblique" param="cr" />
    <SymbolSlider scene="2-oblique" param="rr" />
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
  .iface {
    stroke: var(--color-ink);
    stroke-width: 2;
  }
  .normal {
    stroke: var(--color-ink-muted);
    stroke-width: 1;
    stroke-dasharray: 4 4;
  }
  .ray {
    stroke: var(--color-ink);
    stroke-width: 2;
  }
  .head {
    fill: var(--color-ink);
  }
  .tag {
    position: absolute;
    right: var(--space-3);
    top: var(--space-3);
    margin: 0;
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg);
    font-family: var(--font-sans);
    font-size: var(--text-small);
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
