<script lang="ts">
  /**
   * D3: Newton's isothermal error vs Laplace's adiabatic compression.
   * Left: p–V diagram (isotherm pV = cst, adiabat pV^γ = cst; the slope at the rest
   * point is the bulk modulus). Right: thermal diffusion length over wavelength vs f.
   */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import {
    AIR,
    celsiusToKelvin,
    gasIsothermalSoundSpeed,
    gasSoundSpeed,
  } from '../../lib/physics/media';
  import {
    AIR_THERMAL_DIFFUSIVITY,
    diffusionToWavelength,
    isothermalCrossover,
  } from '../../lib/physics/thermo';
  import VizFrame from './VizFrame.svelte';
  import Plot, { type Series } from './Plot.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import TermToggles from '../ui/TermToggles.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('1a-newton');
  const T = celsiusToKelvin(20);
  const g = AIR.gamma;
  const adiabatic = $derived(scene.term('adiabatic'));
  const c = $derived(adiabatic ? gasSoundSpeed(AIR, T) : gasIsothermalSoundSpeed(AIR, T));
  const cMeasured = gasSoundSpeed(AIR, T);

  const V = Array.from({ length: 61 }, (_, i) => 0.7 + (0.6 * i) / 60);
  const pv: Series[] = $derived([
    {
      points: V.map((v) => [v, 1 / v] as const),
      color: adiabatic ? 'var(--color-rule)' : 'var(--color-ink)',
      width: adiabatic ? 1.5 : 2.5,
      label: 'isotherme',
    },
    {
      points: V.map((v) => [v, v ** -g] as const),
      color: adiabatic ? 'var(--color-ink)' : 'var(--color-rule)',
      width: adiabatic ? 2.5 : 1.5,
      label: 'adiabatique',
      labelAt: 'start',
    },
  ]);

  const F = Array.from({ length: 81 }, (_, i) => 20 * 10 ** ((i / 80) * Math.log10(1e10 / 20)));
  const ratio: Series[] = [
    {
      points: F.map(
        (f) => [f, diffusionToWavelength(AIR_THERMAL_DIFFUSIVITY, cMeasured, f)] as const,
      ),
      color: 'var(--color-ink)',
      width: 2,
    },
  ];
  const f = $derived(scene.params.f!);
  const r = $derived(diffusionToWavelength(AIR_THERMAL_DIFFUSIVITY, cMeasured, f));
  const fStar = isothermalCrossover(AIR_THERMAL_DIFFUSIVITY, cMeasured);
</script>

<VizFrame scene="1a-newton" {...number ? { number } : {}} {title} animated={false}>
  <div class="grid">
    <div>
      <p class="cap">Pression relative selon le volume relatif d'une tranche</p>
      <Plot
        x={{ min: 0.7, max: 1.3, label: 'V/V₀' }}
        y={{ min: 0.6, max: 1.7, label: 'p/p₀' }}
        series={pv}
        markers={[{ x: 1, y: 1, color: 'var(--color-ink)', r: 4 }]}
        height={300}
        ariaLabel={alt}
      />
    </div>
    <div>
      <p class="cap">Diffusion thermique sur une période, comparée à λ</p>
      <Plot
        x={{ min: 20, max: 1e10, log: true, label: 'f (Hz)' }}
        y={{ min: 1e-5, max: 10, log: true, label: 'δ/λ' }}
        series={ratio}
        vlines={[
          { x: 20000, color: 'var(--color-ink-muted)', label: 'limite audible' },
          { x: fStar, color: 'var(--color-ink-muted)', label: 'δ = λ/2π' },
        ]}
        markers={[{ x: f, y: r, color: 'var(--color-ink)', r: 6, hollow: true }]}
        height={300}
        ariaLabel="Rapport entre longueur de diffusion thermique et longueur d'onde, croissant comme la racine de la fréquence."
      />
    </div>
  </div>
  <div class="readout num" aria-live="polite">
    <span>célérité prédite <b>{formatNumber(c, 1)} m/s</b></span>
    <span>mesurée dans l'air à 20 °C <b>{formatNumber(cMeasured, 1)} m/s</b></span>
    <span>écart <b>{formatNumber((100 * (cMeasured - c)) / cMeasured, 1)} %</b></span>
  </div>
  {#snippet controls()}
    <SymbolSlider scene="1a-newton" param="f" />
    <TermToggles scene="1a-newton" />
  {/snippet}
</VizFrame>

<style>
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-5);
    padding-top: var(--space-3);
  }
  .cap {
    margin: 0 0 var(--space-1) 56px;
    color: var(--color-ink-muted);
  }
  .readout {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-6);
    padding: var(--space-3) 0;
    border-top: 1px solid var(--color-rule);
    font-family: var(--font-sans);
  }
  .readout b {
    font-family: var(--font-num);
    font-weight: 600;
  }
  @media (max-width: 760px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
