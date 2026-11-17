<script lang="ts">
  import { renderTex } from '../../lib/viz/tex';
  let { tex, display = false }: { tex: string; display?: boolean } = $props();
  const html = $derived(renderTex(tex, display));
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- KaTeX output from author-controlled TeX -->
<span class="tex">{@html html}</span>
