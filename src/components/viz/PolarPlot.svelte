<script lang="ts">
  /** Polar directivity diagram (dB), here for the baffled circular piston 2J₁(ka sinθ)/(ka sinθ). */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { pistonDirectivity } from '../../lib/physics/special';
  import VizFrame from './VizFrame.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('lab-polar');
  const DB = 40;
  const R = 140;
  const rOf = (db: number) => ((Math.max(-DB, db) + DB) / DB) * R;
  const path = $derived.by(() => {
    const ka = scene.params.ka!;
    const pts: string[] = [];
    for (let i = 0; i <= 360; i++) {
      const th = -Math.PI / 2 + (Math.PI * i) / 360;
      const d = Math.abs(pistonDirectivity(ka, th));
      const r = rOf(20 * Math.log10(Math.max(d, 1e-6)));
      pts.push(
        `${i ? 'L' : 'M'}${(r * Math.sin(th)).toFixed(2)},${(-r * Math.cos(th)).toFixed(2)}`,
      );
    }
    return pts.join('');
  });
</script>

<VizFrame
  scene="lab-polar"
  {...number ? { number } : {}}
  {title}
  animated={false}
  note="champ lointain, demi-espace devant le baffle"
>
  <svg viewBox="-170 -165 340 185" class="polar" role="img" aria-label={alt}>
    {#each [0, -10, -20, -30] as db (db)}
      <path d="M{-rOf(db)},0 A{rOf(db)},{rOf(db)} 0 0 1 {rOf(db)},0" class="ring" />
      <text x="4" y={-rOf(db) - 3} class="lbl">{db} dB</text>
    {/each}
    {#each [-60, -30, 0, 30, 60] as a (a)}
      <line
        x1="0"
        y1="0"
        x2={R * Math.sin((a * Math.PI) / 180)}
        y2={-R * Math.cos((a * Math.PI) / 180)}
        class="ring"
      />
      <text
        x={(R + 14) * Math.sin((a * Math.PI) / 180)}
        y={-(R + 14) * Math.cos((a * Math.PI) / 180)}
        class="lbl"
        text-anchor="middle">{a}°</text
      >
    {/each}
    <line x1={-R - 10} y1="0" x2={R + 10} y2="0" class="baffle" />
    <path d={path} class="curve" />
  </svg>
  {#snippet controls()}<SymbolSlider scene="lab-polar" param="ka" />{/snippet}
</VizFrame>

<style>
  .polar {
    display: block;
    width: 100%;
    max-width: 640px;
    margin: var(--space-3) auto;
  }
  .ring {
    fill: none;
    stroke: var(--color-rule);
  }
  .baffle {
    stroke: var(--color-ink);
    stroke-width: 3;
  }
  .curve {
    fill: none;
    stroke: var(--color-ink);
    stroke-width: 2;
  }
  .lbl {
    font-family: var(--font-sans);
    font-size: 9px;
    fill: var(--color-ink-muted);
  }
</style>
