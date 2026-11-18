/** In-place radix-2 complex FFT (n a power of two). sign = −1 forward, +1 inverse (unscaled). */
export function fft(re: Float64Array, im: Float64Array, sign: 1 | -1 = -1): void {
  const n = re.length;
  if (n & (n - 1)) throw new RangeError('fft length must be a power of two');
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (sign * 2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b]! * cr - im[b]! * ci;
        const ti = re[b]! * ci + im[b]! * cr;
        re[b] = re[a]! - tr;
        im[b] = im[a]! - ti;
        re[a] = re[a]! + tr;
        im[a] = im[a]! + ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

/** Small deterministic PRNG (mulberry32), so that a given figure always sounds the same. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Periodic noise of n samples (n a power of two) whose amplitude spectrum is `amp(f)`
 * (random phases): it loops without a seam. Used to let the reader hear a transfer
 * function computed by the physics (diffraction, scattering).
 */
export function shapedNoise(
  n: number,
  rate: number,
  amp: (f: number) => number,
  seed = 1,
): Float32Array {
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const rnd = mulberry32(seed);
  for (let k = 1; k < n / 2; k++) {
    const f = (k * rate) / n;
    const a = amp(f);
    const ph = 2 * Math.PI * rnd();
    re[k] = a * Math.cos(ph);
    im[k] = a * Math.sin(ph);
    re[n - k] = re[k]!;
    im[n - k] = -im[k]!;
  }
  fft(re, im, 1);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = re[i]!;
  return out;
}

const nextPow2 = (n: number) => 2 ** Math.ceil(Math.log2(Math.max(2, n)));

/** Linear convolution of two real signals by FFT. */
export function convolve(a: Float32Array, b: Float32Array): Float32Array {
  const n = nextPow2(a.length + b.length - 1);
  const ar = new Float64Array(n);
  const ai = new Float64Array(n);
  const br = new Float64Array(n);
  const bi = new Float64Array(n);
  ar.set(a);
  br.set(b);
  fft(ar, ai, -1);
  fft(br, bi, -1);
  for (let k = 0; k < n; k++) {
    const re = ar[k]! * br[k]! - ai[k]! * bi[k]!;
    const im = ar[k]! * bi[k]! + ai[k]! * br[k]!;
    ar[k] = re;
    ai[k] = im;
  }
  fft(ar, ai, 1);
  const out = new Float32Array(a.length + b.length - 1);
  for (let i = 0; i < out.length; i++) out[i] = ar[i]! / n;
  return out;
}
