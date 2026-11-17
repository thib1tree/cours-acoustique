<script lang="ts">
  /**
   * D1: the wave equation as the continuum limit of a mass–spring chain.
   * N masses on a fixed length, a right-going pulse; below, the exact continuum
   * (d'Alembert) solution for comparison. At small N, short wavelengths lag: lattice
   * dispersion. Switching the springs off stops all propagation.
   */
  import { onMount } from 'svelte';
  import { useScene } from '../../lib/scene/scene.svelte';
  import { createLoop, cssVar, fitCanvas, onThemeChange } from '../../lib/viz/loop';
  import { formatNumber } from '../../lib/scene/format';
  import { type Chain, type ChainState, createState, step } from '../../lib/physics/mass-spring';
  import VizFrame from './VizFrame.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';
  import TermToggles from '../ui/TermToggles.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('1a-chain');
  const LEN = 1; // m, display units: c = 1 m/s of animation
  const C = 0.35; // continuum speed, display m/s

  let canvas: HTMLCanvasElement;
  let chain: Chain;
  let st: ChainState;
  let t = 0;

  const N = $derived(Math.round(scene.params.N!));
  const w = $derived(scene.params.w! / 100);
  const springs = $derived(scene.term('springs'));
  const showContinuum = $derived(scene.views.show !== 'chain');
  const X0 = 0.25;
  const pulse = (x: number) => 0.06 * Math.exp(-((x - X0) ** 2) / (2 * w * w));

  function reset() {
    const a = LEN / (N + 1);
    // m = 1, K chosen so that a√(K/m) = C.
    chain = { n: N, m: 1, K: (C / a) ** 2, a, ends: 'fixed' };
    st = createState(chain);
    for (let j = 0; j < N; j++) {
      const x = (j + 1) * a;
      st.u[j] = pulse(x);
      // Right-going: v = −c ∂u/∂x.
      const h = 1e-5;
      st.v[j] = (-C * (pulse(x + h) - pulse(x - h))) / (2 * h);
    }
    t = 0;
  }

  function advance(dt: number) {
    if (!springs) {
      // No coupling: each mass drifts with its own velocity, nothing propagates.
      for (let j = 0; j < chain.n; j++) st.u[j] = st.u[j]! + st.v[j]! * dt;
      t += dt;
      return;
    }
    const sub = Math.max(1, Math.ceil(dt / (0.2 * Math.sqrt(chain.m / chain.K))));
    step(chain, st, dt / sub, sub);
    t += dt;
  }

  function draw() {
    if (!canvas || !st) return;
    const { w: W, h: H, dpr } = fitCanvas(canvas);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const ink = cssVar('--color-ink');
    const muted = cssVar('--color-ink-muted');
    const rule = cssVar('--color-rule');
    const cV = cssVar('--color-velocity');
    const pad = 20;
    const X = (x: number) => pad + (x / LEN) * (W - 2 * pad);
    const yChain = H * 0.28;
    const exag = (W - 2 * pad) * 1.6; // display gain for displacement
    // walls
    ctx.fillStyle = ink;
    ctx.fillRect(X(0) - 4, yChain - 18, 4, 36);
    ctx.fillRect(X(LEN), yChain - 18, 4, 36);
    // springs and masses
    const pos = (j: number) => X((j + 1) * chain.a) + st.u[j]! * exag * 0.2;
    ctx.strokeStyle = springs ? (scene.hovered === 'springs' ? ink : muted) : rule;
    ctx.lineWidth = scene.hovered === 'springs' ? 1.75 : 1;
    let prev = X(0);
    for (let j = 0; j <= N; j++) {
      const next = j < N ? pos(j) : X(LEN);
      const coils = Math.max(2, Math.min(6, Math.round((next - prev) / 6)));
      ctx.beginPath();
      ctx.moveTo(prev, yChain);
      for (let k = 1; k < 2 * coils; k++)
        ctx.lineTo(prev + ((next - prev) * k) / (2 * coils), yChain + (k % 2 ? -5 : 5));
      ctx.lineTo(next, yChain);
      ctx.stroke();
      prev = next;
    }
    const r = Math.max(2.5, Math.min(7, (W - 2 * pad) / N / 3));
    ctx.fillStyle = scene.hovered === 'mass' ? ink : ink;
    for (let j = 0; j < N; j++) {
      ctx.beginPath();
      ctx.arc(pos(j), yChain, scene.hovered === 'mass' ? r + 1.5 : r, 0, 2 * Math.PI);
      ctx.fill();
    }
    // displacement plot
    const base = H * 0.78;
    const A = (H * 0.36) / 0.06;
    ctx.strokeStyle = rule;
    ctx.beginPath();
    ctx.moveTo(X(0), base);
    ctx.lineTo(X(LEN), base);
    ctx.stroke();
    if (showContinuum && springs) {
      // Exact continuum solution on [0, L] with fixed ends: method of images (odd extension).
      const u = (x: number) => {
        let s = 0;
        for (let k = -2; k <= 2; k++) {
          s += pulse(x - C * t + 2 * k * LEN) - pulse(-(x - C * t) + 2 * k * LEN);
        }
        return s;
      };
      ctx.strokeStyle = muted;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let px = X(0); px <= X(LEN); px += 2) {
        const x = ((px - pad) / (W - 2 * pad)) * LEN;
        const y = base - u(x) * A;
        if (px === X(0)) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = cV;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(0), base);
    for (let j = 0; j < N; j++) ctx.lineTo(X((j + 1) * chain.a), base - st.u[j]! * A);
    ctx.lineTo(X(LEN), base);
    ctx.stroke();
    for (let j = 0; j < N; j++) {
      ctx.fillStyle = cV;
      ctx.beginPath();
      ctx.arc(X((j + 1) * chain.a), base - st.u[j]! * A, N > 60 ? 1.5 : 2.5, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.fillStyle = muted;
    ctx.font = `12px ${cssVar('--font-sans')}`;
    ctx.fillText('déplacement u des masses', X(0), base - H * 0.4);
  }

  onMount(() => {
    reset();
    const loop = createLoop(
      canvas,
      (dt) => {
        advance(dt * (scene.slow ? 0.25 : 1));
        if (t * C > 2 * LEN + 0.3) reset();
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
    void [N, w, scene.epoch];
    reset();
    draw();
  });
  $effect(() => {
    void [springs, showContinuum, scene.hovered];
    draw();
  });
</script>

<VizFrame
  scene="1a-chain"
  {...number ? { number } : {}}
  {title}
  note="espacement a = {formatNumber(100 / (N + 1), 1)} cm, largeur de l'impulsion {formatNumber(
    w * 100,
  )} cm"
>
  <canvas bind:this={canvas} class="chain" role="img" aria-label={alt}></canvas>
  {#snippet legend()}
    <div class="keys">
      <span class="key"><i style:background="var(--color-velocity)"></i>chaîne discrète</span>
      {#if showContinuum}<span class="key"><i class="dash"></i>milieu continu (d'Alembert)</span
        >{/if}
    </div>
  {/snippet}
  {#snippet controls()}
    <SymbolSlider scene="1a-chain" param="N" />
    <SymbolSlider scene="1a-chain" param="w" />
    <ViewToggle scene="1a-chain" view="show" />
    <TermToggles scene="1a-chain" />
  {/snippet}
</VizFrame>

<style>
  .chain {
    display: block;
    width: 100%;
    height: 300px;
  }
  .keys {
    display: flex;
    gap: var(--space-4);
    color: var(--color-ink-muted);
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
      var(--color-ink-muted) 0 5px,
      transparent 5px 9px
    );
  }
  @media (max-width: 760px) {
    .chain {
      height: 240px;
    }
  }
</style>
