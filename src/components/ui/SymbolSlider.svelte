<script lang="ts">
  /**
   * Slider bound to a scene parameter and to its symbol in the equations.
   * Keyboard: arrows = fine step, Shift + arrows = large step, Home/End = bounds.
   * The value can also be typed in the field on the right.
   */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { clampParam, formatParam, fromUnit, parseNumber, toUnit } from '../../lib/scene/format';
  import Tex from './Tex.svelte';

  let { scene: sceneId, param }: { scene: string; param: string } = $props();
  const scene = useScene(sceneId);
  const spec = scene.spec.params.find((p) => p.key === param)!;
  const RES = 1000;

  const value = $derived(scene.params[param] ?? spec.default);
  const pos = $derived(Math.round(toUnit(spec, value) * RES));
  let editing = $state(false);
  let draft = $state('');

  const quantityVar = spec.quantity
    ? {
        pressure: 'var(--color-pressure-pos)',
        velocity: 'var(--color-velocity)',
        energy: 'var(--color-energy)',
      }[spec.quantity]
    : 'var(--color-ink)';

  function set(v: number) {
    scene.params[param] = clampParam(spec, v);
  }

  function onInput(e: Event) {
    set(fromUnit(spec, Number((e.target as HTMLInputElement).value) / RES));
  }

  function onKey(e: KeyboardEvent) {
    const big = spec.bigStep ?? spec.step * 10;
    const factor = spec.scale === 'log';
    let next: number | null = null;
    const up = e.key === 'ArrowUp' || e.key === 'ArrowRight';
    const down = e.key === 'ArrowDown' || e.key === 'ArrowLeft';
    if (up || down) {
      const dir = up ? 1 : -1;
      if (factor) next = value * (e.shiftKey ? 2 : 1.05) ** dir;
      else next = value + dir * (e.shiftKey ? big : spec.step);
    } else if (e.key === 'Home') next = spec.min;
    else if (e.key === 'End') next = spec.max;
    if (next !== null) {
      e.preventDefault();
      set(next);
    }
  }

  function commit() {
    const n = parseNumber(draft);
    if (Number.isFinite(n)) set(n);
    editing = false;
  }
</script>

<div class="slider" style:--q={quantityVar}>
  <label class="sym" for="s-{sceneId}-{param}" title={spec.label}><Tex tex={spec.symbol} /></label>
  <input
    id="s-{sceneId}-{param}"
    type="range"
    min="0"
    max={RES}
    step="1"
    value={pos}
    style:--fill="{pos / 10}%"
    aria-label={spec.label}
    aria-valuetext="{formatParam(spec, value)} {spec.unit}"
    oninput={onInput}
    onkeydown={onKey}
    onpointerdown={() => (scene.dragging = true)}
    onpointerup={() => (scene.dragging = false)}
    onpointercancel={() => (scene.dragging = false)}
  />
  <input
    class="val num"
    type="text"
    inputmode="decimal"
    aria-label="{spec.label}, valeur en {spec.unit || 'unités'}"
    value={editing ? draft : formatParam(spec, value)}
    onfocus={(e) => {
      editing = true;
      draft = formatParam(spec, value);
      (e.target as HTMLInputElement).select();
    }}
    oninput={(e) => (draft = (e.target as HTMLInputElement).value)}
    onblur={commit}
    onkeydown={(e) => {
      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      if (e.key === 'Escape') {
        editing = false;
        (e.target as HTMLInputElement).blur();
      }
    }}
  />
  <span class="unit">{spec.unit}</span>
</div>

<style>
  .slider {
    display: grid;
    grid-template-columns: 2.6rem minmax(0, 1fr) 5rem 2.6rem;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--touch);
    font-family: var(--font-sans);
    font-size: var(--text-small);
  }
  .sym {
    font-size: 1.15rem;
    white-space: nowrap;
  }
  input[type='range'] {
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    height: var(--touch);
    background: transparent;
    cursor: pointer;
    margin: 0;
    touch-action: pan-y;
  }
  input[type='range']::-webkit-slider-runnable-track {
    height: 2px;
    background: linear-gradient(to right, var(--q) var(--fill), var(--color-rule) var(--fill));
  }
  input[type='range']::-moz-range-track {
    height: 2px;
    background: var(--color-rule);
  }
  input[type='range']::-moz-range-progress {
    height: 2px;
    background: var(--q);
  }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 22px;
    height: 22px;
    margin-top: -10px;
    border-radius: 50%;
    background: var(--color-bg);
    border: 2px solid var(--q);
  }
  input[type='range']::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--color-bg);
    border: 2px solid var(--q);
  }
  input[type='range']:focus-visible {
    outline: none;
  }
  input[type='range']:focus-visible::-webkit-slider-thumb {
    outline: 2px solid var(--color-ink);
    outline-offset: 2px;
  }
  input[type='range']:focus-visible::-moz-range-thumb {
    outline: 2px solid var(--color-ink);
    outline-offset: 2px;
  }
  .val {
    width: 100%;
    height: 36px;
    border: 1px solid var(--color-rule);
    border-radius: var(--radius);
    background: var(--color-bg);
    text-align: right;
    padding: 0 6px;
    font-size: 0.95rem;
  }
  .val:focus {
    border-color: var(--color-ink);
    outline: none;
  }
  .unit {
    color: var(--color-ink-muted);
  }
</style>
