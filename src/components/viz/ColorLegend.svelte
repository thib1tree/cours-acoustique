<script lang="ts">
  /** Colormap legend with name, unit and end values. Always shown with a colored field. */
  import Tex from '../ui/Tex.svelte';
  let {
    kind = 'pressure',
    label,
    symbol,
    unit,
    min,
    max,
    mid,
  }: {
    kind?: 'pressure' | 'energy';
    label: string;
    symbol?: string;
    unit: string;
    min: string;
    max: string;
    mid?: string;
  } = $props();
</script>

<div class="legend" role="img" aria-label="{label} : de {min} à {max} {unit}">
  <div class="name">
    <span
      >{label}
      {#if symbol}<Tex tex={symbol} />{/if}</span
    ><span>{unit}</span>
  </div>
  <div
    class="ramp"
    style:background={kind === 'pressure' ? 'var(--gradient-pressure)' : 'var(--gradient-energy)'}
  ></div>
  <div class="ticks num">
    <span>{min}</span>{#if mid !== undefined}<span>{mid}</span>{/if}<span>{max}</span>
  </div>
</div>

<style>
  .legend {
    display: grid;
    gap: 3px;
    min-width: 200px;
    font-family: var(--font-sans);
    font-size: 0.8125rem;
  }
  .name,
  .ticks {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
  }
  .ticks {
    color: var(--color-ink-muted);
  }
  .ramp {
    height: 10px;
  }
</style>
