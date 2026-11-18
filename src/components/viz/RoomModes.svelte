<script lang="ts">
  /**
   * Chapter 7, D1: modes of a rectangular room. Plan view of the pressure of mode
   * (nx, ny, 0) (a 3-D standing wave, like the tube of chapter 3 in three directions), and
   * the response at a listening position to a source near a corner (modal sum): isolated
   * peaks at low frequency, overlapping modes above the Schroeder frequency.
   */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import { abs } from '../../lib/physics/complex';
  import {
    listModes,
    modalTransfer,
    modeFrequency,
    schroederFrequency,
    weylCount,
    type Vec3,
  } from '../../lib/physics/room';
  import { shapedNoise } from '../../lib/audio/fft';
  import { startBufferLoop, type BufferLoop } from '../../lib/audio/synth/buffer-loop';
  import VizFrame from './VizFrame.svelte';
  import ColorLegend from './ColorLegend.svelte';
  import PhasorView from './PhasorView.svelte';
  import Plot, { type Series } from './Plot.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';
  import ListenButton from '../ui/ListenButton.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('7-modes');
  const C0 = 343.2;
  const NX = 200;
  const NY = 160;
  const FMAX = 300;
  let voice: BufferLoop | null = null;

  const L = $derived<Vec3>([scene.params.Lx!, scene.params.Ly!, scene.params.Lz!]);
  const nx = $derived(Math.round(scene.params.nx!));
  const ny = $derived(Math.round(scene.params.ny!));
  const T = $derived(scene.params.T!);
  const V = $derived(L[0] * L[1] * L[2]);
  const fm = $derived(modeFrequency([nx, ny, 0], L, C0));
  const fs = $derived(schroederFrequency(T, V));
  const modes = $derived(listModes(L, FMAX * 1.4, C0));
  const src = $derived<Vec3>([0.3, 0.3, 0.3]);
  const rcv = $derived<Vec3>([0.62 * L[0], 0.43 * L[1], 1.2]);
  const d = $derived(Math.hypot(rcv[0] - src[0], rcv[1] - src[1], rcv[2] - src[2]));
  const F = Array.from({ length: 560 }, (_, i) => 20 + (i * (FMAX - 20)) / 559);
  const H = $derived(
    F.map((f) => 20 * Math.log10(abs(modalTransfer(f, L, src, rcv, T, C0, modes)))),
  );
  const series: Series[] = $derived([
    { points: F.map((f, i) => [f, H[i]!] as const), color: 'var(--color-ink)', width: 1.75 },
    {
      points: [
        [20, -20 * Math.log10(d)],
        [FMAX, -20 * Math.log10(d)],
      ],
      color: 'var(--color-ink-muted)',
      width: 1.5,
      dash: '4 4',
      label: 'champ libre',
      labelAt: 'end',
    },
  ]);
  const yMin = $derived(Math.min(...H) - 3);
  const yMax = $derived(Math.max(...H) + 3);
  const ticksAt = $derived(
    modes
      .filter((m) => m.f <= FMAX)
      .map((m) => ({ x: m.f, y: yMin + 1, color: 'var(--color-ink-muted)', r: 1.5 })),
  );
  const vlines = $derived([
    { x: fm, color: 'var(--color-pressure-pos)', dash: '2 3' },
    ...(fs < FMAX ? [{ x: fs, color: 'var(--color-ink)', label: 'Schroeder', dash: '6 4' }] : []),
  ]);

  function field(): Float32Array {
    const out = new Float32Array(NX * NY * 2);
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++)
        out[2 * (j * NX + i)] =
          Math.cos((nx * Math.PI * (i + 0.5)) / NX) * Math.cos((ny * Math.PI * (j + 0.5)) / NY);
    return out;
  }

  function render(rate: number) {
    const NF = 220;
    const fs2 = Array.from({ length: NF }, (_, i) => 20 + (i * (FMAX - 20)) / (NF - 1));
    const g = fs2.map((f) =>
      scene.views.hear === 'free' ? 1 / d : abs(modalTransfer(f, L, src, rcv, T, C0, modes)),
    );
    const gain = (f: number) => {
      if (f < 25 || f > FMAX) return 0;
      const u = ((f - 20) / (FMAX - 20)) * (NF - 1);
      const k = Math.min(NF - 2, Math.floor(u));
      const w = u - k;
      return (g[k]! * (1 - w) + g[k + 1]! * w) / Math.sqrt(f);
    };
    return shapedNoise(1 << 17, rate, gain, 13);
  }
  $effect(() => {
    void [L, T, scene.views.hear];
    voice?.update(render(voice.rate));
  });
</script>

<VizFrame
  scene="7-modes"
  {...number ? { number } : {}}
  {title}
  note="parois rigides ; vue en plan, au niveau du sol"
>
  <div class="stage">
    <PhasorView
      nx={NX}
      ny={NY}
      {field}
      version={[nx, ny]}
      scale={1}
      playing={() => scene.playing}
      {alt}
      aspect="{L[0]} / {L[1]}"
    />
    <span
      class="dot src"
      style:left="{(100 * src[0]) / L[0]}%"
      style:bottom="{(100 * src[1]) / L[1]}%"
      title="source"
    ></span>
    <span
      class="dot rcv"
      style:left="{(100 * rcv[0]) / L[0]}%"
      style:bottom="{(100 * rcv[1]) / L[1]}%"
      title="auditeur"
    ></span>
  </div>
  <div class="readout num" aria-live="polite">
    <span>mode ({nx}, {ny}, 0) <b>{formatNumber(fm, 1)} Hz</b></span>
    <span
      >modes sous 100 Hz <b>{listModes(L, 100, C0).length}</b>
      <small>(Weyl : {formatNumber(weylCount(100, L, C0), 1)})</small></span
    >
    <span>fréquence de Schroeder <b>{formatNumber(fs, 0)} Hz</b></span>
  </div>
  <div class="pad">
    <p class="ylab">niveau chez l'auditeur (dB, réf. champ libre à 1 m), source près d'un coin</p>
    <Plot
      x={{ min: 20, max: FMAX, label: 'f (Hz)' }}
      y={{ min: yMin, max: yMax }}
      {series}
      markers={ticksAt}
      {vlines}
      height={220}
      ariaLabel="Réponse de la pièce en fonction de la fréquence : pics et creux marqués aux basses fréquences, qui se fondent au-dessus de la fréquence de Schroeder ; les modes sont marqués par des points en bas."
    />
  </div>
  {#snippet legend()}
    <div class="keys">
      <span class="key"><i class="s"></i>source</span>
      <span class="key"><i class="r"></i>auditeur</span>
    </div>
    <ColorLegend label="pression du mode" symbol="p" unit="u. a." min="−1" mid="0" max="+1" />
  {/snippet}
  {#snippet controls()}
    <SymbolSlider scene="7-modes" param="Lx" />
    <SymbolSlider scene="7-modes" param="Ly" />
    <SymbolSlider scene="7-modes" param="Lz" />
    <SymbolSlider scene="7-modes" param="nx" />
    <SymbolSlider scene="7-modes" param="ny" />
    <SymbolSlider scene="7-modes" param="T" />
    <ViewToggle scene="7-modes" view="hear" />
    <ListenButton
      label="Écouter un bruit grave"
      onstart={async () => {
        voice = await startBufferLoop(render);
      }}
      onstop={() => {
        voice?.stop();
        voice = null;
      }}
    />
  {/snippet}
</VizFrame>

<style>
  .stage {
    position: relative;
    max-width: 640px;
    margin: 0 auto;
    border: 2px solid var(--color-ink);
  }
  .dot {
    position: absolute;
    width: 14px;
    height: 14px;
    margin: 0 0 -7px -7px;
    border-radius: 50%;
    pointer-events: none;
  }
  .dot.src {
    background: var(--color-ink);
  }
  .dot.rcv {
    border: 2px solid var(--color-ink);
    background: var(--color-bg);
  }
  .pad {
    padding-top: var(--space-3);
  }
  .ylab {
    margin: 0 0 var(--space-1);
    font-family: var(--font-sans);
    font-size: 0.8125rem;
    color: var(--color-ink-muted);
  }
  .readout {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-6);
    padding: var(--space-3) 0;
    border-top: 1px solid var(--color-rule);
    border-bottom: 1px solid var(--color-rule);
    font-size: 1rem;
  }
  small {
    color: var(--color-ink-muted);
    font-size: 0.875rem;
  }
  b {
    font-weight: 600;
  }
  .keys {
    display: flex;
    gap: var(--space-4);
    color: var(--color-ink-muted);
    font-family: var(--font-sans);
  }
  .key {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .key i {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  .key i.s {
    background: var(--color-ink);
  }
  .key i.r {
    border: 2px solid var(--color-ink);
  }
</style>
