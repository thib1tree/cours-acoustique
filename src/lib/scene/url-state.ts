/**
 * Scene state encoded in the URL query: ?<sceneId>=key:value;key:value
 * Only values that differ from their defaults are written, so links stay short.
 */
import type { SceneSpec } from './types';

export interface SerializableState {
  params: Record<string, number>;
  terms: Record<string, boolean>;
  views: Record<string, string>;
}

export function encodeState(spec: SceneSpec, s: SerializableState): string {
  const parts: string[] = [];
  for (const p of spec.params)
    if (s.params[p.key] !== p.default) parts.push(`${p.key}:${s.params[p.key]}`);
  for (const t of spec.terms ?? []) if (s.terms[t.key] === false) parts.push(`${t.key}:off`);
  for (const v of spec.views ?? [])
    if (s.views[v.key] !== v.default) parts.push(`${v.key}:${s.views[v.key]}`);
  return parts.join(';');
}

export function decodeState(spec: SceneSpec, raw: string | null): Partial<SerializableState> {
  const out: SerializableState = { params: {}, terms: {}, views: {} };
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const [k, v] = part.split(':');
    if (!k || v === undefined) continue;
    const p = spec.params.find((x) => x.key === k);
    if (p) {
      const n = Number(v);
      if (Number.isFinite(n)) out.params[k] = Math.min(p.max, Math.max(p.min, n));
      continue;
    }
    if (spec.terms?.some((x) => x.key === k)) {
      out.terms[k] = v !== 'off';
      continue;
    }
    const view = spec.views?.find((x) => x.key === k);
    if (view?.options.some((o) => o.key === v)) out.views[k] = v;
  }
  return out;
}
