/**
 * Course-map layout: layered DAG (Sugiyama-style). Depth = longest prerequisite chain;
 * order inside a layer by barycenter sweeps to reduce crossings.
 */
export interface DagNode {
  readonly id: string;
  readonly requires: readonly string[];
}

export function depths(nodes: readonly DagNode[]): Map<string, number> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const d = new Map<string, number>();
  const visiting = new Set<string>();
  const visit = (id: string): number => {
    const known = d.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) throw new Error(`cycle through "${id}"`);
    visiting.add(id);
    const n = byId.get(id);
    if (!n) throw new Error(`unknown prerequisite "${id}"`);
    const v = n.requires.length ? 1 + Math.max(...n.requires.map(visit)) : 0;
    visiting.delete(id);
    d.set(id, v);
    return v;
  };
  for (const n of nodes) visit(n.id);
  return d;
}

export function layers(nodes: readonly DagNode[], sweeps = 8): string[][] {
  const d = depths(nodes);
  const L: string[][] = [];
  for (const n of nodes) (L[d.get(n.id)!] ??= []).push(n.id);
  const req = new Map(nodes.map((n) => [n.id, n.requires]));
  const children = new Map<string, string[]>();
  for (const n of nodes)
    for (const r of n.requires) (children.get(r) ?? children.set(r, []).get(r)!).push(n.id);
  const pos = () => {
    const m = new Map<string, number>();
    L.forEach((layer) => layer.forEach((id, i) => m.set(id, i)));
    return m;
  };
  const mean = (ids: readonly string[], p: Map<string, number>, fallback: number) =>
    ids.length ? ids.reduce((s, id) => s + p.get(id)!, 0) / ids.length : fallback;
  for (let it = 0; it < sweeps; it++) {
    for (let k = 1; k < L.length; k++) {
      const p = pos();
      L[k]!.sort((a, b) => mean(req.get(a)!, p, p.get(a)!) - mean(req.get(b)!, p, p.get(b)!));
    }
    for (let k = L.length - 2; k >= 0; k--) {
      const p = pos();
      L[k]!.sort(
        (a, b) =>
          mean(children.get(a) ?? [], p, p.get(a)!) - mean(children.get(b) ?? [], p, p.get(b)!),
      );
    }
  }
  return L;
}

/** Topological order of the prerequisites of `target` not yet done (target last). */
export function missingPath(
  nodes: readonly DagNode[],
  target: string,
  done: ReadonlySet<string>,
): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: string[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id) || done.has(id)) return;
    seen.add(id);
    for (const r of byId.get(id)?.requires ?? []) visit(r);
    out.push(id);
  };
  visit(target);
  return out;
}
