<script lang="ts">
  /**
   * D9: why decibels. A level ruler from 0 to 194 dB; switching to a linear pressure
   * scale crushes everything but the top. Adding N sources: +10 log N (incoherent) or
   * +20 log N (coherent, in phase). A tone lets the reader hear the level steps.
   */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber, formatSci } from '../../lib/scene/format';
  import { P_ATM } from '../../lib/physics/constants';
  import { pressureFromSpl, sumCoherentInPhase, sumIncoherent } from '../../lib/physics/levels';
  import { LEVEL_EXAMPLES } from '../../lib/physics/level-examples';
  import { startTone, type Tone } from '../../lib/audio/synth/tone';
  import VizFrame from './VizFrame.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';
  import ListenButton from '../ui/ListenButton.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('1b-levels');
  const L = $derived(scene.params.L!);
  const N = $derived(Math.round(scene.params.N!));
  const coherent = $derived(scene.views.sum === 'coherent');
  const Ltot = $derived(
    Math.min(
      200,
      coherent ? sumCoherentInPhase(Array(N).fill(L)) : sumIncoherent(Array(N).fill(L)),
    ),
  );
  const lin = $derived(scene.views.scale === 'lin');
  const pos = (Lv: number) => (lin ? Math.min(1, pressureFromSpl(Lv) / P_ATM) : Lv / 200);
  const pTot = $derived(pressureFromSpl(Ltot));
  let tone: Tone | null = null;

  $effect(() => {
    // The tone follows the level difference only (no absolute calibration in a browser).
    tone?.setLevelDb(Math.max(-60, Math.min(-6, -30 + (Ltot - 60) * 0.5 + (Ltot - L))));
  });

  const ticks = $derived(
    lin
      ? [0, 20000, 40000, 60000, 80000, 100000].map((pa) => ({
          x: pa / P_ATM,
          label: `${formatNumber(pa / 1000)} kPa`,
        }))
      : [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map((d) => ({
          x: d / 200,
          label: `${d}`,
        })),
  );
</script>

<VizFrame
  scene="1b-levels"
  {...number ? { number } : {}}
  {title}
  animated={false}
  note={lin ? 'échelle linéaire en pression efficace' : 'échelle logarithmique en dB (réf. 20 µPa)'}
>
  <div class="ruler" role="img" aria-label={alt}>
    <div class="axis">
      {#each ticks as tk (tk.label)}
        <span class="tk num" style:left="{tk.x * 100}%">{tk.label}</span>
      {/each}
    </div>
    {#each LEVEL_EXAMPLES as ex, i (ex.L)}
      <div
        class="ex"
        class:unverified={!ex.verified}
        class:low={i % 2 === 1}
        class:first={i === 0}
        class:last={i === LEVEL_EXAMPLES.length - 1}
        style:left="{pos(ex.L) * 100}%"
      >
        <span class="dot"></span><span class="t"
          >{ex.label}<br /><span class="num">{formatNumber(ex.L)} dB</span></span
        >
      </div>
    {/each}
    <div class="cursor" style:left="{pos(Ltot) * 100}%"></div>
  </div>
  <ol class="ex-list">
    {#each LEVEL_EXAMPLES as ex (ex.L)}
      <li class:unverified={!ex.verified}>
        <span class="num">{formatNumber(ex.L)} dB</span>
        {ex.label}
      </li>
    {/each}
  </ol>
  <div class="readout num" aria-live="polite">
    <span
      >niveau total <b>{formatNumber(Ltot, 1)} dB</b>{#if N > 1}&nbsp;(+{formatNumber(Ltot - L, 1)} dB){/if}</span
    >
    <span>pression efficace <b>{formatSci(pTot, 3)} Pa</b></span>
    <span
      >non-linéarité <i>p</i>/(<i>ρ</i>₀<i>c</i>₀²) =
      <b>{formatSci((Math.SQRT2 * pTot) / (1.4 * P_ATM), 2)}</b></span
    >
  </div>
  {#snippet controls()}
    <SymbolSlider scene="1b-levels" param="L" />
    <SymbolSlider scene="1b-levels" param="N" />
    <ViewToggle scene="1b-levels" view="scale" />
    <ViewToggle scene="1b-levels" view="sum" />
    <ListenButton
      label="Écouter les écarts de niveau"
      onstart={async () => {
        tone = await startTone(1000, -30);
      }}
      onstop={() => {
        tone?.stop();
        tone = null;
      }}
    />
  {/snippet}
</VizFrame>

<style>
  .ruler {
    position: relative;
    height: 230px;
    margin: var(--space-4) 18px 0 18px;
  }
  .axis {
    position: absolute;
    left: 0;
    right: 0;
    top: 30px;
    border-top: 2px solid var(--color-ink);
  }
  .tk {
    position: absolute;
    top: 6px;
    transform: translateX(-50%);
    color: var(--color-ink-muted);
    font-size: 0.8125rem;
  }
  .tk::before {
    content: '';
    position: absolute;
    left: 50%;
    top: -12px;
    height: 8px;
    border-left: 1px solid var(--color-ink);
  }
  .ex {
    position: absolute;
    top: 64px;
    width: 0;
  }
  .ex.low {
    top: 132px;
  }
  .ex.low .dot {
    top: -104px;
  }
  .ex .dot {
    position: absolute;
    left: -4px;
    top: -36px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-ink);
  }
  .ex .t {
    position: absolute;
    left: 0;
    width: max-content;
    max-width: 150px;
    transform: translateX(-50%);
    font-size: 0.8125rem;
    line-height: 1.3;
    text-align: center;
  }
  .ex.first .t {
    transform: none;
    text-align: left;
  }
  .ex.last .t {
    transform: translateX(-100%);
    text-align: right;
  }
  .ex.unverified .t {
    color: var(--color-ink-muted);
  }
  .ex-list {
    display: none;
  }
  @media (max-width: 600px) {
    .ruler {
      height: 120px;
    }
    .ex .lab {
      display: none;
    }
    .ex,
    .ex.low {
      top: 64px;
    }
    .ex.low .dot {
      top: -36px;
    }
    .ex.low .t {
      top: 18px;
    }
    .ex-list {
      display: block;
      list-style: none;
      padding: 0;
      margin: 0 0 var(--space-3);
      font-size: 0.875rem;
    }
    .ex-list li {
      padding: 4px 0;
      border-top: 1px solid var(--color-rule);
    }
    .ex-list .num {
      display: inline-block;
      min-width: 4.5em;
    }
    .ex-list .unverified {
      color: var(--color-ink-muted);
    }
  }
  .cursor {
    position: absolute;
    top: 0;
    bottom: 0;
    border-left: 2px solid var(--color-pressure-pos);
    transition: left var(--dur) var(--ease);
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
</style>
