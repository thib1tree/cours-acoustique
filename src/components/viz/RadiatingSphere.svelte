<script lang="ts">
  /**
   * Chapter 4, D1: the pulsating sphere. Top: pressure and particle velocity along a radius
   * (instantaneous, with their envelopes). Near a small sphere the velocity is large and a
   * quarter period ahead of the pressure: air is pushed aside, not compressed. Switching
   * off the near-field term changes the velocity but not the active intensity.
   * Bottom: radiation resistance and reactance versus ka, sphere and baffled piston.
   */
  import { onMount } from 'svelte';
  import { useScene } from '../../lib/scene/scene.svelte';
  import { createLoop, cssVar, fitCanvas, onThemeChange } from '../../lib/viz/loop';
  import { formatNumber } from '../../lib/scene/format';
  import { abs, mul, type Complex } from '../../lib/physics/complex';
  import {
    pistonImpedance,
    sphereImpedance,
    sphericalAdmittance,
    spherePressure,
  } from '../../lib/physics/radiation';
  import VizFrame from './VizFrame.svelte';
  import Plot, { type Series } from './Plot.svelte';
  import SymbolSlider from '../ui/SymbolSlider.svelte';
  import TermToggles from '../ui/TermToggles.svelte';
  import ViewToggle from '../ui/ViewToggle.svelte';

  let { number, title, alt }: { number?: string; title: string; alt: string } = $props();
  const scene = useScene('4-sphere');
  let canvas: HTMLCanvasElement;
  let phase = 0;

  const ka = $derived(scene.params.ka!);
  const near = $derived(scene.term('near'));
  const comp = $derived(scene.views.scale !== 'raw');
  const Z = $derived(sphereImpedance(ka));
  // Surface velocity seen through the chosen p–v relation (equals U when the term is on).
  const vSurf = $derived(mul(Z, sphericalAdmittance(ka, near)));
  const active = $derived(Z[0]); // ½Re{p v*} / (½ρ₀c₀U²), unchanged by the near term
  const reactive = $derived(near ? -Z[1] : 0);

  const KA = Array.from({ length: 240 }, (_, i) => 0.05 * 200 ** (i / 239));
  const curve = (f: (x: number) => number) => KA.map((x) => [x, f(x)] as const);
  const series: Series[] = [
    { points: curve((x) => sphereImpedance(x)[0]), color: 'var(--color-energy)', width: 2 },
    { points: curve((x) => -sphereImpedance(x)[1]), color: 'var(--color-ink)', width: 2 },
    {
      points: curve((x) => pistonImpedance(x)[0]),
      color: 'var(--color-energy)',
      width: 1.5,
      dash: '5 4',
    },
    {
      points: curve((x) => -pistonImpedance(x)[1]),
      color: 'var(--color-ink)',
      width: 1.5,
      dash: '5 4',
    },
  ];
  const markers = $derived([
    { x: ka, y: Z[0], color: 'var(--color-energy)', r: 5 },
    { x: ka, y: -Z[1], color: 'var(--color-ink)', r: 5 },
  ]);

  function draw() {
    if (!canvas) return;
    const { w, h, dpr } = fitCanvas(canvas);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const muted = cssVar('--color-ink-muted');
    const rule = cssVar('--color-rule');
    const cP = cssVar('--color-pressure-pos');
    const cV = cssVar('--color-velocity');
    const sans = cssVar('--font-sans');
    const num = cssVar('--font-num');
    const X0 = 16;
    const X1 = w - 16;
    const mid = h * 0.5;
    const krMax = ka + 4 * Math.PI;
    const sx = (kr: number) => X0 + (kr / krMax) * (X1 - X0);
    // the sphere
    ctx.fillStyle = rule;
    ctx.fillRect(X0, 14, sx(ka) - X0, h - 40);
    ctx.fillStyle = muted;
    ctx.font = `12px ${sans}`;
    ctx.textAlign = 'left';
    if (sx(ka) - X0 > 52) ctx.fillText('sphère', X0 + 6, 30);
    // kr = 1 boundary
    if (1 > ka) {
      ctx.strokeStyle = muted;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(sx(1), 14);
      ctx.lineTo(sx(1), h - 26);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText('kr = 1', sx(1) + 4, 30);
    }
    // axis
    ctx.strokeStyle = rule;
    ctx.beginPath();
    ctx.moveTo(X0, mid);
    ctx.lineTo(X1, mid);
    ctx.stroke();
    ctx.fillStyle = muted;
    ctx.font = `12px ${num}`;
    ctx.textAlign = 'center';
    for (let n = 0; n <= 2; n++) {
      const x = sx(ka + 2 * Math.PI * n);
      ctx.fillRect(x, h - 26, 1, 5);
      ctx.fillText(n === 0 ? 'a' : `a + ${n}λ`, x, h - 8);
    }
    const N = 400;
    const P: Complex[] = [];
    const V: Complex[] = [];
    for (let i = 0; i <= N; i++) {
      const kr = ka + ((krMax - ka) * i) / N;
      const p = spherePressure(ka, kr);
      P.push(p);
      V.push(mul(p, sphericalAdmittance(kr, near)));
    }
    if (comp) {
      // remove the spherical spreading: multiply by r/a
      for (let i = 0; i <= N; i++) {
        const g = (ka + ((krMax - ka) * i) / N) / ka;
        P[i] = mul(P[i]!, [g, 0]);
        V[i] = mul(V[i]!, [g, 0]);
      }
    }
    let m = 1e-9;
    for (let i = 0; i <= N; i++) m = Math.max(m, abs(P[i]!), abs(V[i]!));
    const amp = (h * 0.38) / m;
    const c = Math.cos(phase);
    const s = Math.sin(phase);
    const line = (arr: Complex[], col: string, width: number, env = false) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = width;
      if (env) {
        ctx.setLineDash([2, 4]);
        for (const sg of [1, -1]) {
          ctx.beginPath();
          arr.forEach((z, i) => {
            const x = sx(ka + ((krMax - ka) * i) / N);
            const y = mid - sg * abs(z) * amp;
            if (i) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
          });
          ctx.stroke();
        }
        ctx.setLineDash([]);
        return;
      }
      ctx.beginPath();
      arr.forEach((z, i) => {
        const x = sx(ka + ((krMax - ka) * i) / N);
        const y = mid - (z[0] * c + z[1] * s) * amp;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.stroke();
    };
    line(P, cP, 1, true);
    line(V, cV, 1, true);
    line(P, cP, 2.5);
    line(V, cV, 2);
    ctx.lineWidth = 1;
  }

  onMount(() => {
    const loop = createLoop(
      canvas,
      (dt) => {
        phase = (phase + dt * 2 * Math.PI * 0.5 * (scene.slow ? 0.25 : 1)) % (2 * Math.PI);
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
    void [ka, near, comp];
    draw();
  });
</script>

<VizFrame
  scene="4-sphere"
  {...number ? { number } : {}}
  {title}
  note="sphère de rayon a, vitesse de surface U ; échelle verticale ajustée à la plus grande amplitude"
>
  <canvas bind:this={canvas} class="radial" role="img" aria-label={alt}></canvas>
  <div class="readout num" aria-live="polite">
    <span>à la surface : |p| = <b>{formatNumber(abs(Z), 3)} ρ₀c₀U</b></span>
    <span
      >avance de p sur v <b
        >{formatNumber(
          ((Math.atan2(vSurf[1], vSurf[0]) - Math.atan2(Z[1], Z[0])) * 180) / Math.PI,
          0,
        )}°</b
      ></span
    >
    <span>intensité active <b>{formatNumber(active, 3)}</b></span>
    <span>intensité réactive <b>{formatNumber(reactive, 3)}</b> <small>(× ½ρ₀c₀U²)</small></span>
  </div>
  <div class="pad">
    <p class="ylab">impédance de rayonnement / ρ₀c₀ (par unité de surface)</p>
    <Plot
      x={{ min: 0.05, max: 10, log: true, label: 'ka' }}
      y={{ min: 0, max: 1.2 }}
      {series}
      {markers}
      height={200}
      ariaLabel="Résistance et réactance de rayonnement en fonction de ka, pour la sphère et pour le piston bafflé."
    />
  </div>
  {#snippet legend()}
    <div class="keys">
      <span class="key"><i style:background="var(--color-pressure-pos)"></i>pression</span>
      <span class="key"><i style:background="var(--color-velocity)"></i>vitesse × ρ₀c₀</span>
      <span class="key"><i style:background="var(--color-energy)"></i>résistance</span>
      <span class="key"><i style:background="var(--color-ink)"></i>réactance (masse)</span>
      <span class="key"><i class="dash"></i>piston bafflé</span>
    </div>
  {/snippet}
  {#snippet controls()}
    <SymbolSlider scene="4-sphere" param="ka" />
    <TermToggles scene="4-sphere" />
    <ViewToggle scene="4-sphere" view="scale" />
  {/snippet}
</VizFrame>

<style>
  .radial {
    display: block;
    width: 100%;
    height: 240px;
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
  .pad {
    padding-top: var(--space-3);
  }
  .ylab {
    margin: 0 0 var(--space-1);
    font-family: var(--font-sans);
    font-size: 0.8125rem;
    color: var(--color-ink-muted);
  }
  .keys {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
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
      var(--color-ink-muted) 0 3px,
      transparent 3px 7px
    );
  }
</style>
