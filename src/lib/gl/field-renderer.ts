/**
 * Draws a scalar field through a colormap LUT. Two sources:
 *  - 'texture': an external texture whose R channel is the field (GPU solver);
 *  - 'phasor': a complex field P(x, y) uploaded once (RG = Re, Im), animated as
 *    Re{P e^{−iωt}} = Re P cos ωt + Im P sin ωt in the shader (no CPU work per frame).
 */
import { FULLSCREEN_VS, fullscreenQuad, lutTexture, program, texture2D } from './gl';

const DRAW_FS = `#version 300 es
precision highp float;
uniform sampler2D u_field;
uniform sampler2D u_lut;
uniform int u_mode;     // 0: R channel, 1: phasor
uniform float u_phase;  // ωt
uniform float u_scale;  // field value mapped to the ends of the colormap
in vec2 v_uv;
out vec4 o;
void main() {
  vec2 f = texture(u_field, v_uv).rg;
  float v = u_mode == 0 ? f.r : f.r * cos(u_phase) + f.g * sin(u_phase);
  float x = clamp(0.5 + 0.5 * v / u_scale, 0.0, 1.0);
  // Sample texel centres of the LUT.
  float n = float(textureSize(u_lut, 0).x);
  o = vec4(texture(u_lut, vec2((x * (n - 1.0) + 0.5) / n, 0.5)).rgb, 1.0);
}`;

export interface FieldRenderer {
  setLut(rgba: Uint8Array): void;
  /** Upload a complex field (re, im interleaved), size nx × ny. */
  setPhasor(nx: number, ny: number, reim: Float32Array): void;
  draw(opts: {
    source: 'texture' | 'phasor';
    texture?: WebGLTexture;
    phase?: number;
    scale: number;
    width: number;
    height: number;
  }): void;
  dispose(): void;
}

export function createFieldRenderer(gl: WebGL2RenderingContext): FieldRenderer {
  const prog = program(gl, FULLSCREEN_VS, DRAW_FS);
  const vao = fullscreenQuad(gl);
  let lut: WebGLTexture | null = null;
  let phasor: WebGLTexture | null = null;
  const loc = (n: string) => gl.getUniformLocation(prog, n);
  const u = {
    field: loc('u_field'),
    lut: loc('u_lut'),
    mode: loc('u_mode'),
    phase: loc('u_phase'),
    scale: loc('u_scale'),
  };
  return {
    setLut(rgba) {
      if (lut) gl.deleteTexture(lut);
      lut = lutTexture(gl, rgba);
    },
    setPhasor(nx, ny, reim) {
      if (phasor) gl.deleteTexture(phasor);
      phasor = texture2D(gl, nx, ny, gl.RG16F, gl.RG, gl.FLOAT, reim, gl.LINEAR);
    },
    draw({ source, texture, phase = 0, scale, width, height }) {
      const field = source === 'phasor' ? phasor : texture;
      if (!field || !lut) return;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, width, height);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, field);
      // Solver textures are NEAREST (exact for the scheme); smooth them for display.
      if (source === 'texture') {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }
      gl.uniform1i(u.field, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, lut);
      gl.uniform1i(u.lut, 1);
      gl.uniform1i(u.mode, source === 'phasor' ? 1 : 0);
      gl.uniform1f(u.phase, phase);
      gl.uniform1f(u.scale, scale);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (source === 'texture') {
        gl.bindTexture(gl.TEXTURE_2D, field);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      }
      gl.bindVertexArray(null);
    },
    dispose() {
      if (lut) gl.deleteTexture(lut);
      if (phasor) gl.deleteTexture(phasor);
      gl.deleteProgram(prog);
    },
  };
}
