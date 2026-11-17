<script lang="ts">
  /**
   * Helium voice: the pitch (vocal folds) does not change, the formants (resonances of
   * the vocal tract, ∝ c) rise with the sound speed of the gas mixture.
   */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import { AIR, HELIUM, celsiusToKelvin, gasSoundSpeed, mixGases } from '../../lib/physics/media';
  import { FORMANTS_A, startVowel, type VowelVoice } from '../../lib/audio/synth/voice';
  import VizFrame from './VizFrame.svelte';
  import Plot, { type Series } from './Plot.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import ListenButton from '../ui/ListenButton.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('1a-helium');
  const T = celsiusToKelvin(37); // gas warmed in the vocal tract
  const F0 = 110;
  const cAir = gasSoundSpeed(AIR, T);
  const ratio = $derived(gasSoundSpeed(mixGases(HELIUM, AIR, scene.params.x! / 100), T) / cAir);
  let voice: VowelVoice | null = null;

  $effect(() => {
    voice?.setFormantRatio(ratio);
  });

  /** Spectral envelope: sum of resonance curves (display only). */
  function envelope(r: number): Series['points'] {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 240; i++) {
      const f = 50 * (12000 / 50) ** (i / 240);
      let s = 0;
      for (const F of FORMANTS_A) {
        const fc = F.f * r;
        const q = fc / F.bw;
        s += 10 ** (F.gainDb / 20) / Math.sqrt(1 + q * q * (f / fc - fc / f) ** 2);
      }
      pts.push([f, 20 * Math.log10(s + 1e-6)]);
    }
    return pts;
  }
  const harmonics = $derived.by(() => {
    const pts: [number, number][] = [];
    const env = envelope(ratio);
    for (let n = 1; n * F0 < 12000; n++) {
      const f = n * F0;
      const i = Math.round((Math.log(f / 50) / Math.log(12000 / 50)) * 240);
      if (i >= 0 && i <= 240) pts.push([f, env[i]![1] - 12 * Math.log2(n) * 0.25]);
    }
    return pts;
  });
  const series: Series[] = $derived([
    { points: envelope(1), color: 'var(--color-rule)', width: 1.5, dash: '5 4', label: 'air' },
    { points: envelope(ratio), color: 'var(--color-ink)', width: 2, label: 'enveloppe (formants)' },
  ]);
</script>

<VizFrame
  scene="1a-helium"
  {...number ? { number } : {}}
  {title}
  animated={false}
  note="voyelle /a/ synthétisée, fondamentale 110 Hz"
>
  <div class="pad">
    <Plot
      x={{ min: 50, max: 12000, log: true, label: 'f (Hz)' }}
      y={{ min: -50, max: 5, label: 'dB' }}
      {series}
      markers={harmonics.map(([f, y]) => ({ x: f, y, color: 'var(--color-ink-muted)', r: 2 }))}
      height={280}
      ariaLabel={alt}
    />
    <p class="readout num">
      célérité dans le conduit vocal : × {formatNumber(ratio, 2)}, formants F1 = {formatNumber(
        FORMANTS_A[0].f * ratio,
      )} Hz, F2 = {formatNumber(FORMANTS_A[1].f * ratio)} Hz ; fondamentale inchangée : {F0} Hz
    </p>
  </div>
  {#snippet controls()}
    <SymbolSlider scene="1a-helium" param="x" />
    <ListenButton
      label="Écouter la voyelle"
      onstart={async () => {
        voice = await startVowel(F0, ratio);
      }}
      onstop={() => {
        voice?.stop();
        voice = null;
      }}
    />
  {/snippet}
</VizFrame>

<style>
  .pad {
    padding-top: var(--space-3);
  }
  .readout {
    font-family: var(--font-sans);
    color: var(--color-ink-muted);
    margin: var(--space-2) 0 0;
  }
</style>
