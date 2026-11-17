import { test, expect } from '@playwright/test';

// The home-page GPU solver must match the CPU reference (src/lib/physics/fdtd2d.ts),
// which is itself tested against analytic cavity modes. Tolerance: float32 round-off.
test('GPU leapfrog solver matches the CPU reference', async ({ page }, info) => {
  test.skip(info.project.name !== 'laptop', 'run once');
  await page.goto('lab/');
  const r = await page.waitForFunction(
    () => (window as unknown as { __gpuCpu?: unknown }).__gpuCpu,
    undefined,
    { timeout: 20_000 },
  );
  const v = (await r.jsonValue()) as { maxAbsDiff?: number; maxAbs?: number; error?: string };
  test.skip(!!v.error, `no float render target: ${v.error}`);
  expect(v.maxAbs!).toBeGreaterThan(0.01);
  expect(v.maxAbsDiff! / v.maxAbs!).toBeLessThan(1e-4);
});
