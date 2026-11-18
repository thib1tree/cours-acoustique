<script lang="ts">
  /** Lab figure: polar directivity of the baffled circular piston 2J₁(ka sinθ)/(ka sinθ). */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { pistonDirectivity } from '../../lib/physics/special';
  import VizFrame from './VizFrame.svelte';
  import PolarDiagram from './PolarDiagram.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('lab-polar');
  const ka = $derived(scene.params.ka!);
</script>

<VizFrame
  scene="lab-polar"
  {...number ? { number } : {}}
  {title}
  animated={false}
  note="champ lointain, demi-espace devant le baffle"
>
  <PolarDiagram half pattern={(th) => pistonDirectivity(ka, th)} version={ka} ariaLabel={alt} />
  {#snippet controls()}<SymbolSlider scene="lab-polar" param="ka" />{/snippet}
</VizFrame>
