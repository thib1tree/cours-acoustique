import { describe, expect, it } from 'vitest';
import { expandLiveTex, renderTex, texNumber } from './tex';

describe('live TeX', () => {
  it('expands terms and values, nested', () => {
    const out = expandLiveTex('\\term{a}{\\rho_0 \\term{b}{c_0}} = \\val{z}', {
      values: { z: '413' },
      hovered: 'b',
      off: { a: true },
    });
    expect(out).toBe(
      '\\htmlClass{term term-off}{\\htmlData{term=a}{\\rho_0 \\htmlClass{term term-on}{\\htmlData{term=b}{c_0}}}} = \\htmlData{val=z}{413}',
    );
  });
  it('renders data attributes through KaTeX', () => {
    const html = renderTex(expandLiveTex('\\term{v}{v}', { values: {}, hovered: null, off: {} }));
    expect(html).toContain('data-term="v"');
  });
  it('formats numbers for TeX with a braced decimal comma', () => {
    expect(texNumber(1.25, 2)).toBe('1{,}25');
    expect(texNumber(-3)).toBe('-3');
  });
});
