<script lang="ts">
  /**
   * Generic interactive plot (SVG): linear or log axes, curves, points, labels.
   * Used inside specific visualizations (its props carry functions, so it is never an
   * island by itself).
   */
  import { onMount } from 'svelte';
  import { type AxisSpec, scale, ticks } from '../../lib/viz/axes';

  export interface Series {
    points: readonly (readonly [number, number])[];
    color: string;
    width?: number;
    dash?: string;
    label?: string;
    /** Fill the area under the curve with this color (low opacity). */
    fill?: string;
    /** Draw each point as a vertical stem from the bottom of the axis (impulse responses, spectra). */
    stems?: boolean;
    /** Where to write the label: next to the last point (default) or the first one. */
    labelAt?: 'start' | 'end';
  }
  export interface Marker {
    x: number;
    y: number;
    color: string;
    r?: number;
    label?: string;
    labelSide?: 'right' | 'left' | 'above';
    hollow?: boolean;
  }

  let {
    x,
    y,
    series = [],
    markers = [],
    height = 300,
    vlines = [],
    onpoint,
    ariaLabel,
  }: {
    x: AxisSpec;
    y: AxisSpec;
    series?: Series[];
    markers?: Marker[];
    height?: number;
    vlines?: { x: number; color: string; label?: string; dash?: string }[];
    onpoint?: (x: number, y: number) => void;
    ariaLabel: string;
  } = $props();

  let width = $state(600);
  let el: HTMLDivElement;
  const m = { l: 56, r: 16, t: 14, b: 40 };
  const sx = $derived(scale(x, m.l, width - m.r));
  const sy = $derived(scale(y, height - m.b, m.t));
  const inv = (a: AxisSpec, r0: number, r1: number, p: number) => {
    const u = (p - r0) / (r1 - r0);
    return a.log
      ? 10 ** (Math.log10(a.min) + u * (Math.log10(a.max) - Math.log10(a.min)))
      : a.min + u * (a.max - a.min);
  };
  const path = (pts: readonly (readonly [number, number])[]) =>
    pts.map(([a, b], i) => `${i ? 'L' : 'M'}${sx(a).toFixed(1)},${sy(b).toFixed(1)}`).join('');

  let dragging = false;
  function pick(e: PointerEvent) {
    if (!onpoint) return;
    const r = el.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    onpoint(inv(x, m.l, width - m.r, px), inv(y, height - m.b, m.t, py));
  }

  onMount(() => {
    const ro = new ResizeObserver(([e]) => (width = Math.max(240, e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  });
</script>

<div class="plot" bind:this={el} style:height="{height}px">
  <svg
    {width}
    {height}
    role="img"
    aria-label={ariaLabel}
    class:interactive={!!onpoint}
    onpointerdown={(e) => {
      dragging = true;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      pick(e);
    }}
    onpointermove={(e) => dragging && pick(e)}
    onpointerup={() => (dragging = false)}
  >
    <defs
      ><clipPath id="clip-{ariaLabel.length}"
        ><rect x={m.l} y={m.t} width={width - m.l - m.r} height={height - m.t - m.b} /></clipPath
      ></defs
    >
    {#each ticks(x, Math.max(3, Math.floor(width / 110))) as tk (tk.value)}
      <line x1={sx(tk.value)} x2={sx(tk.value)} y1={m.t} y2={height - m.b} class="grid" />
      {#if tk.label}<text
          x={sx(tk.value)}
          y={height - m.b + 18}
          class="tick num"
          text-anchor="middle">{tk.label}</text
        >{/if}
    {/each}
    {#each ticks(y, Math.max(3, Math.floor(height / 60))) as tk (tk.value)}
      <line x1={m.l} x2={width - m.r} y1={sy(tk.value)} y2={sy(tk.value)} class="grid" />
      {#if tk.label}<text x={m.l - 8} y={sy(tk.value) + 4} class="tick num" text-anchor="end"
          >{tk.label}</text
        >{/if}
    {/each}
    <line x1={m.l} x2={width - m.r} y1={height - m.b} y2={height - m.b} class="axis" />
    <line x1={m.l} x2={m.l} y1={m.t} y2={height - m.b} class="axis" />
    {#if x.label}<text x={width - m.r} y={height - 6} class="lbl" text-anchor="end">{x.label}</text
      >{/if}
    {#if y.label}<text x={m.l + 6} y={m.t + 12} class="lbl">{y.label}</text>{/if}
    <g clip-path="url(#clip-{ariaLabel.length})">
      {#each vlines as v (v.x)}
        <line
          x1={sx(v.x)}
          x2={sx(v.x)}
          y1={m.t}
          y2={height - m.b}
          stroke={v.color}
          stroke-dasharray={v.dash ?? '4 4'}
        />
        {#if v.label}<text x={sx(v.x) + 6} y={m.t + 14} class="lbl" fill={v.color}>{v.label}</text
          >{/if}
      {/each}
      {#each series as s, i (i)}
        {#if s.fill}<path
            d="{path(s.points)}L{sx(s.points.at(-1)![0])},{sy(
              y.log ? y.min : Math.max(y.min, 0),
            )}L{sx(s.points[0]![0])},{sy(y.log ? y.min : Math.max(y.min, 0))}Z"
            fill={s.fill}
            opacity="0.14"
          />{/if}
        <path
          d={s.stems
            ? s.points
                .map(
                  ([a, b]) =>
                    `M${sx(a).toFixed(1)},${(height - m.b).toFixed(1)}V${sy(b).toFixed(1)}`,
                )
                .join('')
            : path(s.points)}
          fill="none"
          stroke={s.color}
          stroke-width={s.width ?? 2}
          stroke-dasharray={s.dash ?? ''}
          stroke-linejoin="round"
        />
      {/each}
    </g>
    {#each series as s, i (i)}
      {#if s.label && s.points.length}
        {@const pt = s.labelAt === 'start' ? s.points[0]! : s.points.at(-1)!}
        <text
          x={s.labelAt === 'start'
            ? Math.max(sx(pt[0]), m.l) + 4
            : Math.min(sx(pt[0]), width - m.r) - 4}
          y={Math.max(m.t + 10, Math.min(height - m.b - 4, sy(pt[1]) - 6))}
          class="lbl"
          text-anchor={s.labelAt === 'start' ? 'start' : 'end'}
          fill={s.color}>{s.label}</text
        >
      {/if}
    {/each}
    {#each markers as mk, i (i)}
      <circle
        cx={sx(mk.x)}
        cy={sy(mk.y)}
        r={mk.r ?? 5}
        fill={mk.hollow ? 'var(--color-bg)' : mk.color}
        stroke={mk.color}
        stroke-width="2"
      />
      {#if mk.label}
        <text
          x={sx(mk.x) + (mk.labelSide === 'left' ? -10 : mk.labelSide === 'above' ? 0 : 10)}
          y={sy(mk.y) + (mk.labelSide === 'above' ? -10 : 4)}
          text-anchor={mk.labelSide === 'left'
            ? 'end'
            : mk.labelSide === 'above'
              ? 'middle'
              : 'start'}
          class="mk">{mk.label}</text
        >
      {/if}
    {/each}
  </svg>
</div>

<style>
  .plot {
    position: relative;
    width: 100%;
    font-family: var(--font-sans);
  }
  svg {
    display: block;
    overflow: visible;
  }
  svg.interactive {
    cursor: crosshair;
    touch-action: none;
  }
  .grid {
    stroke: var(--color-rule);
    stroke-width: 1;
    opacity: 0.6;
  }
  .axis {
    stroke: var(--color-ink-muted);
  }
  .tick {
    fill: var(--color-ink-muted);
    font-size: 12px;
    font-family: var(--font-num);
  }
  .lbl {
    font-size: 12px;
    fill: var(--color-ink-muted);
  }
  .mk {
    font-size: 13px;
    font-family: var(--font-num);
    fill: var(--color-ink);
    paint-order: stroke;
    stroke: var(--color-bg);
    stroke-width: 4px;
  }
</style>
