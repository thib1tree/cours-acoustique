<script lang="ts">
  /** Switches that remove a term from the simulation; hovering one highlights it. */
  import { useScene } from '../../lib/scene/scene.svelte';
  let { scene: sceneId, terms }: { scene: string; terms?: string[] } = $props();
  const scene = useScene(sceneId);
  const list = (scene.spec.terms ?? []).filter(
    (t) => t.toggleable && (!terms || terms.includes(t.key)),
  );
</script>

<div class="toggles" role="group" aria-label="Termes de l'équation">
  {#each list as t (t.key)}
    <button
      type="button"
      role="switch"
      aria-checked={scene.terms[t.key]}
      onclick={() => (scene.terms[t.key] = !scene.terms[t.key])}
      onpointerenter={() => (scene.hovered = t.key)}
      onpointerleave={() => (scene.hovered = null)}
      onfocus={() => (scene.hovered = t.key)}
      onblur={() => (scene.hovered = null)}
    >
      <span class="sw" aria-hidden="true"></span>{t.label}
    </button>
  {/each}
</div>

<style>
  .toggles {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    justify-content: center;
    font-family: var(--font-sans);
    font-size: var(--text-small);
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--touch);
    padding: 0 var(--space-3);
    border: 1px solid var(--color-rule);
    border-radius: var(--radius);
    background: none;
    cursor: pointer;
  }
  .sw {
    position: relative;
    width: 28px;
    height: 16px;
    border-radius: 8px;
    background: var(--color-rule);
    transition: background var(--dur-fast) var(--ease);
  }
  .sw::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--color-bg);
    transition: transform var(--dur-fast) var(--ease);
  }
  [aria-checked='true'] .sw {
    background: var(--color-ink);
  }
  [aria-checked='true'] .sw::after {
    transform: translateX(12px);
  }
  [aria-checked='false'] {
    color: var(--color-ink-muted);
    text-decoration: line-through;
  }
</style>
