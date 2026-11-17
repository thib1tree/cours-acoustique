<script lang="ts">
  /**
   * Test hook (lab page only): runs the same initial state through the GPU shader and
   * the CPU reference `stepFdtd2D`, and publishes the max difference on window for the
   * Playwright test (tests/e2e/gpu-solver.spec.ts).
   */
  import { onMount } from 'svelte';
  import { createGpuFdtd } from '../../lib/gl/fdtd-gpu';
  import { addPulse, createFdtd2D, stepFdtd2D } from '../../lib/physics/fdtd2d';

  let result = $state('en cours');
  onMount(() => {
    const w = window as unknown as {
      __gpuCpu?: { maxAbsDiff: number; maxAbs: number; precision: string } | { error: string };
    };
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    const g = { nx: 64, ny: 48, courant: 0.5 };
    const sim = gl ? createGpuFdtd(gl, g.nx, g.ny, g.courant) : null;
    if (!sim) {
      w.__gpuCpu = { error: 'no float render target' };
      result = 'indisponible';
      return;
    }
    const s = createFdtd2D(g);
    addPulse(g, s, 20, 20, 1, 2);
    addPulse(g, s, 45, 30, -0.7, 3);
    sim.upload(s.curr, s.prev);
    stepFdtd2D(g, s, 120);
    sim.step(120);
    const gpu = sim.read();
    if (!gpu) {
      w.__gpuCpu = { error: 'readback unavailable' };
      return;
    }
    let maxAbsDiff = 0;
    let maxAbs = 0;
    for (let i = 0; i < gpu.length; i++) {
      maxAbsDiff = Math.max(maxAbsDiff, Math.abs(gpu[i]! - s.curr[i]!));
      maxAbs = Math.max(maxAbs, Math.abs(s.curr[i]!));
    }
    w.__gpuCpu = { maxAbsDiff, maxAbs, precision: sim.precision };
    result = `écart max ${maxAbsDiff.toExponential(2)} (amplitude ${maxAbs.toFixed(3)}, ${sim.precision})`;
  });
</script>

<p class="ui muted">
  Solveur GPU contre référence CPU : <span data-testid="gpu-cpu">{result}</span>
</p>
