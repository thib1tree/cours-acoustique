<script lang="ts">
  /**
   * Prerequisite: a fluid parcel.
   * Left: pressure forces on its faces. Each face carries ~1 kN (p₀S for a 10 cm cube),
   * only the tiny difference −(∂p/∂x)V accelerates it: the gradient pushes, not p.
   * Right: steady accelerating flow u(x) = U(1 + x/ℓ). A fixed probe (Eulerian) reads a
   * constant velocity, the followed parcel (Lagrangian) accelerates: Du/Dt = u ∂u/∂x.
   * Switching off the convective term leaves the parcel at constant speed: wrong.
   */
  import { onMount } from 'svelte';
  import { useScene } from '../../lib/scene/scene.svelte';
  import { createLoop, cssVar, fitCanvas, onThemeChange } from '../../lib/viz/loop';
  import { formatNumber } from '../../lib/scene/format';
  import VizFrame from './VizFrame.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';
  import TermToggles from '../ui/TermToggles.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('fl-parcel');
  const SIDE = 0.1; // m
  const S = SIDE * SIDE;
  const Vol = SIDE ** 3;

  const grad = $derived(scene.params.grad!);
  const p0 = $derived(scene.params.pmean! * 1000);
  const fLeft = $derived((p0 + (grad * SIDE) / 2) * S);
  const fRight = $derived((p0 - (grad * SIDE) / 2) * S);
  const net = $derived(-grad * Vol);
  const lagrange = $derived(scene.views.frame === 'lagrange');
  const convective = $derived(scene.term('convective'));

  let canvas: HTMLCanvasElement;
  let xp = 0; // parcel position along the channel (fraction)
  let up = 0; // its velocity (fraction / s)
  const U = 0.12;
  const ELL = 0.5;
  const uField = (x: number) => U * (1 + x / ELL);

  function resetParcel() {
    xp = 0;
    up = uField(0);
  }

  function draw() {
    if (!canvas) return;
    const { w, h, dpr } = fitCanvas(canvas);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const ink = cssVar('--color-ink');
    const muted = cssVar('--color-ink-muted');
    const rule = cssVar('--color-rule');
    const cP = cssVar('--color-pressure-pos');
    const cV = cssVar('--color-velocity');
    const num = cssVar('--font-num');
    const narrow = w < 640;
    const leftW = narrow ? w : w * 0.42;
    const topA = 0;
    const hA = narrow ? h * 0.5 : h;

    // Panel A: forces on a parcel.
    const cx = leftW / 2;
    const cy = topA + hA * 0.45;
    const side = Math.min(90, hA * 0.38);
    ctx.fillStyle = cssVar('--color-surface');
    ctx.fillRect(cx - side / 2, cy - side / 2, side, side);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - side / 2, cy - side / 2, side, side);
    const arrow = (x0: number, x1: number, y: number, color: string, width: number) => {
      const d = Math.sign(x1 - x0) || 1;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1 - d * 8, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x1 - d * 11, y - 6);
      ctx.lineTo(x1 - d * 11, y + 6);
      ctx.fill();
    };
    const L = (F: number) => Math.min(leftW * 0.32, (F / 1013) * 60);
    arrow(cx - side / 2 - L(fLeft) - 4, cx - side / 2 - 4, cy, cP, 2.5);
    arrow(cx + side / 2 + L(fRight) + 4, cx + side / 2 + 4, cy, cP, 2.5);
    // Net force, magnified.
    const netLen = Math.max(-leftW * 0.3, Math.min(leftW * 0.3, net * 160));
    if (Math.abs(netLen) > 2) arrow(cx, cx + netLen, cy + side / 2 + 28, ink, 3);
    ctx.font = `13px ${num}`;
    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    ctx.fillText(`${formatNumber(fLeft, 1)} N`, cx - side / 2 - 40, cy - 14);
    ctx.fillText(`${formatNumber(fRight, 1)} N`, cx + side / 2 + 40, cy - 14);
    ctx.fillStyle = ink;
    ctx.fillText(`résultante ${formatNumber(net, 2)} N (flèche × 160)`, cx, cy + side / 2 + 52);

    // Panel B: steady accelerating flow, Eulerian probe vs Lagrangian parcel.
    const bx = narrow ? 16 : leftW + 24;
    const bw = narrow ? w - 32 : w - leftW - 40;
    const by = narrow ? hA + 30 : h * 0.2;
    const bh = narrow ? h - hA - 60 : h * 0.5;
    ctx.strokeStyle = rule;
    ctx.lineWidth = 1;
    // converging channel: walls narrowing as u grows (continuity)
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const x = i / 40;
      const half = bh / 2 / (1 + x / ELL) ** 0.5;
      const X = bx + x * bw;
      if (i === 0) ctx.moveTo(X, by + bh / 2 - half);
      else ctx.lineTo(X, by + bh / 2 - half);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const x = i / 40;
      const half = bh / 2 / (1 + x / ELL) ** 0.5;
      const X = bx + x * bw;
      if (i === 0) ctx.moveTo(X, by + bh / 2 + half);
      else ctx.lineTo(X, by + bh / 2 + half);
    }
    ctx.stroke();
    // velocity field arrows (teal), length ∝ u
    for (let i = 0; i < 6; i++) {
      const x = (i + 0.5) / 6;
      const X = bx + x * bw;
      const len = uField(x) * bw * 0.35;
      arrow(X - len / 2, X + len / 2, by + bh / 2 + (lagrange ? -bh * 0.18 : bh * 0.18), cV, 1.5);
    }
    // probe (Eulerian)
    const probeX = bx + 0.55 * bw;
    ctx.fillStyle = lagrange ? muted : ink;
    ctx.beginPath();
    ctx.moveTo(probeX, by + bh + 4);
    ctx.lineTo(probeX - 6, by + bh + 14);
    ctx.lineTo(probeX + 6, by + bh + 14);
    ctx.fill();
    ctx.font = `13px ${num}`;
    ctx.textAlign = 'center';
    ctx.fillText(
      `sonde : ${formatNumber(uField(0.55) * 10, 2)} m/s, constante`,
      probeX,
      by + bh + 30,
    );
    // parcel (Lagrangian)
    const PX = bx + Math.min(1, xp) * bw;
    ctx.strokeStyle = ink;
    ctx.fillStyle = lagrange ? ink : 'transparent';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(PX - 7, by + bh / 2 - 7, 14, 14);
    if (lagrange) ctx.fill();
    ctx.stroke();
    ctx.fillStyle = lagrange ? ink : muted;
    ctx.fillText(`particule : ${formatNumber(up * 10, 2)} m/s`, PX, by - 8);
  }

  onMount(() => {
    resetParcel();
    const loop = createLoop(
      canvas,
      (dt0) => {
        const dt = dt0 * (scene.slow ? 0.25 : 1);
        // Du/Dt = ∂u/∂t + u ∂u/∂x, with ∂u/∂t = 0 (steady flow).
        const acc = convective ? up * (U / ELL) : 0;
        up += acc * dt;
        xp += up * dt;
        if (xp > 1.05) resetParcel();
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
    void [grad, p0, lagrange, convective, scene.epoch];
    if (scene.epoch) resetParcel();
    draw();
  });
</script>

<VizFrame
  scene="fl-parcel"
  {...number ? { number } : {}}
  {title}
  note="cube d'air de 10 cm de côté"
>
  <canvas bind:this={canvas} class="parcel" role="img" aria-label={alt}></canvas>
  {#snippet controls()}
    <SymbolSlider scene="fl-parcel" param="grad" />
    <SymbolSlider scene="fl-parcel" param="pmean" />
    <ViewToggle scene="fl-parcel" view="frame" />
    <TermToggles scene="fl-parcel" />
  {/snippet}
</VizFrame>

<style>
  .parcel {
    display: block;
    width: 100%;
    height: 300px;
  }
  @media (max-width: 640px) {
    .parcel {
      height: 480px;
    }
  }
</style>
