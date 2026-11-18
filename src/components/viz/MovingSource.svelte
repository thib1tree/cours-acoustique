<script lang="ts">
  /**
   * Chapter 5, D1: wavefronts of a moving source (or of a fixed source heard by moving
   * listeners). Each circle is a crest emitted one period earlier, centred where the
   * source was at that time. Two frames: the air at rest, or the moving body (the air
   * then blows past it). Beyond M = 1 the fronts pile up on the Mach cone.
   * Right: far-field amplitude gain of a moving monopole, 1/(1 − M cos θ)².
   */
  import { onMount } from 'svelte';
  import { useScene } from '../../lib/scene/scene.svelte';
  import { createLoop, cssVar, fitCanvas, onThemeChange } from '../../lib/viz/loop';
  import { formatNumber } from '../../lib/scene/format';
  import { convectiveFactor, machAngle } from '../../lib/physics/moving';
  import VizFrame from './VizFrame.svelte';
  import PolarDiagram from './PolarDiagram.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('5-moving');
  let canvas: HTMLCanvasElement;
  let t = 0; // s, in the cycle

  const M = $derived(scene.params.M!);
  const sourceMoves = $derived(scene.views.mover !== 'observer');
  const bodyFrame = $derived(scene.views.frame === 'body');
  const alpha = $derived(machAngle(M));
  const gmax = $derived(M < 1 ? convectiveFactor(M, 1) : 1);
  const db = (x: number) => formatNumber(20 * Math.log10(x), 1);

  // Display units: speed of sound C px/s, emission period T s.
  const T = 0.45;
  function geometry(w: number) {
    const C = w / 9;
    return { C, lam: C * T };
  }
  let start = 0; // cycle start, reset when the mover leaves the frame

  function draw() {
    if (!canvas) return;
    const { w, h, dpr } = fitCanvas(canvas);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const ink = cssVar('--color-ink');
    const muted = cssVar('--color-ink-muted');
    const crest = cssVar('--color-pressure-pos');
    const sans = cssVar('--font-sans');
    const { C } = geometry(w);
    const V = M * C;
    const cy = h / 2;
    const x0 = sourceMoves ? w * 0.15 : w / 2; // moving source starts at left; fixed source centred
    const now = t - start;
    // Position of the moving body in the air frame, and the drawing offset.
    const xs = (tt: number) => (sourceMoves ? x0 + V * tt : w / 2);
    const shift = bodyFrame && sourceMoves ? w / 2 - xs(now) : 0;
    // listeners: fixed, or moving towards/away from a fixed source
    const listeners = sourceMoves
      ? [w * 0.9, w * 0.06]
      : [w / 2 + w * 0.42 - V * now, w / 2 - w * 0.42 - V * now];
    const lShift = bodyFrame && !sourceMoves ? -(-V * now) : 0;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = crest;
    const n = Math.floor(now / T);
    for (let i = n; i >= 0; i--) {
      const age = now - i * T;
      const r = C * age;
      if (r > Math.hypot(w, h) * 1.2) break;
      ctx.globalAlpha = Math.max(0.15, 1 - r / (w * 1.1));
      ctx.beginPath();
      ctx.arc(xs(i * T) + shift + lShift, cy, r, 0, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Mach cone
    if (sourceMoves && alpha !== null) {
      const sx = xs(now) + shift;
      const L = w * 1.5;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(sx - L * Math.cos(alpha), cy - L * Math.sin(alpha));
      ctx.lineTo(sx, cy);
      ctx.lineTo(sx - L * Math.cos(alpha), cy + L * Math.sin(alpha));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // source
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(xs(now) + shift + lShift, cy, 6, 0, 2 * Math.PI);
    ctx.fill();
    // listeners (ear markers)
    ctx.font = `12px ${sans}`;
    ctx.textAlign = 'center';
    listeners.forEach((x, k) => {
      const X = x + shift + lShift;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X, cy, 7, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = muted;
      ctx.fillText(
        k === 0 ? (sourceMoves ? 'devant' : 's’approche') : sourceMoves ? 'derrière' : 's’éloigne',
        X,
        cy + 24,
      );
    });
    // wind arrows in the body frame
    if (bodyFrame && M > 0) {
      ctx.fillStyle = muted;
      ctx.textAlign = 'left';
      ctx.fillText(
        `vent : ${formatNumber(M, 2)} c₀ vers ${sourceMoves ? 'la gauche' : 'la droite'}`,
        12,
        20,
      );
    }
    // restart when the moving body leaves
    if (sourceMoves && xs(now) > w * 1.05) start = t;
    if (!sourceMoves && Math.abs(V * now) > w * 0.4) start = t;
  }

  onMount(() => {
    const loop = createLoop(
      canvas,
      (dt) => {
        t += dt * (scene.slow ? 0.25 : 1);
        draw();
      },
      () => scene.playing,
    );
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    const off = onThemeChange(draw);
    return () => {
      loop.destroy();
      ro.disconnect();
      off();
    };
  });
  $effect(() => {
    void [M, sourceMoves, bodyFrame];
    start = t;
    draw();
  });
</script>

<VizFrame
  scene="5-moving"
  {...number ? { number } : {}}
  {title}
  note="crêtes émises une fois par période ; vitesse du son constante dans l'air"
>
  <div class="grid">
    <canvas bind:this={canvas} class="fronts" role="img" aria-label={alt}></canvas>
    <div class="side">
      {#if sourceMoves && M < 1}
        <PolarDiagram
          pattern={(th) => convectiveFactor(M, Math.sin(th)) / gmax}
          version={M}
          ariaLabel="Gain d'amplitude d'un monopôle en mouvement selon la direction ; le mouvement est vers la droite."
        />
        <p class="cap">amplitude rayonnée (champ lointain) ; mouvement vers la droite</p>
      {:else if sourceMoves}
        <p class="cap big">
          Au-delà de M = 1, aucun son n'atteint l'avant de la source : il arrive d'un coup, avec le
          cône.
        </p>
      {:else}
        <p class="cap big">
          La source est fixe : son rayonnement reste le même dans toutes les directions.
        </p>
      {/if}
    </div>
  </div>
  <div class="readout num" aria-live="polite">
    {#if sourceMoves}
      <span
        >fréquence devant <b
          >{M < 1 ? `${formatNumber(1 / (1 - M), 2)} f` : 'aucun son avant le cône'}</b
        ></span
      >
      <span>derrière <b>{formatNumber(1 / (1 + M), 2)} f</b></span>
      {#if M < 1 && M > 0}<span
          >amplitude devant <b>+{db(convectiveFactor(M, 1))} dB</b>, derrière
          <b>{db(convectiveFactor(M, -1))} dB</b></span
        >{/if}
      {#if alpha !== null}<span
          >demi-angle du cône <b>{formatNumber((alpha * 180) / Math.PI, 0)}°</b></span
        >{/if}
    {:else}
      <span>auditeur qui s'approche <b>{formatNumber(1 + M, 2)} f</b></span>
      <span
        >qui s'éloigne <b>{M <= 1 ? `${formatNumber(1 - M, 2)} f` : 'ne reçoit plus rien'}</b></span
      >
    {/if}
  </div>
  {#snippet controls()}
    <SymbolSlider scene="5-moving" param="M" />
    <ViewToggle scene="5-moving" view="mover" />
    <ViewToggle scene="5-moving" view="frame" />
  {/snippet}
</VizFrame>

<style>
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    gap: var(--space-4);
    align-items: center;
  }
  @media (max-width: 720px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .fronts {
    display: block;
    width: 100%;
    height: 320px;
  }
  @media (max-width: 720px) {
    .fronts {
      height: 220px;
    }
  }
  .cap {
    margin: 0;
    text-align: center;
    font-family: var(--font-sans);
    font-size: 0.8125rem;
    color: var(--color-ink-muted);
  }
  .cap.big {
    font-size: 1rem;
    color: var(--color-ink);
    text-align: left;
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
