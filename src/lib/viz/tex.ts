/**
 * KaTeX rendering for live equations and slider symbols.
 *
 * Authoring macros (see CONTRIBUTING.md):
 *   \term{key}{body}  a term linked to the visualization (hover, toggle);
 *   \val{key}         the current value of a scene parameter.
 */
import katex from 'katex';
import { formatNumber } from '../scene/format';

export function renderTex(tex: string, displayMode = false): string {
  return katex.renderToString(tex, {
    displayMode,
    throwOnError: false,
    strict: 'ignore',
    trust: (ctx) => ctx.command === '\\htmlData' || ctx.command === '\\htmlClass',
    output: 'html',
  });
}

/** Number formatted for TeX: French decimal comma inside braces, true minus sign. */
export const texNumber = (x: number, digits = 0): string =>
  formatNumber(x, digits).replace(',', '{,}').replace(/\s/g, '\\,').replace('−', '-');

/** Find the matching closing brace of a group opened at `open`. */
function groupEnd(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}' && --depth === 0) return i;
  }
  return -1;
}

export interface LiveTexState {
  values: Record<string, string>;
  hovered: string | null;
  off: Record<string, boolean>;
}

/** Expand \term and \val macros into KaTeX \htmlClass/\htmlData. */
export function expandLiveTex(tex: string, st: LiveTexState): string {
  let out = '';
  let i = 0;
  while (i < tex.length) {
    if (tex.startsWith('\\term{', i)) {
      const kEnd = groupEnd(tex, i + 5);
      const key = tex.slice(i + 6, kEnd);
      const bEnd = groupEnd(tex, kEnd + 1);
      const body = expandLiveTex(tex.slice(kEnd + 2, bEnd), st);
      const cls = ['term', st.hovered === key ? 'term-on' : '', st.off[key] ? 'term-off' : '']
        .filter(Boolean)
        .join(' ');
      out += `\\htmlClass{${cls}}{\\htmlData{term=${key}}{${body}}}`;
      i = bEnd + 1;
    } else if (tex.startsWith('\\val{', i)) {
      const end = groupEnd(tex, i + 4);
      const key = tex.slice(i + 5, end);
      out += `\\htmlData{val=${key}}{${st.values[key] ?? '?'}}`;
      i = end + 1;
    } else {
      out += tex[i];
      i++;
    }
  }
  return out;
}
