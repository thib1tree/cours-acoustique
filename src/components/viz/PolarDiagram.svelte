<script lang="ts">
  /**
   * Generic polar directivity diagram in dB (building block, not an island).
   * `pattern(θ)` returns the far-field amplitude normalized to its maximum, θ measured from
   * the axis (pointing up). `half` draws only the front half-space, behind a baffle.
   */
  let {
    pattern,
    half = false,
    dbRange = 40,
    version,
    ariaLabel,
    color = 'var(--color-ink)',
  }: {
    pattern: (theta: number) => number;
    half?: boolean;
    dbRange?: number;
    version: unknown;
    ariaLabel: string;
    color?: string;
  } = $props();

  const R = 140;
  const rOf = (db: number) => ((Math.max(-dbRange, db) + dbRange) / dbRange) * R;
  const rings = $derived(Array.from({ length: Math.floor(dbRange / 10) }, (_, i) => -10 * i));
  const spokes = $derived(
    half ? [-60, -30, 0, 30, 60] : [0, 30, 60, 90, 120, 150, 180, -150, -120, -90, -60, -30],
  );
  const path = $derived.by(() => {
    void version;
    const n = half ? 360 : 720;
    const pts: string[] = [];
    for (let i = 0; i <= n; i++) {
      const th = half ? -Math.PI / 2 + (Math.PI * i) / n : (2 * Math.PI * i) / n;
      const d = Math.abs(pattern(th));
      const r = rOf(20 * Math.log10(Math.max(d, 1e-6)));
      pts.push(
        `${i ? 'L' : 'M'}${(r * Math.sin(th)).toFixed(2)},${(-r * Math.cos(th)).toFixed(2)}`,
      );
    }
    return pts.join('') + (half ? '' : 'Z');
  });
  const box = $derived(half ? '-170 -165 340 185' : '-170 -170 340 340');
</script>

<svg viewBox={box} class="polar" class:full={!half} role="img" aria-label={ariaLabel}>
  {#each rings as db (db)}
    {#if half}
      <path d="M{-rOf(db)},0 A{rOf(db)},{rOf(db)} 0 0 1 {rOf(db)},0" class="ring" />
    {:else}
      <circle r={rOf(db)} class="ring" />
    {/if}
    <text x="4" y={-rOf(db) - 3} class="lbl num">{db < 0 ? `−${-db}` : db} dB</text>
  {/each}
  {#each spokes as a (a)}
    <line
      x1="0"
      y1="0"
      x2={R * Math.sin((a * Math.PI) / 180)}
      y2={-R * Math.cos((a * Math.PI) / 180)}
      class="ring"
    />
    <text
      x={(R + 14) * Math.sin((a * Math.PI) / 180)}
      y={-(R + 14) * Math.cos((a * Math.PI) / 180) + 3}
      class="lbl num"
      text-anchor="middle">{a < 0 ? `−${-a}` : a}°</text
    >
  {/each}
  {#if half}<line x1={-R - 10} y1="0" x2={R + 10} y2="0" class="baffle" />{/if}
  <path d={path} class="curve" style:stroke={color} />
</svg>

<style>
  .polar {
    display: block;
    width: 100%;
    max-width: 520px;
    margin: var(--space-3) auto;
  }
  .polar.full {
    max-width: 380px;
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
    stroke-width: 2;
  }
  .lbl {
    font-size: 9px;
    fill: var(--color-ink-muted);
  }
</style>
