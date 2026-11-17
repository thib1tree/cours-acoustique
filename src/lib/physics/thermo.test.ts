import { describe, expect, it } from 'vitest';
import {
  AIR_THERMAL_DIFFUSIVITY as D,
  diffusionToWavelength,
  isothermalCrossover,
  thermalDiffusionLength,
} from './thermo';

describe('adiabatic vs isothermal', () => {
  it('in the audio band the diffusion length is tiny compared to λ (≈ 1e-3 at 20 kHz)', () => {
    expect(diffusionToWavelength(D, 343, 20_000)).toBeLessThan(2e-3);
  });
  it('δ/λ grows as √f (adiabatic is a LOW-frequency approximation)', () => {
    const r = diffusionToWavelength(D, 343, 4000) / diffusionToWavelength(D, 343, 1000);
    expect(r).toBeCloseTo(2, 12);
  });
  it('crossover f* = c₀²/(4πD) is of order 0.1–1 GHz in air', () => {
    const f = isothermalCrossover(D, 343);
    expect(f).toBeGreaterThan(1e8);
    expect(f).toBeLessThan(1e9);
    expect(thermalDiffusionLength(D, 2 * Math.PI * f)).toBeCloseTo(343 / (2 * Math.PI * f), 15);
  });
});
