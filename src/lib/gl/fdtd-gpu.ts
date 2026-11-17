/**
 * GPU implementation of `stepFdtd2D` (src/lib/physics/fdtd2d.ts): same leapfrog
 * scheme, same mirrored rigid walls, same optional damping. State texture: R = p^n,
 * G = p^{n−1}. One render pass per time step, ping-pong between two textures.
 */
import { FULLSCREEN_VS, floatTarget, fullscreenQuad, program, texture2D } from './gl';

const STEP_FS = `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform ivec2 u_size;
uniform float u_c2;
uniform float u_keep;
uniform int u_npulses;
uniform vec4 u_pulses[8]; // x, y (cells), amplitude, width
out vec4 o;
float P(ivec2 c) {
  // Node-centred Neumann wall: p_{-1} = p_1.
  c = abs(c);
  c = min(c, 2 * (u_size - 1) - c);
  return texelFetch(u_state, c, 0).r;
}
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec2 s = texelFetch(u_state, c, 0).rg;
  float lap = P(c + ivec2(1, 0)) + P(c - ivec2(1, 0)) + P(c + ivec2(0, 1)) + P(c - ivec2(0, 1)) - 4.0 * s.r;
  float next = u_keep * (2.0 * s.r - s.g + u_c2 * lap);
  float curr = s.r;
  for (int i = 0; i < 8; i++) {
    if (i >= u_npulses) break;
    vec2 d = vec2(c) - u_pulses[i].xy;
    float a = u_pulses[i].z * exp(-dot(d, d) / (2.0 * u_pulses[i].w * u_pulses[i].w));
    next += a;
    curr += a;
  }
  o = vec4(next, curr, 0.0, 1.0);
}`;

export interface GpuFdtd {
  readonly nx: number;
  readonly ny: number;
  readonly precision: 'float32' | 'float16';
  /** Texture holding the current field in its R channel. */
  readonly texture: () => WebGLTexture;
  step(n?: number): void;
  pulse(x: number, y: number, amplitude: number, width: number): void;
  /** Read back p^n (float32 targets only; used by tests). */
  read(): Float32Array | null;
  /** Upload p^n and p^{n−1}. */
  upload(curr: Float32Array, prev: Float32Array): void;
  dispose(): void;
}

export function createGpuFdtd(
  gl: WebGL2RenderingContext,
  nx: number,
  ny: number,
  courant: number,
  damping = 0,
): GpuFdtd | null {
  const target = floatTarget(gl);
  if (!target) return null;
  const prog = program(gl, FULLSCREEN_VS, STEP_FS);
  const vao = fullscreenQuad(gl);
  const tex = [0, 1].map(() => texture2D(gl, nx, ny, target.internal, gl.RG, gl.FLOAT));
  const fbo = tex.map((t) => {
    const f = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return f;
  });
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return null;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  let cur = 0;
  let pending: number[][] = [];
  const loc = (n: string) => gl.getUniformLocation(prog, n);
  const u = {
    state: loc('u_state'),
    size: loc('u_size'),
    c2: loc('u_c2'),
    keep: loc('u_keep'),
    n: loc('u_npulses'),
    pulses: loc('u_pulses'),
  };
  return {
    nx,
    ny,
    precision: target.precision,
    texture: () => tex[cur]!,
    pulse(x, y, a, w) {
      if (pending.length < 8) pending.push([x, y, a, w]);
    },
    step(n = 1) {
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.viewport(0, 0, nx, ny);
      gl.uniform2i(u.size, nx, ny);
      gl.uniform1f(u.c2, courant * courant);
      gl.uniform1f(u.keep, 1 - damping);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(u.state, 0);
      for (let i = 0; i < n; i++) {
        const flat = new Float32Array(32);
        pending.forEach((p, k) => flat.set(p, 4 * k));
        gl.uniform1i(u.n, pending.length);
        gl.uniform4fv(u.pulses, flat);
        pending = [];
        gl.bindTexture(gl.TEXTURE_2D, tex[cur]!);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[1 - cur]!);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        cur = 1 - cur;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindVertexArray(null);
    },
    read() {
      if (target.precision !== 'float32') return null;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[cur]!);
      const out = new Float32Array(nx * ny * 4);
      gl.readPixels(0, 0, nx, ny, gl.RGBA, gl.FLOAT, out);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const r = new Float32Array(nx * ny);
      for (let i = 0; i < nx * ny; i++) r[i] = out[4 * i]!;
      return r;
    },
    upload(curr, prev) {
      const data = new Float32Array(nx * ny * 2);
      for (let i = 0; i < nx * ny; i++) {
        data[2 * i] = curr[i]!;
        data[2 * i + 1] = prev[i]!;
      }
      gl.bindTexture(gl.TEXTURE_2D, tex[cur]!);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, nx, ny, gl.RG, gl.FLOAT, data);
    },
    dispose() {
      tex.forEach((t) => gl.deleteTexture(t));
      fbo.forEach((f) => gl.deleteFramebuffer(f));
      gl.deleteProgram(prog);
    },
  };
}
