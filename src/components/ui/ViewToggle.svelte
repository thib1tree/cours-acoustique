<script lang="ts">
  /** Segmented control bound to a scene view (radio-group semantics). */
  import { useScene } from '../../lib/scene/scene.svelte';
  let { scene: sceneId, view }: { scene: string; view: string } = $props();
  const scene = useScene(sceneId);
  const spec = scene.spec.views!.find((v) => v.key === view)!;
  let group: HTMLDivElement;

  function onKey(e: KeyboardEvent) {
    const i = spec.options.findIndex((o) => o.key === scene.views[view]);
    const d =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (!d) return;
    e.preventDefault();
    const next = spec.options[(i + d + spec.options.length) % spec.options.length]!;
    scene.views[view] = next.key;
    group.querySelector<HTMLButtonElement>(`[data-k="${next.key}"]`)?.focus();
  }
</script>

<div class="toggle-wrap">
  <span class="lbl" id="v-{sceneId}-{view}">{spec.label}</span>
  <div
    class="seg"
    role="radiogroup"
    aria-labelledby="v-{sceneId}-{view}"
    bind:this={group}
    tabindex="-1"
    onkeydown={onKey}
  >
    {#each spec.options as o (o.key)}
      <button
        type="button"
        role="radio"
        data-k={o.key}
        aria-checked={scene.views[view] === o.key}
        tabindex={scene.views[view] === o.key ? 0 : -1}
        onclick={() => (scene.views[view] = o.key)}>{o.label}</button
      >
    {/each}
  </div>
</div>

<style>
  .toggle-wrap {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    font-family: var(--font-sans);
    font-size: var(--text-small);
    flex-wrap: wrap;
  }
  .lbl {
    color: var(--color-ink-muted);
  }
  .seg {
    display: inline-flex;
    border: 1px solid var(--color-ink);
    border-radius: var(--radius);
    outline: none;
  }
  button {
    min-height: var(--touch);
    padding: 0 var(--space-3);
    border: 0;
    background: none;
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease);
  }
  button[aria-checked='true'] {
    background: var(--color-ink);
    color: var(--color-bg);
  }
</style>
