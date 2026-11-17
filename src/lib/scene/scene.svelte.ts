/**
 * Reactive scene shared by every island that names the same scene id.
 *
 * Astro hydrates islands independently, but they import the same ES module, so a
 * module-level registry gives them one shared object: a slider in the text, an
 * equation in a margin note and a canvas in the bench all stay in sync.
 */
import type { SceneSpec } from './types';
import { decodeState, encodeState } from './url-state';
import { SCENES } from '../../scenes';

export class Scene {
  readonly spec: SceneSpec;
  params: Record<string, number> = $state({});
  terms: Record<string, boolean> = $state({});
  views: Record<string, string> = $state({});
  /** Term or element currently hovered/touched (equation ↔ visualization link). */
  hovered: string | null = $state(null);
  playing = $state(true);
  slow = $state(false);
  /** True while a slider is being dragged: heavy views may lower their resolution. */
  dragging = $state(false);
  /** Incremented on reset so animations can restart their clock. */
  epoch = $state(0);

  constructor(spec: SceneSpec) {
    this.spec = spec;
    this.applyDefaults();
    if (typeof window !== 'undefined') {
      const fromUrl = decodeState(spec, new URLSearchParams(location.search).get(spec.id));
      Object.assign(this.params, fromUrl.params);
      Object.assign(this.terms, fromUrl.terms);
      Object.assign(this.views, fromUrl.views);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) this.playing = false;
    }
  }

  private applyDefaults(): void {
    for (const p of this.spec.params) this.params[p.key] = p.default;
    for (const t of this.spec.terms ?? []) this.terms[t.key] = true;
    for (const v of this.spec.views ?? []) this.views[v.key] = v.default;
  }

  param(key: string): number {
    const v = this.params[key];
    if (v === undefined) throw new Error(`scene ${this.spec.id}: unknown parameter ${key}`);
    return v;
  }

  term(key: string): boolean {
    return this.terms[key] ?? true;
  }

  /** Apply a preset (from a bench step, a quiz, a link). */
  apply(preset: {
    params?: Record<string, number>;
    terms?: Record<string, boolean>;
    views?: Record<string, string>;
  }): void {
    if (preset.params) Object.assign(this.params, preset.params);
    if (preset.terms) Object.assign(this.terms, preset.terms);
    if (preset.views) Object.assign(this.views, preset.views);
  }

  reset(): void {
    this.applyDefaults();
    this.hovered = null;
    this.epoch++;
  }

  /** Shareable URL reproducing this exact configuration. */
  shareUrl(): string {
    const url = new URL(location.href);
    const encoded = encodeState(this.spec, {
      params: this.params,
      terms: this.terms,
      views: this.views,
    });
    if (encoded) url.searchParams.set(this.spec.id, encoded);
    else url.searchParams.delete(this.spec.id);
    return url.toString();
  }
}

const registry = new Map<string, Scene>();

/** Get (or create) the shared scene with this id. */
export function useScene(id: string): Scene {
  let s = registry.get(id);
  if (!s) {
    const spec = SCENES[id];
    if (!spec) throw new Error(`unknown scene "${id}" (declare it in src/scenes/)`);
    s = new Scene(spec);
    registry.set(id, s);
  }
  return s;
}
