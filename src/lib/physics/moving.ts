/**
 * Chapter 5: sources and observers moving through a medium at rest (subsonic unless
 * stated). M = V/c₀. Angles θ are measured between the velocity of the moving body and
 * the line joining source and observer at the emission time, pointing towards the
 * observer for a moving source.
 */

/** Frequency heard from a source moving at Mach M: f/(1 − M cos θ). */
export const dopplerSource = (f: number, M: number, cosTheta: number): number =>
  f / (1 - M * cosTheta);

/** Frequency heard by an observer moving at Mach M towards the source (cos θ = 1): f(1 + M cos θ). */
export const dopplerObserver = (f: number, M: number, cosTheta: number): number =>
  f * (1 + M * cosTheta);

/** Half-angle of the Mach cone, sin α = 1/M (M > 1), or null. */
export const machAngle = (M: number): number | null => (M > 1 ? Math.asin(1 / M) : null);

/**
 * Far-field pressure amplitude of a moving monopole (volume source) relative to the same
 * source at rest, at the same emission distance: 1/(1 − M cos θ)². One factor comes from
 * the Doppler compression of time (the received signal is faster, hence its derivative
 * larger), the other from the moving-source potential (Liénard–Wiechert form).
 */
export const convectiveFactor = (M: number, cosTheta: number): number =>
  1 / (1 - M * cosTheta) ** 2;

export interface PassByPoint {
  /** emission time (s); t = 0 when the source is closest */
  tEmit: number;
  /** emission distance R (m) */
  R: number;
  /** cos θ at emission */
  cosTheta: number;
}

/**
 * Straight pass-by: source on the x axis, x_s = V t′; observer at (0, d). For the
 * reception time t, solve c₀(t − t′) = √((V t′)² + d²) for the emission time t′ < t.
 */
export function passBy(t: number, V: number, d: number, c: number): PassByPoint {
  const a = c * c - V * V;
  const b = c * c * t;
  const disc = b * b - a * (c * c * t * t - d * d);
  const tEmit = (b - Math.sqrt(disc)) / a;
  const R = c * (t - tEmit);
  return { tEmit, R, cosTheta: (-V * tEmit) / R };
}

/**
 * Received signal of a pass-by, sampled at `rate` over [t0, t0 + duration]: a periodic
 * waveform `wave(phase)` (phase in cycles) emitted at f₀, with optional Doppler, spherical
 * spreading and convective amplification (each can be switched off).
 */
export function renderPassBy(
  opts: {
    V: number;
    d: number;
    c: number;
    f0: number;
    t0: number;
    duration: number;
    rate: number;
    wave: (cycles: number) => number;
  },
  terms = { doppler: true, spreading: true, convective: true },
): Float32Array {
  const { V, d, c, f0, t0, duration, rate, wave } = opts;
  const n = Math.round(duration * rate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = t0 + i / rate;
    const p = passBy(t, V, d, c);
    // Without Doppler the waveform is read at the reception time (no compression).
    const cycles = f0 * (terms.doppler ? p.tEmit : t - d / c);
    let amp = terms.spreading ? d / p.R : 1;
    if (terms.convective) amp *= convectiveFactor(V / c, p.cosTheta);
    out[i] = amp * wave(cycles);
  }
  return out;
}
