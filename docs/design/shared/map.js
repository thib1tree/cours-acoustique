// Course-map renderers for the mockups.
(function () {
  const { NODES, layers, byId, ancestors, css } = window.MOCK;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    parent && parent.appendChild(e);
    return e;
  };
  // Demo state: one prerequisite done, chapter 1a in progress, "4" selected.
  const DONE = new Set(['p4']);
  const CURRENT = 'c1a';
  const status = (n) =>
    DONE.has(n.id) ? 'done' : n.id === CURRENT ? 'current' : n.req.every((r) => DONE.has(r)) ? 'open' : 'locked';

  function nodeMark(g, x, y, st, r = 7) {
    const ink = css('--color-ink'), muted = css('--color-ink-muted'), bg = css('--color-bg');
    if (st === 'done') el('circle', { cx: x, cy: y, r, fill: ink }, g);
    else if (st === 'current') {
      el('circle', { cx: x, cy: y, r: r + 4, fill: 'none', stroke: ink, 'stroke-width': 1.5 }, g);
      el('circle', { cx: x, cy: y, r: r - 2, fill: ink }, g);
    } else el('circle', { cx: x, cy: y, r, fill: bg, stroke: st === 'open' ? ink : muted, 'stroke-width': 1.5, 'stroke-dasharray': st === 'locked' ? '2 2.5' : '' }, g);
  }

  /** Layered DAG, left → right (direction A, desktop). */
  window.drawLayeredMap = function (svg, selected) {
    const colW = 214, rowH = 84, padX = 8, padY = 20;
    const maxRows = Math.max(...layers.map((l) => l.length));
    const W = padX * 2 + colW * layers.length, H = padY * 2 + rowH * (maxRows - 1) + 30;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.maxWidth = W + 'px';
    layers.forEach((layer, d) =>
      layer.forEach((n, i) => {
        n.x = padX + d * colW + 8;
        n.y = padY + 10 + (i + Math.floor((maxRows - layer.length) / 2)) * rowH;
      }),
    );
    const anc = selected ? ancestors(selected) : new Set();
    const rule = css('--color-rule'), ink = css('--color-ink'), muted = css('--color-ink-muted');
    const edges = el('g', { fill: 'none' }, svg);
    const nodes = el('g', { style: `paint-order: stroke; stroke: ${css('--color-bg')}; stroke-width: 5px; stroke-linejoin: round` }, svg);
    for (const n of NODES) {
      const g = el('g', { tabindex: 0, role: 'link', 'aria-label': `${n.num} ${n.title}, ${status(n)}` }, nodes);
      nodeMark(g, n.x, n.y, status(n));
      const t = el('text', { x: n.x + 18, y: n.y - 4, 'font-size': 14, fill: ink, 'font-weight': n.id === selected || n.id === CURRENT ? 700 : 400 }, g);
      t.textContent = n.num;
      const words = n.title.split(' ');
      let line = '', lines = [];
      for (const w of words) ((line + ' ' + w).trim().length > 19 ? (lines.push(line), (line = w)) : (line = (line + ' ' + w).trim()));
      lines.push(line);
      lines.forEach((l, k) => {
        const tt = el('text', { x: n.x + 18, y: n.y + 14 + k * 17, 'font-size': 14, fill: selected && !anc.has(n.id) && n.id !== selected ? muted : ink }, g);
        tt.textContent = l;
      });
      n.lw = Math.max(...[...g.querySelectorAll('text')].map((t) => t.getComputedTextLength()));
      if (n.id === selected) el('rect', { x: n.x - 14, y: n.y - 22, width: n.lw + 40, height: 22 + lines.length * 17 + 14, fill: 'none', stroke: ink, 'stroke-width': 1 }, g);
    }
    for (const n of NODES)
      for (const r of n.req) {
        const a = byId[r];
        const hot = selected && (anc.has(n.id) || n.id === selected) && anc.has(r);
        const x0 = a.x + 18 + a.lw + 8, x1 = n.x - 11;
        const mx = (x0 + x1) / 2;
        let d = `M${a.x + 9},${a.y} H${x0} C${mx},${a.y} ${mx},${n.y} ${x1},${n.y}`;
        if (n.d - a.d > 1) {
          // Long edge: run along the free channel between rows, next to the target row.
          const yc = n.y + (a.y <= n.y ? -36 : 48);
          const xa = Math.min(x0 + 34, a.x + colW - 12), xb = n.x - 44;
          d = `M${a.x + 9},${a.y} H${x0} C${x0 + 20},${a.y} ${xa - 14},${yc} ${xa},${yc} H${xb} C${xb + 18},${yc} ${x1 - 16},${n.y} ${x1},${n.y}`;
        }
        el('path', { d, stroke: hot ? ink : rule, 'stroke-width': hot ? 1.75 : 1, 'stroke-dasharray': '' }, edges);
      }
  };

  /** Arc diagram, top → bottom (mobile, and direction B). */
  window.drawArcMap = function (svg, selected, opts = {}) {
    const order = layers.flat();
    const rowH = opts.rowH || 52, left = opts.left || 120, W = opts.width || 360;
    const H = order.length * rowH + 20;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    order.forEach((n, i) => { n.ax = left; n.ay = 20 + i * rowH; });
    const anc = selected ? ancestors(selected) : new Set();
    const rule = css('--color-rule'), ink = css('--color-ink'), muted = css('--color-ink-muted');
    const edges = el('g', { fill: 'none' }, svg);
    for (const n of order)
      for (const r of n.req) {
        const a = byId[r];
        const hot = selected && (anc.has(n.id) || n.id === selected) && anc.has(r);
        const span = n.ay - a.ay;
        const bulge = Math.min(left - 12, 10 + span * 0.18);
        el('path', { d: `M${left - 9},${a.ay} C${left - bulge},${a.ay} ${left - bulge},${n.ay} ${left - 9},${n.ay}`, stroke: hot ? ink : rule, 'stroke-width': hot ? 1.75 : 1 }, edges);
      }
    for (const n of order) {
      const g = el('g', { style: `paint-order: stroke; stroke: ${css('--color-bg')}; stroke-width: 5px; stroke-linejoin: round` }, svg);
      nodeMark(g, n.ax, n.ay, status(n), 6);
      const t = el('text', { x: left + 18, y: n.ay + 5, 'font-size': opts.fontSize || 15, 'font-family': opts.font || '', fill: selected && !anc.has(n.id) && n.id !== selected ? muted : ink, 'font-weight': n.id === selected || n.id === CURRENT ? 700 : 400 }, g);
      const num = el('tspan', { fill: muted, 'font-variant-numeric': 'tabular-nums' }, t);
      num.textContent = n.num + '  ';
      const ti = el('tspan', {}, t);
      ti.textContent = n.title;
    }
  };
  window.MAPSTATE = { DONE, CURRENT, status };
})();
