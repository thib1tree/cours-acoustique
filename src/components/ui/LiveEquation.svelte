<script lang="ts">
  /**
   * Equation whose terms are linked to a scene: hovering or touching a term highlights
   * the matching element of the visualization (and vice versa), switched-off terms are
   * dimmed, and \val{key} shows live parameter values.
   */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { expandLiveTex, renderTex, texNumber } from '../../lib/viz/tex';
  import TermToggles from './TermToggles.svelte';

  let {
    scene: sceneId,
    tex,
    toggles = false,
    number,
    label,
  }: {
    scene: string;
    tex: string;
    toggles?: boolean | string[];
    number?: string;
    label?: string;
  } = $props();
  const scene = useScene(sceneId);

  const html = $derived.by(() => {
    const vals: Record<string, string> = {};
    for (const p of scene.spec.params) vals[p.key] = texNumber(scene.params[p.key]!, p.digits ?? 0);
    for (const d of scene.spec.derived ?? [])
      vals[d.key] = texNumber(d.fn(scene.params, scene.terms), d.digits ?? 0);
    const off: Record<string, boolean> = {};
    for (const [k, on] of Object.entries(scene.terms)) off[k] = !on;
    return renderTex(expandLiveTex(tex, { values: vals, hovered: scene.hovered, off }), true);
  });

  function termAt(e: Event): string | null {
    const el = (e.target as Element).closest('[data-term]');
    return el ? el.getAttribute('data-term') : null;
  }
</script>

<figure class="eq" aria-label={label}>
  <div class="row">
    <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
    <div
      class="display"
      onpointerover={(e) => (scene.hovered = termAt(e))}
      onpointerleave={() => (scene.hovered = null)}
      onclick={(e) => {
        const t = termAt(e);
        scene.hovered = scene.hovered === t ? null : t;
      }}
    >
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- KaTeX output from author-controlled TeX -->
      {@html html}
    </div>
    {#if number}<span class="no num">({number})</span>{/if}
  </div>
  {#if toggles}
    <TermToggles scene={sceneId} terms={Array.isArray(toggles) ? toggles : undefined} />
  {/if}
</figure>

<style>
  .eq {
    margin: var(--space-6) 0;
    padding: var(--space-4) 0;
    border-top: 1px solid var(--color-rule);
    border-bottom: 1px solid var(--color-rule);
    display: grid;
    gap: var(--space-3);
  }
  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: var(--space-3);
  }
  .display {
    font-size: 1.3rem;
    overflow-x: auto;
    overflow-y: hidden;
    min-width: 0;
  }
  .display :global(.katex-display) {
    margin: 0;
  }
  .display :global(.term) {
    cursor: pointer;
    border-radius: 2px;
    transition:
      background var(--dur-fast) var(--ease),
      opacity var(--dur-fast) var(--ease);
  }
  .display :global(.term-on) {
    background: color-mix(in oklab, var(--color-ink) 12%, transparent);
    box-shadow: 0 2px 0 var(--color-ink);
  }
  .display :global(.term-off) {
    opacity: 0.3;
    text-decoration: line-through;
  }
  .no {
    color: var(--color-ink-muted);
    font-size: var(--text-small);
  }
  @media (max-width: 760px) {
    .display {
      font-size: 1.1rem;
    }
  }
</style>
