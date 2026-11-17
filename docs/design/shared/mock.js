// Shared drawing code for the static design mockups. Not production code.
(function () {
  const q = new URLSearchParams(location.search);
  if (q.get('theme')) document.documentElement.dataset.theme = q.get('theme');
  const STATIC = q.has('static') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const theme = () =>
    document.documentElement.dataset.theme ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function lut(name) {
    return window.LUTS[`${name}-${theme()}`];
  }

  function setupCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: r.width, h: r.height };
  }

  // ---------- Hero: 2D scalar wave equation, leapfrog FDTD (C = 0.5 < 1/√2) ----------
  function hero(canvas, opts = {}) {
    const cell = opts.cell || 4;
    const r = canvas.getBoundingClientRect();
    const W = Math.max(32, Math.round(r.width / cell));
    const H = Math.max(32, Math.round(r.height / cell));
    let u = new Float32Array(W * H), up = new Float32Array(W * H), un = new Float32Array(W * H);
    const C2 = 0.25;
    const img = new ImageData(W, H);
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const octx = off.getContext('2d');
    const ctx = canvas.getContext('2d');
    function impulse(cx, cy, a = 1, s = 2.2) {
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const d2 = (i - cx) ** 2 + (j - cy) ** 2;
        const g = a * Math.exp(-d2 / (2 * s * s));
        u[j * W + i] += g; up[j * W + i] += g;
      }
    }
    function step() {
      for (let j = 0; j < H; j++) {
        const jm = j > 0 ? j - 1 : 1, jp = j < H - 1 ? j + 1 : H - 2;
        for (let i = 0; i < W; i++) {
          const im = i > 0 ? i - 1 : 1, ip = i < W - 1 ? i + 1 : W - 2;
          const k = j * W + i;
          const lap = u[j * W + im] + u[j * W + ip] + u[jm * W + i] + u[jp * W + i] - 4 * u[k];
          un[k] = 0.9995 * (2 * u[k] - up[k] + C2 * lap);
        }
      }
      const t = up; up = u; u = un; un = t;
    }
    function draw() {
      const L = lut('pressure');
      const scale = opts.scale || 0.12;
      for (let k = 0; k < W * H; k++) {
        let x = u[k] / scale;
        x = x > 1 ? 1 : x < -1 ? -1 : x;
        const idx = Math.round(128 + 128 * x) * 4;
        img.data[4 * k] = L[idx]; img.data[4 * k + 1] = L[idx + 1];
        img.data[4 * k + 2] = L[idx + 2]; img.data[4 * k + 3] = 255;
      }
      octx.putImageData(img, 0, 0);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
    }
    // Deterministic scene for the screenshot.
    const seeds = opts.seeds || [[0.32, 0.55, 0], [0.7, 0.35, 90], [0.55, 0.78, 150]];
    // Scale timings with grid size so small screens show the same stage of the scene.
    const k = Math.max(W, H) / 360;
    let n = 0;
    const total = Math.round((opts.steps || 260) * k);
    for (; n < total; n++) {
      for (const [x, y, at] of seeds) if (Math.round(at * k) === n) impulse(x * W, y * H);
      step();
    }
    draw();
    canvas.addEventListener('pointerdown', (e) => {
      const b = canvas.getBoundingClientRect();
      impulse(((e.clientX - b.left) / b.width) * W, ((e.clientY - b.top) / b.height) * H);
    });
    if (!STATIC) {
      const loop = () => { step(); step(); draw(); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
  }

  // ---------- 1D tube: Eulerian pressure band + Lagrangian slabs + p and v curves ----------
  function tube(canvas, opts = {}) {
    const { ctx, w, h } = setupCanvas(canvas);
    const axes = opts.axes !== false;
    const lambda = opts.lambda || 0.4; // fraction of width
    let t = opts.t || 0.18;
    const ink = css('--color-ink'), muted = css('--color-ink-muted'), rule = css('--color-rule');
    const pPos = css('--color-pressure-pos'), vel = css('--color-velocity');
    const font = opts.font || '13px "Atkinson Hyperlegible Next", sans-serif';
    function frame() {
      ctx.clearRect(0, 0, w, h);
      const padL = axes ? 44 : 0, padR = axes ? 12 : 0;
      const X0 = padL, X1 = w - padR, Wd = X1 - X0;
      const bandTop = 8, bandH = Math.round(h * 0.42);
      const k = (2 * Math.PI) / (lambda * Wd);
      const phase = (x) => k * (x - X0) - 2 * Math.PI * t;
      // Eulerian band
      const L = lut('pressure');
      for (let x = X0; x < X1; x++) {
        const p = Math.cos(phase(x)) * 0.85;
        const idx = Math.round(128 + 128 * p) * 4;
        ctx.fillStyle = `rgb(${L[idx]},${L[idx + 1]},${L[idx + 2]})`;
        ctx.fillRect(x, bandTop, 1.2, bandH);
      }
      // Lagrangian slabs: ξ = −A sin(phase); p ∝ −∂ξ/∂x → slabs converge where p > 0.
      const N = Math.round(Wd / 14);
      const A = (Wd / N) * 0.42;
      for (let i = 0; i <= N; i++) {
        const x0 = X0 + (i * Wd) / N;
        const x = x0 - A * Math.sin(phase(x0));
        ctx.strokeStyle = ink;
        ctx.globalAlpha = i === Math.round(N * 0.37) ? 1 : 0.26;
        ctx.lineWidth = i === Math.round(N * 0.37) ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(x, bandTop + 6); ctx.lineTo(x, bandTop + bandH - 6); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Followed particle excursion bracket
      const i0 = Math.round(N * 0.37), x00 = X0 + (i0 * Wd) / N;
      ctx.strokeStyle = ink; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x00 - A, bandTop + bandH + 6); ctx.lineTo(x00 + A, bandTop + bandH + 6);
      ctx.moveTo(x00 - A, bandTop + bandH + 2); ctx.lineTo(x00 - A, bandTop + bandH + 10);
      ctx.moveTo(x00 + A, bandTop + bandH + 2); ctx.lineTo(x00 + A, bandTop + bandH + 10);
      ctx.stroke();
      // Curves
      const cTop = bandTop + bandH + 28, cH = h - cTop - (axes ? 26 : 8), mid = cTop + cH / 2;
      if (axes) {
        ctx.strokeStyle = rule; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X0, mid); ctx.lineTo(X1, mid); ctx.stroke();
        ctx.fillStyle = muted; ctx.font = font; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText('0', X0 - 8, mid);
        // x ticks
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (let m = 0; m <= 10; m++) {
          const x = X0 + (m * Wd) / 10;
          ctx.beginPath(); ctx.moveTo(x, h - 24); ctx.lineTo(x, h - (m % 5 === 0 ? 16 : 20)); ctx.stroke();
          if (m % 5 === 0) ctx.fillText(`${(m * 0.1 * 1.715).toFixed(2).replace('.', ',')}`, x, h - 14);
        }
      }
      const curve = (color, amp, width) => {
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
        for (let x = X0; x <= X1; x += 2) {
          const y = mid - amp * (cH / 2) * Math.cos(phase(x));
          x === X0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      };
      curve(pPos, 0.82, 2.25);
      curve(vel, 0.55, 2.25);
      if (!STATIC && opts.animate) { t += 0.004; requestAnimationFrame(frame); }
    }
    frame();
  }

  // ---------- Course map ----------
  const NODES = [
    ['p1', '0.1', 'Nombres complexes et phaseurs', []],
    ['p3', '0.3', 'EDP et séparation des variables', []],
    ['p4', '0.4', 'Mécanique des fluides', []],
    ['p5', '0.5', 'Fonctions spéciales', []],
    ['p2', '0.2', 'Analyse de Fourier', ['p1']],
    ['p6', '0.6', 'Fonctions de Green', ['p3']],
    ['c1a', '1a', 'Équation des ondes et célérité', ['p4', 'p3']],
    ['p7', '0.7', 'Traitement du signal', ['p2']],
    ['c1b', '1b', 'Impédance, énergie, niveaux', ['c1a', 'p1']],
    ['c2', '2', 'Ondes planes', ['c1b']],
    ['c11', '11', 'Acoustique non linéaire', ['c1b']],
    ['c13', '13', 'Psychoacoustique', ['c1b', 'p2']],
    ['c3', '3', 'Guides et cavités', ['c2', 'p5']],
    ['c4', '4', 'Rayonnement', ['c1b', 'p5', 'p6']],
    ['c5', '5', 'Sources en mouvement', ['c4']],
    ['c6', '6', 'Diffraction et diffusion', ['c4']],
    ['c7', '7', 'Acoustique des salles', ['c3', 'p7']],
    ['c8', '8', 'Vibroacoustique', ['c2', 'c4']],
    ['c9', '9', 'Électroacoustique', ['c3', 'c4']],
    ['c10', '10', 'Propagation extérieure et sous-marine', ['c2', 'c6']],
    ['c12', '12', 'Antennes et imagerie', ['c4', 'p7']],
    ['c14', '14', 'Au-delà', ['c6', 'c8', 'c11']],
  ].map(([id, num, title, req]) => ({ id, num, title, req }));
  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
  const depth = (n) => (n.d ??= n.req.length ? 1 + Math.max(...n.req.map((r) => depth(byId[r]))) : 0);
  NODES.forEach(depth);
  const layers = [];
  NODES.forEach((n) => (layers[n.d] ||= []).push(n));
  // Barycenter heuristic (Sugiyama) to reduce edge crossings.
  const children = (id) => NODES.filter((m) => m.req.includes(id));
  for (let it = 0; it < 8; it++) {
    for (let d = 1; d < layers.length; d++) {
      const pos = new Map();
      NODES.forEach((m) => pos.set(m.id, layers[m.d].indexOf(m)));
      layers[d].sort((a, b) => {
        const ba = a.req.reduce((s, r) => s + pos.get(r), 0) / a.req.length;
        const bb = b.req.reduce((s, r) => s + pos.get(r), 0) / b.req.length;
        return ba - bb;
      });
    }
    for (let d = layers.length - 2; d >= 0; d--) {
      const pos = new Map();
      NODES.forEach((m) => pos.set(m.id, layers[m.d].indexOf(m)));
      const bc = (n) => { const c = children(n.id); return c.length ? c.reduce((s, m) => s + pos.get(m.id), 0) / c.length : pos.get(n.id); };
      layers[d].sort((a, b) => bc(a) - bc(b));
    }
  }
  function ancestors(id, acc = new Set()) {
    for (const r of byId[id].req) { acc.add(r); ancestors(r, acc); }
    return acc;
  }
  // ---------- Piston: p = ρ0 c0 v by momentum balance ----------
  function piston(canvas, opts = {}) {
    const { ctx, w, h } = setupCanvas(canvas);
    const ink = css('--color-ink'), muted = css('--color-ink-muted'), rule = css('--color-rule');
    const vel = css('--color-velocity');
    const L = lut('pressure');
    const front = opts.front || 0.62;
    const top = 24, bh = h * 0.5, X0 = 56, X1 = w - 16, xp = X0 + 10;
    const xf = X0 + front * (X1 - X0);
    const idx = Math.round(128 + 128 * 0.6) * 4;
    ctx.fillStyle = `rgb(${L[idx]},${L[idx + 1]},${L[idx + 2]})`;
    ctx.fillRect(xp, top, xf - xp, bh);
    ctx.strokeStyle = rule; ctx.strokeRect(X0, top, X1 - X0, bh);
    ctx.fillStyle = ink; ctx.fillRect(X0 - 8, top - 6, 18, bh + 12);
    // slabs: displaced uniformly behind the front
    const N = 22;
    for (let i = 1; i < N; i++) {
      const x0 = X0 + (i * (X1 - X0)) / N;
      const x = x0 < xf ? x0 + 7 * (1 - (x0 - X0) / (xf - X0)) + 3 : x0;
      ctx.strokeStyle = ink; ctx.globalAlpha = 0.38; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, top + 6); ctx.lineTo(x, top + bh - 6); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // front marker
    ctx.setLineDash([4, 4]); ctx.strokeStyle = ink;
    ctx.beginPath(); ctx.moveTo(xf, top - 10); ctx.lineTo(xf, top + bh + 10); ctx.stroke(); ctx.setLineDash([]);
    const arrow = (x0, x1, y, color, label) => {
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1 - 6, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 - 9, y - 5); ctx.lineTo(x1 - 9, y + 5); ctx.fill();
      ctx.font = 'italic 17px "Source Serif 4", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(label, (x0 + x1) / 2, y - 6);
    };
    arrow(X0 + 20, X0 + 80, top + bh + 36, vel, 'v');
    arrow(xf + 8, xf + 70, top + bh + 36, ink, 'c₀');
    ctx.fillStyle = muted; ctx.font = '13px "Atkinson Hyperlegible Next", sans-serif'; ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    if (w > 320) {
      ctx.fillText('en mouvement', X0 + 20, top + bh + 50);
      ctx.textAlign = 'right';
      ctx.fillText('au repos', X1, top + bh + 50);
    }
  }

  window.MOCK = { piston, hero, tube, NODES, layers, byId, ancestors, theme, css };
})();
