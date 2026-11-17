import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CURRICULUM } from '../../content/curriculum';
import { depths, layers, missingPath } from './layout';

describe('course map layout', () => {
  it('the curriculum is a DAG and every prerequisite exists', () => {
    expect(() => depths(CURRICULUM)).not.toThrow();
  });
  it('every edge goes strictly forward in depth', () => {
    const d = depths(CURRICULUM);
    for (const n of CURRICULUM)
      for (const r of n.requires) expect(d.get(r)!).toBeLessThan(d.get(n.id)!);
  });
  it('layers contain every node exactly once', () => {
    expect(layers(CURRICULUM).flat().sort()).toEqual(CURRICULUM.map((n) => n.id).sort());
  });
  it('missing path lists prerequisites before the target, skipping done ones', () => {
    const p = missingPath(CURRICULUM, 'rayonnement', new Set(['fluides']));
    expect(p.at(-1)).toBe('rayonnement');
    expect(p).not.toContain('fluides');
    expect(p.indexOf('ondes')).toBeLessThan(p.indexOf('impedance'));
    expect(p.indexOf('edp')).toBeLessThan(p.indexOf('green'));
  });
  it('chapter front matter only uses curriculum ids as prerequisites', () => {
    const ids = new Set(CURRICULUM.map((n) => n.id));
    for (const dir of ['chapitres', 'prerequis']) {
      const base = new URL(`../../content/${dir}/`, import.meta.url);
      let entries: string[] = [];
      try {
        entries = readdirSync(base);
      } catch {
        continue;
      }
      for (const slug of entries) {
        const src = readFileSync(new URL(`${slug}/index.mdx`, base), 'utf8');
        const m = /prerequisites:\s*\[([^\]]*)\]/.exec(src);
        const list =
          m?.[1]
            ?.split(',')
            .map((s) => s.trim().replace(/['"]/g, ''))
            .filter(Boolean) ?? [];
        for (const id of list) expect(ids.has(id), `${slug}: ${id}`).toBe(true);
      }
    }
  });
});
