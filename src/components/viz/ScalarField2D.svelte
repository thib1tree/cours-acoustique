<script lang="ts">
  /**
   * Generic animated 2D scalar field (WebGL2), phasor mode: the complex field P(x, y)
   * is computed once on the CPU each time a parameter changes, then the GPU animates
   * Re{P e^{−iωt}}. Lab demo: monopole and dipole of point sources, P = Σ ±e^{ikr}/r.
   */
  import { onMount } from 'svelte';
  import { useScene } from '../../lib/scene/scene.svelte';
  import { createFieldRenderer, type FieldRenderer } from '../../lib/gl/field-renderer';
  import { createLoop, currentTheme, onThemeChange } from '../../lib/viz/loop';
  import { lut } from '../../lib/viz/luts';
  import VizFrame from './VizFrame.svelte';
  import ColorLegend from './ColorLegend.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('lab-field');
  let canvas: HTMLCanvasElement;
  let renderer: FieldRenderer | null = null;
  let gl: WebGL2RenderingContext | null = null;
  let phase = 0;
  let unsupported = $state(false);
  const NX = 320;
  const NY = 200;

  function compute() {
    if (!renderer) return;
    const kd = scene.params.kd!;
    const dipole = scene.views.source === 'dipole';
    const k = (2 * Math.PI) / 40; // 40 cells per wavelength
    const d = kd / k / 2;
    const sources = dipole
      ? [
          [NX / 2 - d, NY / 2, 1],
          [NX / 2 + d, NY / 2, -1],
        ]
      : [[NX / 2, NY / 2, 1]];
    const data = new Float32Array(NX * NY * 2);
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        let re = 0;
        let im = 0;
        for (const [sx, sy, a] of sources) {
          const r = Math.max(2, Math.hypot(i - sx!, j - sy!));
          re += (a! * Math.cos(k * r)) / (r / 20);
          im += (a! * Math.sin(k * r)) / (r / 20);
        }
        data[2 * (j * NX + i)] = re;
        data[2 * (j * NX + i) + 1] = im;
      }
    renderer.setPhasor(NX, NY, data);
  }

  function draw() {
    if (!renderer || !gl) return;
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    renderer.draw({
      source: 'phasor',
      phase,
      scale: 1.2,
      width: canvas.width,
      height: canvas.height,
    });
  }

  onMount(() => {
    gl = canvas.getContext('webgl2');
    if (!gl) {
      unsupported = true;
      return;
    }
    renderer = createFieldRenderer(gl);
    renderer.setLut(lut('pressure', currentTheme()));
    compute();
    const loop = createLoop(
      canvas,
      (dt) => {
        phase = (phase + dt * 2 * Math.PI * 0.6 * (scene.slow ? 0.25 : 1)) % (2 * Math.PI);
        draw();
      },
      () => scene.playing,
    );
    const off = onThemeChange(() => {
      renderer?.setLut(lut('pressure', currentTheme()));
      draw();
    });
    return () => {
      loop.destroy();
      off();
      renderer?.dispose();
    };
  });
  $effect(() => {
    void [scene.params.kd, scene.views.source];
    compute();
    draw();
  });
</script>

<VizFrame scene="lab-field" {...number ? { number } : {}} {title}>
  <canvas bind:this={canvas} class="field" role="img" aria-label={alt}></canvas>
  {#if unsupported}<p class="fallback">WebGL2 n'est pas disponible sur cet appareil.</p>{/if}
  {#snippet legend()}<ColorLegend
      label="pression"
      symbol="p"
      unit="u. a."
      min="−"
      mid="0"
      max="+"
    />{/snippet}
  {#snippet controls()}
    <SymbolSlider scene="lab-field" param="kd" />
    <ViewToggle scene="lab-field" view="source" />
  {/snippet}
</VizFrame>

<style>
  .field {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 10;
  }
  .fallback {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }
</style>
