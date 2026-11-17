<script lang="ts">
  /**
   * D10: a sinusoid of finite amplitude steepens as it travels: each point moves at
   * c₀ + βu. Exact parametric (Poisson) solution: u = sin θ at retarded phase
   * φ = θ − σ sin θ, σ = x/x̄. Beyond σ = 1 the curve folds back: physically impossible,
   * a shock has formed. Each nonlinear term can be switched off.
   */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import { pressureFromSpl } from '../../lib/physics/levels';
  import { AIR, celsiusToKelvin, gasDensity, gasSoundSpeed } from '../../lib/physics/media';
  import { betaIdealGas, shockDistance } from '../../lib/physics/simple-wave';
  import VizFrame from './VizFrame.svelte';
  import Plot, { type Series } from './Plot.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import TermToggles from '../ui/TermToggles.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('1b-shock');
  const T = celsiusToKelvin(20);
  const rho = gasDensity(AIR, T);
  const c0 = gasSoundSpeed(AIR, T);

  const beta = $derived(
    betaIdealGas(AIR.gamma, {
      convective: scene.term('convective'),
      stateLaw: scene.term('stateLaw'),
    }),
  );
  const u0 = $derived((Math.SQRT2 * pressureFromSpl(scene.params.L!)) / (rho * c0));
  const xbar = $derived(shockDistance(c0, beta, 2 * Math.PI * scene.params.f!, u0));
  const sigma = $derived(Number.isFinite(xbar) ? scene.params.x! / xbar : 0);

  const curve = (sg: number): [number, number][] => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 600; i++) {
      const th = -Math.PI + (4 * Math.PI * i) / 600;
      pts.push([(th - sg * Math.sin(th)) / (2 * Math.PI), Math.sin(th)]);
    }
    return pts;
  };
  const series: Series[] = $derived([
    { points: curve(0), color: 'var(--color-rule)', width: 1.5, dash: '5 4', label: 'à la source' },
    {
      points: curve(sigma),
      color: sigma >= 1 ? 'var(--color-pressure-pos)' : 'var(--color-ink)',
      width: 2.25,
      ...(sigma >= 1 ? { dash: '3 3' } : {}),
    },
  ]);
</script>

<VizFrame
  scene="1b-shock"
  {...number ? { number } : {}}
  {title}
  animated={false}
  note="onde plane sans pertes, forme d'onde en un point situé à la distance x"
>
  <div class="pad">
    <Plot
      x={{ min: -0.5, max: 1.5, label: 'temps retardé (périodes)' }}
      y={{ min: -1.25, max: 1.25, label: 'p/P' }}
      {series}
      height={280}
      ariaLabel={alt}
    />
  </div>
  <div class="readout num" aria-live="polite">
    <span><i>β</i> = <b>{formatNumber(beta, 2)}</b></span>
    <span>nombre de Mach acoustique <i>ε</i> = <b>{formatNumber(u0 / c0, 5)}</b></span>
    <span
      >distance de choc <i>x̄</i> =
      <b
        >{Number.isFinite(xbar)
          ? xbar < 1000
            ? formatNumber(xbar, 1) + ' m'
            : formatNumber(xbar / 1000, 1) + ' km'
          : 'infinie'}</b
      ></span
    >
    <span><i>x</i>/<i>x̄</i> = <b>{formatNumber(sigma, 2)}</b></span>
  </div>
  {#if sigma >= 1}
    <p class="warn" role="status">
      Au-delà de <i>x̄</i>, la solution se replie sur elle-même : une même date aurait trois
      pressions. C'est impossible : un choc s'est formé, et le modèle sans dissipation n'est plus
      valable.
    </p>
  {/if}
  {#snippet controls()}
    <SymbolSlider scene="1b-shock" param="L" />
    <SymbolSlider scene="1b-shock" param="f" />
    <SymbolSlider scene="1b-shock" param="x" />
    <TermToggles scene="1b-shock" />
  {/snippet}
</VizFrame>

<style>
  .pad {
    padding-top: var(--space-3);
  }
  .readout {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-6);
    padding: var(--space-3) 0;
    border-top: 1px solid var(--color-rule);
    font-size: 1rem;
  }
  b {
    font-weight: 600;
  }
  .warn {
    border-left: 2px solid var(--color-pressure-pos);
    padding-left: var(--space-3);
    font-family: var(--font-serif);
    font-size: 1rem;
  }
</style>
