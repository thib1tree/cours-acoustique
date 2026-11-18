<script lang="ts">
  /**
   * Chapter 7, D3: reverberation. Sabine and Eyring times versus mean absorption, and the
   * decay of a shoebox computed by image sources (specular walls) compared with both.
   * Sound: dry synthesized sounds, convolved with a hybrid impulse response (exact early
   * reflections, then a statistical tail with the Eyring time).
   */
  import { useScene } from '../../lib/scene/scene.svelte';
  import { formatNumber } from '../../lib/scene/format';
  import {
    echogram,
    eyringT,
    fitDecay,
    meanFreePath,
    sabineT,
    type Vec3,
  } from '../../lib/physics/room';
  import { area, shoebox } from '../../scenes/room';
  import { roomImpulseResponse } from '../../lib/audio/room-ir';
  import { clap, plucks } from '../../lib/audio/dry';
  import { convolve } from '../../lib/audio/fft';
  import { startBufferLoop, type BufferLoop } from '../../lib/audio/synth/buffer-loop';
  import VizFrame from './VizFrame.svelte';
  import Plot, { type Series } from './Plot.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';
  import ListenButton from '../ui/ListenButton.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('7-reverb');
  const C0 = 343.2;
  let voice: BufferLoop | null = null;

  const V = $derived(scene.params.V!);
  const alpha = $derived(scene.params.alpha!);
  const L = $derived(shoebox(V));
  const S = $derived(area(L));
  const Ts = $derived(sabineT(V, S, alpha, C0));
  const Te = $derived(eyringT(V, S, alpha, C0));
  const src = $derived<Vec3>([0.22 * L[0], 0.31 * L[1], 0.36 * L[2]]);
  const rcv = $derived<Vec3>([0.71 * L[0], 0.62 * L[1], 0.45 * L[2]]);

  const A = Array.from({ length: 120 }, (_, i) => 0.02 * 40 ** (i / 119));
  const tSeries: Series[] = $derived([
    {
      points: A.map((a) => [a, sabineT(V, S, a, C0)] as const),
      color: 'var(--color-ink-muted)',
      width: 1.5,
      dash: '5 4',
      label: 'Sabine',
      labelAt: 'start',
    },
    {
      points: A.map((a) => [a, eyringT(V, S, a, C0)] as const),
      color: 'var(--color-ink)',
      width: 2,
    },
  ]);
  const tRange = $derived({
    min: Math.max(0.01, eyringT(V, S, 0.8, C0) * 0.7),
    max: sabineT(V, S, 0.02, C0) * 1.3,
    log: true,
  });

  // Echogram of the specular shoebox, limited to ~4·10⁵ images.
  const DT = 0.005;
  const tmax = $derived(Math.min(1.5 * Te + 0.05, Math.cbrt((3 * 4e5 * V) / (4 * Math.PI)) / C0));
  const echo = $derived(echogram(L, src, rcv, alpha, C0, tmax, DT));
  const Ti = $derived(fitDecay(echo, DT, 0.05, tmax));
  const ref = $derived.by(() => {
    // level of the decay at 50 ms (average of a few bins), to anchor the model lines
    const b = Math.round(0.05 / DT);
    let s = 0;
    for (let i = b; i < b + 4 && i < echo.length; i++) s += echo[i]!;
    return 10 * Math.log10(s / 4);
  });
  const top = $derived(10 * Math.log10(Math.max(...echo)));
  const eSeries: Series[] = $derived([
    {
      points: Array.from(echo).flatMap((e, b) => {
        const y = e > 0 ? Math.max(-70, 10 * Math.log10(e) - top) : -70;
        return [[b * DT, y] as const, [(b + 1) * DT, y] as const];
      }),
      color: 'var(--color-energy)',
      width: 1.25,
    },
    {
      points: [
        [0.05, ref - top],
        [tmax, ref - top - (60 * (tmax - 0.05)) / Ts],
      ],
      color: 'var(--color-ink-muted)',
      width: 1.5,
      dash: '5 4',
      label: 'Sabine',
      labelAt: 'end',
    },
    {
      points: [
        [0.05, ref - top],
        [tmax, ref - top - (60 * (tmax - 0.05)) / Te],
      ],
      color: 'var(--color-ink)',
      width: 1.5,
      label: 'Eyring',
      labelAt: 'end',
    },
  ]);

  function render(rate: number) {
    const dry = scene.views.source === 'clap' ? clap(rate) : plucks(rate);
    let out: Float32Array;
    if (scene.views.hear === 'dry') out = dry;
    else {
      const h = roomImpulseResponse({ rate, L, s: src, r: rcv, alpha, T: Te, c: C0 });
      out = convolve(dry, h);
    }
    const pad = new Float32Array(out.length + Math.round(0.6 * rate));
    pad.set(out);
    return pad;
  }
  $effect(() => {
    void [V, alpha, scene.views.source, scene.views.hear];
    voice?.update(render(voice.rate));
  });
</script>

<VizFrame
  scene="7-reverb"
  {...number ? { number } : {}}
  {title}
  animated={false}
  note="salle parallélépipédique (proportions 1,6 : 1,25 : 1), absorption uniforme, indépendante de la fréquence"
>
  <div class="readout num" aria-live="polite">
    <span>Sabine <b>{formatNumber(Ts, 2)} s</b></span>
    <span>Eyring <b>{formatNumber(Te, 2)} s</b></span>
    <span>sources images <b>{formatNumber(Ti, 2)} s</b></span>
    <span>libre parcours moyen <b>{formatNumber(meanFreePath(V, S), 1)} m</b></span>
    <span>réflexions par seconde <b>{formatNumber((C0 * S) / (4 * V), 0)}</b></span>
  </div>
  <div class="plots">
    <div>
      <p class="ylab">durée de réverbération (s) selon l'absorption moyenne</p>
      <Plot
        x={{ min: 0.02, max: 0.8, log: true, label: 'ᾱ' }}
        y={tRange}
        series={tSeries}
        markers={[
          { x: alpha, y: Te, color: 'var(--color-ink)', r: 5 },
          { x: alpha, y: Ts, color: 'var(--color-ink-muted)', r: 4, hollow: true },
        ]}
        height={220}
        ariaLabel={alt}
      />
    </div>
    <div>
      <p class="ylab">décroissance de l'énergie chez l'auditeur (dB)</p>
      <Plot
        x={{ min: 0, max: tmax, label: 't (s)' }}
        y={{ min: -70, max: 2 }}
        series={eSeries}
        height={220}
        ariaLabel="Décroissance de l'énergie calculée par les sources images, comparée aux pentes de Sabine et d'Eyring."
      />
    </div>
  </div>
  {#snippet legend()}
    <div class="keys">
      <span class="key"><i style:background="var(--color-energy)"></i>sources images</span>
      <span class="key"><i style:background="var(--color-ink)"></i>Eyring</span>
      <span class="key"><i class="dash"></i>Sabine</span>
    </div>
  {/snippet}
  {#snippet controls()}
    <SymbolSlider scene="7-reverb" param="V" />
    <SymbolSlider scene="7-reverb" param="alpha" />
    <ViewToggle scene="7-reverb" view="source" />
    <ViewToggle scene="7-reverb" view="hear" />
    <ListenButton
      label="Écouter"
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
  .plots {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-5);
    padding-top: var(--space-3);
  }
  @media (max-width: 720px) {
    .plots {
      grid-template-columns: minmax(0, 1fr);
    }
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
    border-bottom: 1px solid var(--color-rule);
    font-size: 1rem;
  }
  b {
    font-weight: 600;
  }
  .keys {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    color: var(--color-ink-muted);
    font-family: var(--font-sans);
  }
  .key {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .key i {
    width: 22px;
    height: 3px;
  }
  .key i.dash {
    background: repeating-linear-gradient(
      to right,
      var(--color-ink-muted) 0 3px,
      transparent 3px 7px
    );
  }
</style>
