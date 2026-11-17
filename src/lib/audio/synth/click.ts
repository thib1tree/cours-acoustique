/** Short band-limited "thump" played when the reader creates a pulse on the home field. */
import { audio } from '../engine';

let noise: AudioBuffer | null = null;

export async function playPulse(pitch = 1): Promise<void> {
  const ctx = await audio.start();
  if (!noise) {
    noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.25), ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
  }
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 180 * pitch;
  bp.Q.value = 4;
  const g = ctx.createGain();
  g.gain.value = 1.2;
  src.connect(bp).connect(g).connect(audio.input);
  src.start();
}
