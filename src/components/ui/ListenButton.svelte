<script lang="ts">
  /** Start/stop button for a sound tied to a scene. Audio starts only on this gesture. */
  import { onDestroy } from 'svelte';
  import { ICONS } from '../../lib/icons';
  import { t } from '../../i18n';

  let {
    label = t('audio.listen'),
    onstart,
    onstop,
    headphones = false,
  }: {
    label?: string;
    onstart: () => Promise<void>;
    onstop: () => void;
    headphones?: boolean;
  } = $props();
  let on = $state(false);
  let busy = $state(false);
  const ios = typeof navigator !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent);

  async function toggle() {
    if (busy) return;
    if (on) {
      onstop();
      on = false;
      return;
    }
    busy = true;
    try {
      await onstart();
      on = true;
    } finally {
      busy = false;
    }
  }
  onDestroy(() => on && onstop());
</script>

<div class="listen">
  <button type="button" class="listen-btn" aria-pressed={on} onclick={toggle}>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- static icon -->
    {@html on ? ICONS.mute : ICONS.sound}
    {on ? t('audio.stop') : label}
  </button>
  <span class="hint">
    {#if headphones}{t('audio.headphones')}.
    {/if}Volume bas par défaut, limiteur actif.{#if ios}
      {t('audio.ios-mute')}{/if}
  </span>
</div>

<style>
  .listen {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
    font-family: var(--font-sans);
    font-size: var(--text-small);
  }
  .listen-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--touch);
    padding: 0 var(--space-4);
    border: 1px solid var(--color-ink);
    border-radius: var(--radius);
    background: none;
    color: var(--color-ink);
    cursor: pointer;
    font-weight: 650;
  }
  .listen-btn[aria-pressed='true'] {
    background: var(--color-ink);
    color: var(--color-bg);
  }
  .hint {
    color: var(--color-ink-muted);
  }
</style>
