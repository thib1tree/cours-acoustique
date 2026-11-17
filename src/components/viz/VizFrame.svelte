<script lang="ts">
  /**
   * Frame shared by every visualization: figure number and title, a stage (children),
   * transport controls (play/pause, slow motion, reset, enlarge, share), a legend and
   * optional controls. The enlarged mode is an in-page overlay that also works in
   * landscape on phones.
   */
  import type { Snippet } from 'svelte';
  import { useScene } from '../../lib/scene/scene.svelte';
  import { ICONS } from '../../lib/icons';
  import { t } from '../../i18n';

  let {
    scene: sceneId,
    number,
    title,
    note,
    animated = true,
    children,
    legend,
    controls,
  }: {
    scene: string;
    number?: string;
    title: string;
    note?: string;
    animated?: boolean;
    children: Snippet;
    legend?: Snippet;
    controls?: Snippet;
  } = $props();
  const scene = useScene(sceneId);
  let expanded = $state(false);
  let copied = $state(false);
  let root: HTMLElement;
  let closeBtn: HTMLButtonElement | undefined = $state();

  async function share() {
    const url = scene.shareUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      history.replaceState(null, '', url);
    }
    copied = true;
    setTimeout(() => (copied = false), 1600);
  }

  function toggleExpand() {
    expanded = !expanded;
    document.documentElement.classList.toggle('viz-expanded', expanded);
    if (expanded) queueMicrotask(() => closeBtn?.focus());
    // Let canvases resize to their new box.
    queueMicrotask(() => window.dispatchEvent(new Event('resize')));
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if (expanded && e.key === 'Escape') toggleExpand();
  }}
/>

<figure class="viz" class:expanded bind:this={root} aria-label={title}>
  <figcaption class="head">
    <span class="title"
      >{#if number}<span class="num fig">Figure {number}</span>{/if}{title}</span
    >
    {#if note}<span class="note">{note}</span>{/if}
  </figcaption>
  <div class="stage">
    {@render children()}
  </div>
  <div class="foot">
    <div class="transport" role="toolbar" aria-label="Contrôles de la visualisation">
      {#if animated}
        <button
          type="button"
          class="icon-btn"
          aria-label={scene.playing ? t('viz.pause') : t('viz.play')}
          aria-pressed={!scene.playing}
          onclick={() => (scene.playing = !scene.playing)}
        >
          <!-- eslint-disable-next-line svelte/no-at-html-tags -- static icon -->
          {@html scene.playing ? ICONS.pause : ICONS.play}
        </button>
        <button
          type="button"
          class="icon-btn"
          aria-label={t('viz.slow')}
          aria-pressed={scene.slow}
          onclick={() => (scene.slow = !scene.slow)}
        >
          <!-- eslint-disable-next-line svelte/no-at-html-tags -- static icon -->
          {@html ICONS.slow}
        </button>
      {/if}
      <button
        type="button"
        class="icon-btn"
        aria-label={t('viz.reset')}
        onclick={() => scene.reset()}
      >
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- static icon -->
        {@html ICONS.reset}
      </button>
      <button
        type="button"
        class="icon-btn"
        aria-label={expanded ? t('viz.collapse') : t('viz.expand')}
        aria-pressed={expanded}
        onclick={toggleExpand}
        bind:this={closeBtn}
      >
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- static icon -->
        {@html expanded ? ICONS.collapse : ICONS.expand}
      </button>
      <button type="button" class="icon-btn" aria-label={t('viz.share')} onclick={share}>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- static icon -->
        {@html ICONS.share}
      </button>
      <span class="status" role="status">{copied ? t('viz.shared') : ''}</span>
    </div>
    {#if legend}<div class="legend">{@render legend()}</div>{/if}
  </div>
  {#if controls}<div class="controls">{@render controls()}</div>{/if}
</figure>

<style>
  .viz {
    margin: var(--space-7) 0;
    font-family: var(--font-sans);
    font-size: var(--text-small);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-4);
    margin-bottom: var(--space-2);
  }
  .title {
    font-weight: 700;
    font-size: var(--text-ui);
  }
  .fig {
    font-weight: 400;
    color: var(--color-ink-muted);
    margin-right: 10px;
  }
  .note {
    color: var(--color-ink-muted);
    text-align: right;
  }
  .stage {
    position: relative;
    border-top: 1px solid var(--color-ink);
    border-bottom: 1px solid var(--color-rule);
  }
  .foot {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3) var(--space-5);
    padding-top: var(--space-2);
  }
  .transport {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .status {
    margin-left: var(--space-2);
    color: var(--color-ink-muted);
  }
  .icon-btn {
    width: var(--touch);
    height: var(--touch);
    display: inline-grid;
    place-items: center;
    border: 0;
    background: none;
    border-radius: var(--radius);
    cursor: pointer;
  }
  .icon-btn:hover,
  .icon-btn[aria-pressed='true'] {
    background: var(--color-surface);
  }
  .controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
    gap: var(--space-2) var(--space-6);
    align-items: center;
    padding-top: var(--space-3);
  }
  .expanded {
    position: fixed;
    inset: 0;
    z-index: 50;
    margin: 0;
    padding: var(--space-4) var(--space-5);
    background: var(--color-bg);
    overflow: auto;
    display: flex;
    flex-direction: column;
  }
  .expanded .stage {
    flex: 1 1 auto;
    min-height: 50vh;
  }
  :global(html.viz-expanded) {
    overflow: hidden;
  }
  @media (max-width: 760px) {
    .head {
      flex-direction: column;
      gap: 2px;
    }
    .note {
      text-align: left;
    }
    .expanded {
      padding: var(--space-2) var(--gutter);
    }
  }
</style>
