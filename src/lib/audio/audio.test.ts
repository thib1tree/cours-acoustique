import { describe, expect, it } from 'vitest';
import { DEFAULT_MASTER_DB, dbToGain, softClipCurve } from './engine';
import { FORMANTS_A, scaleFormants } from './synth/voice';

describe('audio safety', () => {
  it('default master gain is low (≤ −20 dB)', () => {
    expect(DEFAULT_MASTER_DB).toBeLessThanOrEqual(-20);
    expect(dbToGain(-20)).toBeCloseTo(0.1, 12);
  });
  it('soft clipper never exceeds ±1 and is odd', () => {
    const c = softClipCurve(1001);
    expect(Math.max(...c)).toBeLessThanOrEqual(1);
    expect(Math.min(...c)).toBeGreaterThanOrEqual(-1);
    expect(c[500]).toBeCloseTo(0, 12);
    expect(c[0]).toBeCloseTo(-c[1000]!, 12);
  });
});

describe('helium voice', () => {
  it('formants scale with the sound-speed ratio, pitch does not depend on it', () => {
    expect(scaleFormants(1)).toEqual(FORMANTS_A.map((f) => f.f));
    expect(scaleFormants(2)[0]).toBe(2 * FORMANTS_A[0].f);
  });
});
