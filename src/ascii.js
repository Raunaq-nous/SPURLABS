/* Spur Labs ASCII renderer: solid models rendered with light, converted to a grid of characters. */
(function () {
  const S = (window.Spur = window.Spur || {}), T = THREE, TAU = Math.PI * 2;
  const COL = { warm: 0xece6da, cool: 0xf1f5f7, ice: 0xa3bccb, cyan: 0xa8dadc, teal: 0x5e8e8a, champ: 0xd8c29e, peach: 0xe39b85, ground: 0x2c3a3a };
  const CYC = ['cool', 'ice', 'cyan', 'warm', 'ice', 'cool', 'cyan', 'warm'];
  /* geometry helpers: base-anchored primitives, merged per component */
  const box = (w, h, d, x, y, z) => { const g = new T.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); return g; };
  const cyl = (rt, rb, h, x, y, z, s = 24, open = false) => { const g = new T.CylinderGeometry(rt, rb, h, s, 1, open); g.translate(x, y + h / 2, z); return g; };
  const sph = (r, x, y, z, th = Math.PI) => { const g = new T.SphereGeometry(r, 20, 12, 0, TAU, 0, th); g.translate(x, y, z); return g; };
  const cap = (R, rise, x, y, z) => { const Rs = (R * R + rise * rise) / (2 * rise), th = Math.asin(Math.min(1, R / Rs)), g = new T.SphereGeometry(Rs, 32, 8, 0, TAU, 0, th); g.translate(x, y + rise - Rs, z); return g; };
  const lathe = (pts, x, y, z, s = 48) => { const g = new T.LatheGeometry(pts.map((p) => new T.Vector2(p[0], p[1])), s); g.translate(x, y, z); return g; };
  const bar = (a, b, r) => { const A = new T.Vector3(...a), B = new T.Vector3(...b), L = A.distanceTo(B); const g = new T.CylinderGeometry(r, r, L, 6, 1, true); g.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize()))); const m = A.add(B).multiplyScalar(0.5); g.translate(m.x, m.y, m.z); return g; };
  const tube = (pts, r, seg = 48) => new T.TubeGeometry(new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(...p))), seg, r, 6, false);
  const hcyl = (r, L, x, y, z, axis = 'x') => { const g = new T.CylinderGeometry(r, r, L, 20); if (axis === 'x') g.rotateZ(Math.PI / 2); else g.rotateX(Math.PI / 2); g.translate(x, y, z); return g; };
  function surf(nu, nv, f) { const p = [], ix = []; for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) p.push(...f(i / nu, j / nv)); for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; ix.push(a, c, b, b, c, d); } const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setIndex(ix); g.computeVertexNormals(); return g; }
  const lattice = (x, z, w, d, y0, h, lv, r) => { const L = [], C = [[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x + w / 2, z + d / 2], [x - w / 2, z + d / 2]]; C.forEach((c) => L.push(bar([c[0], y0, c[1]], [c[0], y0 + h, c[1]], r))); for (let i = 0; i < lv; i++) { const ya = y0 + (h * i) / lv, yb = y0 + (h * (i + 1)) / lv; for (let k = 0; k < 4; k++) { const p = C[k], q = C[(k + 1) % 4]; L.push(bar([p[0], ya, p[1]], [q[0], yb, q[1]], r * 0.7), bar([p[0], yb, p[1]], [q[0], yb, q[1]], r * 0.8)); } } return L; };
  const taper = (x, z, w0, w1, y0, h, lv, r) => { const L = [], cor = (w, y) => [[x - w / 2, y, z - w / 2], [x + w / 2, y, z - w / 2], [x + w / 2, y, z + w / 2], [x - w / 2, y, z + w / 2]]; for (let i = 0; i < lv; i++) { const ya = y0 + (h * i) / lv, yb = y0 + (h * (i + 1)) / lv, A = cor(w0 + ((w1 - w0) * i) / lv, ya), B = cor(w0 + ((w1 - w0) * (i + 1)) / lv, yb); for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; L.push(bar(A[k], B[k], r), bar(A[k], B[k2], r * 0.6), bar(B[k], B[k2], r * 0.7)); } } return L; };
  const truss = (a, b, ht, n, r) => { const L = []; [-0.025, 0.025].forEach((oz) => { for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, p = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + oz]; const P0 = p(t0), P1 = p(t1); L.push(bar(P0, P1, r), bar([P0[0], P0[1] + ht, P0[2]], [P1[0], P1[1] + ht, P1[2]], r), bar(P0, [P0[0], P0[1] + ht, P0[2]], r * 0.7), bar(P0, [P1[0], P1[1] + ht, P1[2]], r * 0.6)); } }); return L; };
  const cat = (a, b, sag, r) => { const P = []; for (let i = 0; i <= 12; i++) { const t = i / 12; P.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]); } return tube(P, r, 24); };
  const fans = (x0, x1, z0, z1, y, nx, nz, r) => { const L = []; for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) L.push(cyl(r, r, 0.012, x0 + ((i + 0.5) * (x1 - x0)) / nx, y, z0 + ((j + 0.5) * (z1 - z0)) / nz, 16, true)); return L; };
  const slab = (w, d, y, x = 0, z = 0) => box(w, 0.006, d, x, y - 0.006, z);
  function merge(list) { let n = 0; const G = list.map((g) => { const q = g.index ? g.toNonIndexed() : g; if (!q.attributes.normal) q.computeVertexNormals(); n += q.attributes.position.count; return q; }); const P = new Float32Array(n * 3), N = new Float32Array(n * 3); let o = 0; G.forEach((g) => { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }); const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(P, 3)); out.setAttribute('normal', new T.BufferAttribute(N, 3)); return out; }

  /* the industries */
  const DEF = {
    dc: [['Data halls', 'Rooftop cooling', 'On-site power', 'Battery storage', 'Substation', 'Transmission', 'Site'], (a) => {
      a(6, slab(3.6, 2.2, 0), box(3.4, 0.004, 0.06, 0, 0, 0), box(0.06, 0.004, 2.0, -0.36, 0, 0));
      [[-0.86, -0.45], [0.14, -0.45], [-0.86, 0.3], [0.14, 0.3]].forEach(([x, z]) => { a(0, box(0.86, 0.12, 0.34, x, 0, z)); for (let rr = 0; rr < 6; rr++) for (let q = 0; q < 2; q++) a(1, box(0.36, 0.05, 0.022, x - 0.2 + q * 0.4, 0, z - 0.13 + rr * 0.052)); a(1, box(0.8, 0.004, 0.3, x, 0.075, z)); for (let k = 0; k < 28; k++) a(0, box(0.008, 0.12, 0.014, x - 0.42 + k * 0.031, 0, z + 0.172)); a(1, ...fans(x - 0.4, x + 0.4, z - 0.14, z + 0.14, 0.12, 14, 4, 0.016)); a(1, box(0.09, 0.05, 0.1, x + 0.36, 0.12, z)); });
      for (let k = 0; k < 8; k++) { const x = -1.3 + k * 0.14; a(2, box(0.1, 0.06, 0.06, x, 0, 0.8), cyl(0.011, 0.011, 0.13, x + 0.03, 0.06, 0.8, 10)); }
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) a(3, box(0.07, 0.034, 0.045, 0.14 + i * 0.09, 0, 0.7 + j * 0.08));
      for (let k = 0; k < 6; k++) { const x = 1.05 + (k % 3) * 0.14, z = -0.2 + Math.floor(k / 3) * 0.4; a(4, box(0.07, 0.06, 0.05, x, 0, z), box(0.004, 0.05, 0.05, x - 0.045, 0, z), bar([x, 0.06, z], [x, 0.11, z], 0.004)); }
      [-0.3, 0.1, 0.4].forEach((z) => a(4, bar([1.0, 0, z], [1.0, 0.18, z], 0.006), bar([1.45, 0, z], [1.45, 0.18, z], 0.006), bar([1.0, 0.18, z], [1.45, 0.18, z], 0.005)));
      a(5, ...taper(1.35, -0.62, 0.08, 0.02, 0, 0.55, 7, 0.005), ...taper(1.05, -0.92, 0.08, 0.02, 0, 0.55, 7, 0.005), cat([1.3, 0.18, -0.25], [1.35, 0.5, -0.62], 0.03, 0.003), cat([1.35, 0.5, -0.62], [1.05, 0.5, -0.92], 0.05, 0.003));
    }],
    ccgt: [['Gas turbines', 'Heat-recovery steam generators', 'Stacks', 'Steam turbine hall', 'Air-cooled condenser', 'Switchyard', 'Site'], (a) => {
      a(6, slab(3.6, 2.0, 0));
      [-0.35, 0.15].forEach((z) => { a(0, box(0.3, 0.12, 0.12, -0.95, 0, z), box(0.12, 0.17, 0.18, -1.17, 0.07, z), bar([-1.21, 0, z - 0.07], [-1.21, 0.07, z - 0.07], 0.006), bar([-1.13, 0, z + 0.07], [-1.13, 0.07, z + 0.07], 0.006)); a(1, box(0.42, 0.3, 0.14, -0.55, 0, z), box(0.08, 0.12, 0.11, -0.8, 0, z)); for (let k = 0; k < 7; k++) a(1, box(0.006, 0.3, 0.146, -0.74 + k * 0.06, 0, z)); a(2, cyl(0.034, 0.04, 0.52, -0.3, 0, z, 24), cyl(0.05, 0.05, 0.006, -0.3, 0.4, z, 24)); });
      a(3, box(0.32, 0.22, 0.3, -0.02, 0, -0.1), box(0.34, 0.01, 0.32, -0.02, 0.22, -0.1));
      a(4, box(0.82, 0.014, 0.72, 0.75, 0.215, -0.06)); for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) a(4, bar([0.37 + i * 0.152, 0, -0.39 + j * 0.22], [0.37 + i * 0.152, 0.215, -0.39 + j * 0.22], 0.008));
      a(4, ...fans(0.37, 1.13, -0.4, 0.28, 0.229, 8, 5, 0.034)); for (let k = 0; k < 5; k++) { const zc = -0.35 + k * 0.14; [[-1, 0.62], [1, -0.62]].forEach(([s, rx]) => { const g = new T.BoxGeometry(0.78, 0.004, 0.1); g.rotateX(rx); g.translate(0.75, 0.27, zc + s * 0.035); a(4, g); }); }
      a(4, hcyl(0.035, 0.22, 0.25, 0.3, -0.1));
      a(5, ...[0.2, 0.6].flatMap((z) => [bar([1.3, 0, z], [1.3, 0.17, z], 0.006), bar([1.55, 0, z], [1.55, 0.17, z], 0.006), bar([1.3, 0.17, z], [1.55, 0.17, z], 0.005)]), box(0.07, 0.06, 0.05, 1.32, 0, -0.05), box(0.07, 0.06, 0.05, 1.45, 0, -0.05), cat([1.5, 0.17, 0.45], [1.9, 0.25, 0.9], 0.04, 0.003));
    }],
    nuclear: [['Shield building', 'Passive cooling tank', 'Turbine hall', 'Auxiliary building', 'Cooling tower', 'Switchyard', 'Site'], (a) => {
      a(6, slab(3.6, 2.0, 0));
      [-1.05, -0.5].forEach((ux) => { const uz = 0.12; a(0, cyl(0.13, 0.13, 0.3, ux, 0, uz, 40)); a(1, cyl(0.075, 0.13, 0.055, ux, 0.3, uz, 40), cyl(0.062, 0.062, 0.052, ux, 0.355, uz, 32)); a(3, box(0.3, 0.17, 0.13, ux, 0, uz + 0.235)); a(2, box(0.3, 0.22, 0.24, ux, 0, uz - 0.275)); for (let k = 0; k < 7; k++) a(2, box(0.008, 0.22, 0.008, ux - 0.15 + k * 0.05, 0, uz - 0.397)); });
      const prof = []; for (let i = 0; i <= 30; i++) { const t = i / 30, r = t < 0.72 ? 0.2 + 0.13 * Math.pow(1 - t / 0.72, 2) : 0.2 + 0.02 * Math.pow((t - 0.72) / 0.28, 2); prof.push([r, 0.07 + t * 0.87]); }
      [[0.45, -0.05], [1.25, 0.28]].forEach(([cx, cz]) => { a(4, lathe(prof, cx, 0, cz, 56)); for (let k = 0; k < 36; k++) { const p = (k / 36) * TAU, q = p + 0.09; a(4, bar([cx + 0.33 * Math.cos(p), 0, cz + 0.33 * Math.sin(p)], [cx + 0.33 * Math.cos(q), 0.075, cz + 0.33 * Math.sin(q)], 0.006), bar([cx + 0.33 * Math.cos(q), 0, cz + 0.33 * Math.sin(q)], [cx + 0.33 * Math.cos(p), 0.075, cz + 0.33 * Math.sin(p)], 0.006)); } });
      a(5, ...lattice(-1.5, -0.55, 0.05, 0.05, 0, 0.2, 4, 0.004), ...lattice(-1.3, -0.55, 0.05, 0.05, 0, 0.2, 4, 0.004), cat([-1.5, 0.2, -0.55], [-1.9, 0.26, -0.95], 0.06, 0.003));
    }],
    wind: [['Rotor', 'Nacelle', 'Tower', 'Foundation', 'Offshore substation', 'Sea'], (a, spin) => {
      a(5, slab(3.6, 2.4, -0.06));
      [[-1.25, 0.55, 0.0], [-0.45, 0.15, 1.3], [0.35, -0.25, 2.6], [1.15, -0.65, 3.9], [-0.85, -0.55, 5.1]].forEach(([x, z, ph]) => {
        a(3, cyl(0.03, 0.03, 0.15, x, -0.06, z, 16), cyl(0.05, 0.05, 0.008, x, 0.08, z, 16)); a(2, cyl(0.016, 0.027, 0.83, x, 0.09, z, 16)); a(1, box(0.045, 0.045, 0.12, x, 0.925, z - 0.04), sph(0.02, x, 0.947, z + 0.025));
        const bl = []; for (let b = 0; b < 3; b++) { const g = new T.CylinderGeometry(0.004, 0.016, 0.6, 4); g.scale(1, 1, 0.3); g.translate(0, 0.32, 0); g.rotateZ((b * TAU) / 3); bl.push(g); } spin(merge(bl), [x, 0.947, z + 0.035], ph);
      });
      a(4, ...lattice(1.35, 0.6, 0.17, 0.17, -0.06, 0.26, 4, 0.006), box(0.27, 0.13, 0.21, 1.35, 0.2, 0.6), box(0.1, 0.06, 0.08, 1.3, 0.33, 0.58), cyl(0.07, 0.07, 0.006, 1.5, 0.33, 0.6, 24));
      a(3, tube([[-1.25, -0.06, 0.55], [-0.45, -0.06, 0.15], [0.35, -0.06, -0.25], [1.15, -0.06, -0.65]], 0.004));
    }],
    solar: [['PV arrays', 'Inverter stations', 'Battery storage', 'Substation', 'Transmission', 'Site'], (a) => {
      a(5, slab(3.6, 2.2, 0));
      for (let row = 0; row < 13; row++) { const z = -0.88 + row * 0.11; for (let s = 0; s < 22; s++) { const g = new T.BoxGeometry(0.105, 0.004, 0.055); g.rotateX(-0.45); g.translate(-1.62 + s * 0.12 + 0.06, 0.045, z); a(0, g); } a(0, box(2.64, 0.006, 0.006, -0.3, 0.03, z)); }
      for (let k = 0; k < 5; k++) a(1, box(0.06, 0.045, 0.04, 1.08, 0, -0.8 + k * 0.32));
      for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) a(2, box(0.07, 0.034, 0.05, 1.25 + i * 0.09, 0, -0.45 + j * 0.12));
      a(3, ...[0.62, 0.9].flatMap((z) => [bar([1.25, 0, z], [1.25, 0.16, z], 0.006), bar([1.55, 0, z], [1.55, 0.16, z], 0.006), bar([1.25, 0.16, z], [1.55, 0.16, z], 0.005)]), box(0.07, 0.06, 0.05, 1.4, 0, 0.76));
      a(4, ...taper(1.45, -0.75, 0.07, 0.02, 0, 0.48, 6, 0.005), cat([1.4, 0.16, 0.76], [1.45, 0.45, -0.75], 0.04, 0.003));
    }],
    hvdc: [['Valve halls', 'Converter transformers', 'DC yard', 'AC switchyard', 'Overhead line', 'Site'], (a) => {
      a(5, slab(3.6, 2.0, 0));
      [-0.7, -0.08].forEach((x) => { a(0, box(0.52, 0.3, 0.34, x, 0, -0.25)); for (let k = 0; k < 9; k++) a(0, box(0.006, 0.3, 0.346, x - 0.24 + k * 0.06, 0, -0.25)); });
      for (let k = 0; k < 6; k++) { const x = -0.92 + k * 0.17; a(1, box(0.1, 0.08, 0.08, x, 0, 0.12), bar([x - 0.025, 0.08, 0.12], [x - 0.025, 0.17, 0.12], 0.006), bar([x + 0.025, 0.08, 0.12], [x + 0.025, 0.17, 0.12], 0.006)); }
      a(2, ...lattice(-1.35, -0.3, 0.12, 0.12, 0, 0.18, 3, 0.005), ...lattice(-1.35, 0.1, 0.12, 0.12, 0, 0.18, 3, 0.005), cyl(0.05, 0.05, 0.16, -1.15, 0, -0.55, 20), cyl(0.05, 0.05, 0.16, -1.15, 0, 0.35, 20));
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { const x = 0.45 + i * 0.14, z = -0.45 + j * 0.42; a(3, bar([x, 0, z], [x, 0.2, z], 0.006), bar([x, 0.2, z - 0.06], [x, 0.2, z + 0.06], 0.005)); } [-0.45, -0.03, 0.39].forEach((z) => a(3, bar([0.45, 0.18, z], [1.15, 0.18, z], 0.004)));
      a(4, ...taper(1.35, 0.1, 0.08, 0.02, 0, 0.56, 7, 0.005), ...taper(1.55, -0.55, 0.08, 0.02, 0, 0.56, 7, 0.005), cat([1.15, 0.18, 0.0], [1.35, 0.52, 0.1], 0.03, 0.003), cat([1.35, 0.52, 0.1], [1.55, 0.52, -0.55], 0.05, 0.003));
    }],
    lng: [['Storage tanks', 'Liquefaction trains', 'Pipe racks', 'Air coolers', 'Flare', 'Marine jetty', 'LNG carrier', 'Site'], (a) => {
      a(7, box(2.3, 0.006, 2.2, -0.55, -0.006, 0), box(1.1, 0.004, 2.2, 1.2, -0.034, 0));
      [[-1.3, -0.45], [-1.3, 0.28], [-0.78, 0.62]].forEach(([x, z]) => { a(0, cyl(0.19, 0.19, 0.2, x, 0, z, 48), cap(0.19, 0.045, x, 0.2, z)); const P = []; for (let i = 0; i <= 40; i++) { const t = i / 40, an = t * 1.15 * TAU; P.push([x + 0.198 * Math.cos(an), t * 0.2, z + 0.198 * Math.sin(an)]); } a(0, tube(P, 0.004, 80)); });
      [-0.42, -0.06, 0.3].forEach((z) => { for (let x = -0.5; x <= 0.42; x += 0.0767) a(2, bar([x, 0, z - 0.045], [x, 0.15, z - 0.045], 0.005), bar([x, 0, z + 0.045], [x, 0.15, z + 0.045], 0.005), bar([x, 0.1, z - 0.045], [x, 0.1, z + 0.045], 0.004)); for (let k = 0; k < 6; k++) a(2, hcyl(0.006, 0.92, -0.04, 0.05 + (k % 3) * 0.03, z - 0.025 + Math.floor(k / 3) * 0.05)); a(3, box(0.92, 0.012, 0.1, -0.04, 0.15, z), ...fans(-0.48, 0.4, z - 0.04, z + 0.04, 0.162, 12, 2, 0.017)); a(1, cyl(0.028, 0.028, 0.36, 0.52, 0, z, 20), sph(0.028, 0.52, 0.36, z, Math.PI / 2), cyl(0.018, 0.018, 0.26, 0.6, 0, z + 0.06, 16), box(0.1, 0.1, 0.09, -0.58, 0, z)); });
      [[-0.15, 0.75], [0.05, 0.8]].forEach(([x, z]) => a(4, cyl(0.007, 0.007, 0.62, x, 0, z, 8), ...taper(x, z, 0.07, 0.02, 0, 0.6, 8, 0.003)));
      a(5, box(0.6, 0.012, 0.05, 0.79, 0.03, -0.02), box(0.14, 0.04, 0.12, 1.12, 0.03, -0.08)); for (let k = 0; k <= 8; k++) a(5, bar([0.5 + k * 0.072, -0.03, -0.02], [0.5 + k * 0.072, 0.03, -0.02], 0.004)); a(5, bar([1.08, 0.07, -0.12], [1.18, 0.16, -0.1], 0.004), bar([1.18, 0.16, -0.1], [1.24, 0.1, -0.1], 0.004), bar([1.08, 0.07, -0.04], [1.18, 0.16, -0.03], 0.004), bar([1.18, 0.16, -0.03], [1.24, 0.1, -0.03], 0.004));
      const sh = new T.Shape(); sh.moveTo(-0.085, -0.6); sh.lineTo(0.085, -0.6); sh.lineTo(0.085, 0.38); sh.quadraticCurveTo(0.085, 0.5, 0, 0.56); sh.quadraticCurveTo(-0.085, 0.5, -0.085, 0.38); sh.lineTo(-0.085, -0.6); const hg = new T.ExtrudeGeometry(sh, { depth: 0.09, bevelEnabled: false }); hg.rotateX(-Math.PI / 2); hg.translate(1.38, -0.02, 0); a(6, hg);
      [-0.38, -0.14, 0.1, 0.33].forEach((z) => a(6, sph(0.068, 1.38, 0.07, z, Math.PI / 2))); a(6, box(0.15, 0.11, 0.08, 1.38, 0.07, -0.53));
    }],
    oil: [['Living quarters', 'Processing', 'Drilling platform', 'Riser platform', 'Bridges', 'Flare boom', 'Jackets', 'Sea'], (a) => {
      a(7, slab(3.6, 2.2, -0.06));
      [-1.2, -0.42, 0.36, 1.12].forEach((x, i) => { const w = i === 1 ? 0.3 : 0.22; a(6, ...lattice(x, 0, w, w, -0.06, 0.33, 4, 0.007), box(w + 0.06, 0.025, w + 0.04, x, 0.33, 0)); });
      a(0, box(0.22, 0.28, 0.2, -1.2, 0.355, 0)); for (let k = 0; k < 8; k++) a(0, box(0.226, 0.004, 0.206, -1.2, 0.38 + k * 0.032, 0)); a(0, cyl(0.12, 0.12, 0.008, -1.2, 0.64, -0.17, 32));
      a(1, box(0.32, 0.14, 0.28, -0.42, 0.355, 0), box(0.25, 0.12, 0.2, -0.44, 0.495, -0.04), box(0.12, 0.1, 0.1, -0.36, 0.615, 0.05)); for (let k = 0; k < 5; k++) a(1, hcyl(0.006, 0.32, -0.42, 0.38 + k * 0.02, 0.15));
      { const L = []; const A = [-0.3, 0.58, 0.12], B = [0.02, 0.97, 0.47]; for (let i = 0; i < 10; i++) { const t0 = i / 10, t1 = (i + 1) / 10, p = (t, o) => [A[0] + (B[0] - A[0]) * t + o, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t - o]; L.push(bar(p(t0, -0.02), p(t1, -0.02), 0.005), bar(p(t0, 0.02), p(t1, 0.02), 0.005), bar(p(t0, -0.02), p(t1, 0.02), 0.003)); } a(5, ...L, sph(0.035, 0.03, 0.99, 0.48)); }
      a(2, ...taper(0.36, 0, 0.11, 0.045, 0.45, 0.48, 8, 0.005), box(0.25, 0.07, 0.22, 0.36, 0.355, 0), box(0.12, 0.04, 0.1, 0.5, 0.355, 0.1), bar([0.24, 0.42, -0.1], [0.24, 0.5, -0.1], 0.008), bar([0.24, 0.5, -0.1], [0.02, 0.62, -0.18], 0.005));
      a(3, box(0.26, 0.11, 0.22, 1.12, 0.355, 0)); for (let k = 0; k < 6; k++) a(3, bar([1.04 + k * 0.03, -0.06, 0.1], [1.04 + k * 0.03, 0.34, 0.1], 0.005));
      a(4, ...truss([-1.09, 0.355, 0], [-0.57, 0.355, 0], 0.045, 8, 0.004), ...truss([-0.27, 0.355, 0], [0.25, 0.355, 0], 0.045, 8, 0.004), ...truss([0.47, 0.355, 0], [1.0, 0.355, 0], 0.045, 8, 0.004));
    }],
    fab: [['Cleanroom fab', 'Rooftop air handling', 'Central utility building', 'Cooling towers', 'Bulk gas yard', 'Wastewater treatment', 'Site'], (a) => {
      a(6, slab(3.6, 2.0, 0));
      a(0, box(1.6, 0.22, 0.72, -0.35, 0, -0.05)); for (let k = 0; k < 4; k++) a(0, box(1.606, 0.004, 0.726, -0.35, 0.05 + k * 0.05, -0.05));
      for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) a(1, box(0.07, 0.045, 0.1, -1.05 + i * 0.125, 0.22, -0.3 + j * 0.24)); for (let i = 0; i < 8; i++) a(1, cyl(0.013, 0.013, 0.11, -1.0 + i * 0.18, 0.265, 0.27, 10));
      a(2, box(0.5, 0.18, 0.3, 1.0, 0, -0.5), box(0.36, 0.02, 0.04, 0.6, 0.12, -0.45)); a(3, box(0.42, 0.08, 0.2, 1.0, 0, 0.22), ...fans(0.82, 1.18, 0.14, 0.3, 0.08, 6, 2, 0.026));
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) a(4, cyl(0.026, 0.026, 0.18, 1.38 + i * 0.07, 0, -0.35 + j * 0.09, 16), sph(0.026, 1.38 + i * 0.07, 0.18, -0.35 + j * 0.09, Math.PI / 2));
      [[1.25, 0.65], [1.45, 0.62], [1.35, 0.85]].forEach(([x, z]) => a(5, cyl(0.08, 0.08, 0.035, x, 0, z, 32, true), cyl(0.012, 0.012, 0.05, x, 0, z, 8), box(0.16, 0.008, 0.012, x, 0.045, z)));
    }],
    mine: [['Open pit', 'Shaft headframe', 'Concentrator', 'Conveyors', 'Stockpile dome', 'Thickeners', 'Site'], (a) => {
      a(6, box(2.6, 0.006, 2.2, 0.5, -0.006, 0));
      const pr = []; for (let k = 0; k <= 9; k++) { const r = 0.6 - k * 0.055; pr.push([r, -k * 0.034], [r - 0.012, -(k + 1) * 0.034]); } pr.reverse(); const pg = lathe(pr, 0, 0, 0, 64); pg.scale(1, 1, 0.72); pg.translate(-1.05, 0, 0.25); a(0, pg);
      a(1, box(0.11, 0.62, 0.11, -0.25, 0, -0.45), box(0.14, 0.06, 0.13, -0.25, 0.62, -0.45), box(0.16, 0.12, 0.12, -0.05, 0, -0.45));
      a(4, sph(0.2, 0.15, 0, 0.32, Math.PI / 2));
      a(2, box(0.55, 0.24, 0.32, 0.75, 0, -0.05)); { const g = new T.CylinderGeometry(0.19, 0.19, 0.55, 3, 1); g.rotateZ(Math.PI / 2); g.scale(1, 0.32, 0.85); g.translate(0.75, 0.25, -0.05); a(2, g); } [0.6, 0.75, 0.9].forEach((x) => a(2, hcyl(0.055, 0.11, x, 0.06, 0.2, 'z')));
      const conv = (A, B, n) => { const L = [], dx = B[0] - A[0], dy = B[1] - A[1], dz = B[2] - A[2], len = Math.hypot(dx, dy, dz), g = new T.BoxGeometry(len, 0.03, 0.04); g.rotateY(-Math.atan2(dz, dx)); g.rotateZ(0); const m = new T.Matrix4().lookAt(new T.Vector3(...A), new T.Vector3(...B), new T.Vector3(0, 1, 0)); const g2 = new T.BoxGeometry(0.04, 0.03, len); g2.applyMatrix4(m); g2.translate((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2); L.push(g2); for (let i = 1; i <= n; i++) { const t = i / (n + 1); L.push(bar([A[0] + dx * t, 0, A[2] + dz * t], [A[0] + dx * t, A[1] + dy * t, A[2] + dz * t], 0.005)); } return L; };
      a(3, ...conv([-0.55, 0.02, 0.12], [0.06, 0.2, 0.3], 6), ...conv([0.3, 0.04, 0.25], [0.5, 0.2, 0.05], 3));
      [[1.3, -0.45], [1.45, 0.05], [1.3, 0.52]].forEach(([x, z]) => a(5, cyl(0.1, 0.1, 0.035, x, 0, z, 40, true), cyl(0.012, 0.012, 0.06, x, 0, z, 8), box(0.2, 0.008, 0.014, x, 0.05, z)));
    }],
    water: [['Seawater intake', 'Pretreatment', 'Reverse osmosis', 'Product water tanks', 'Brine outfall', 'Sea', 'Site'], (a) => {
      a(6, box(2.5, 0.006, 2.0, -0.35, -0.006, 0)); a(5, box(1.0, 0.004, 2.0, 1.35, -0.034, 0));
      a(0, tube([[1.75, -0.03, 0.1], [1.2, -0.01, 0.1], [0.82, 0.02, 0.1]], 0.012), tube([[1.75, -0.03, 0.2], [1.2, -0.01, 0.2], [0.82, 0.02, 0.2]], 0.012), box(0.14, 0.1, 0.14, 0.75, 0, 0.15));
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { const x = 0.08 + i * 0.17, z = -0.5 + j * 0.25; a(1, box(0.15, 0.05, 0.006, x, 0, z - 0.11), box(0.15, 0.05, 0.006, x, 0, z + 0.11), box(0.006, 0.05, 0.22, x - 0.075, 0, z), box(0.006, 0.05, 0.22, x + 0.075, 0, z)); }
      a(2, box(0.7, 0.16, 0.32, -0.55, 0, -0.35)); for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) a(2, hcyl(0.012, 0.6, -0.55, 0.02 + r * 0.028, 0.0 + c * 0.05));
      [[-1.3, -0.4], [-1.3, 0.0], [-1.3, 0.4]].forEach(([x, z]) => a(3, cyl(0.14, 0.14, 0.14, x, 0, z, 40), cap(0.14, 0.025, x, 0.14, z)));
      a(4, tube([[0.8, 0.0, -0.35], [1.25, -0.02, -0.4], [1.7, -0.04, -0.45]], 0.008)); for (let k = 0; k < 6; k++) a(4, bar([1.45 + k * 0.045, -0.04, -0.43], [1.45 + k * 0.045, 0.01, -0.43], 0.004));
    }],
    hydro: [['Dam', 'Spillway', 'Reservoir', 'Powerhouse', 'Penstocks', 'Switchyard', 'Valley'], (a) => {
      const dz = (u, y) => 0.22 * (1 - u * u) + (0.75 - y) * 0.42;
      [-1, 1].forEach((s) => a(6, surf(16, 12, (u, v) => { const x = s * (1.1 + u * 0.6), z = -0.9 + v * 1.9; return [x, Math.max(0, 0.85 - u * 0.35 - Math.abs(z - 0.1) * 0.25), z]; })));
      a(0, surf(40, 16, (u, v) => { const uu = u * 2 - 1, y = v * 0.75; return [uu * 1.12, y, dz(uu, y)]; }), surf(40, 2, (u, v) => { const uu = u * 2 - 1; return [uu * 1.12, 0.76, dz(uu, 0.75) - 0.05 + v * 0.05]; }));
      for (let k = 0; k < 7; k++) { const uu = -0.2 + k * 0.066; a(1, box(0.02, 0.1, 0.06, uu * 1.12, 0.75, dz(uu, 0.75) - 0.02)); }
      a(1, surf(8, 16, (u, v) => { const uu = -0.18 + u * 0.36, y = 0.75 - v * 0.73; return [uu * 1.12, y + 0.012, dz(uu, y) + 0.012]; }));
      a(2, box(2.3, 0.004, 0.7, 0, 0.72, -0.4)); a(3, box(0.42, 0.14, 0.18, 0.45, 0, 0.78)); [0.3, 0.45, 0.6].forEach((x) => a(3, sph(0.04, x, 0.14, 0.78, Math.PI / 2), ));
      [0.3, 0.45, 0.6].forEach((x) => a(4, tube([[x, 0.5, dz(x / 1.12, 0.5)], [x, 0.25, dz(x / 1.12, 0.25) + 0.05], [x, 0.07, 0.7]], 0.014)));
      a(5, ...[0.75, 0.95].flatMap((z) => [bar([0.85, 0, z], [0.85, 0.16, z], 0.006), bar([1.15, 0, z], [1.15, 0.16, z], 0.006), bar([0.85, 0.16, z], [1.15, 0.16, z], 0.005)]), ...taper(1.35, 0.85, 0.07, 0.02, 0, 0.45, 6, 0.005));
    }],
    manufacturing: [['Production halls', 'Sawtooth roof', 'Production lines', 'Warehouse and docks', 'Utilities', 'Site'], (a) => {
      a(5, slab(3.6, 2.2, 0));
      a(0, box(1.9, 0.18, 1.0, -0.4, 0, -0.1)); for (let k = 0; k < 9; k++) { const x = -1.3 + k * 0.21; const g = new T.CylinderGeometry(0.0001, 0.105, 0.09, 3, 1); g.rotateX(Math.PI / 2); g.rotateZ(Math.PI / 2); g.scale(1, 1, 9.6); g.translate(x + 0.1, 0.225, -0.1); a(1, g); }
      for (let l = 0; l < 4; l++) { const z = -0.45 + l * 0.22; a(2, box(1.6, 0.03, 0.05, -0.4, 0.02, z)); for (let s2 = 0; s2 < 8; s2++) a(2, box(0.08, 0.06, 0.07, -1.1 + s2 * 0.2, 0.02, z)); }
      a(3, box(0.7, 0.14, 0.8, 1.05, 0, -0.1)); for (let d = 0; d < 6; d++) a(3, box(0.08, 0.06, 0.012, 0.8 + d * 0.1, 0, 0.31), box(0.06, 0.05, 0.22, 0.8 + d * 0.1, 0, 0.5));
      a(4, cyl(0.06, 0.06, 0.2, -1.45, 0, 0.65, 20), cyl(0.06, 0.06, 0.2, -1.28, 0, 0.65, 20), box(0.25, 0.12, 0.18, -0.9, 0, 0.7), cyl(0.012, 0.012, 0.28, -0.85, 0.12, 0.7, 8));
    }],
    pharma: [['Cleanroom suites', 'Process modules', 'Clean utilities', 'Air handling', 'Warehouse and QC labs', 'Site'], (a) => {
      a(5, slab(3.6, 2.2, 0));
      a(0, box(1.4, 0.16, 0.9, -0.3, 0, -0.1)); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) a(0, box(0.3, 0.12, 0.26, -0.82 + i * 0.35, 0, -0.42 + j * 0.3));
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) a(1, cyl(0.035, 0.035, 0.08, -0.82 + i * 0.35, 0.0, -0.42 + j * 0.3, 16), box(0.08, 0.02, 0.02, -0.76 + i * 0.35, 0.05, -0.42 + j * 0.3));
      for (let k = 0; k < 6; k++) a(2, cyl(0.04, 0.04, 0.22, 0.75 + (k % 3) * 0.12, 0, 0.45 + Math.floor(k / 3) * 0.14, 16), sph(0.04, 0.75 + (k % 3) * 0.12, 0.22, 0.45 + Math.floor(k / 3) * 0.14, Math.PI / 2));
      for (let k = 0; k < 5; k++) a(3, box(0.18, 0.06, 0.12, -0.8 + k * 0.28, 0.16, 0.2));
      a(4, box(0.6, 0.14, 0.5, 1.0, 0, -0.35)); for (let k = 0; k < 4; k++) a(4, box(0.5, 0.004, 0.42, 1.0, 0.03 + k * 0.03, -0.35));
    }],
    bridge: [['Towers', 'Stay cables', 'Deck', 'Piers', 'Water'], (a) => {
      a(4, slab(3.6, 1.6, -0.02));
      const dy = (x) => 0.24 + 0.045 * (1 - (x / 1.75) * (x / 1.75));
      for (let k = 0; k < 50; k++) { const x0 = -1.75 + k * 0.07, x1 = x0 + 0.07, y = dy((x0 + x1) / 2); a(2, box(0.071, 0.024, 0.1, (x0 + x1) / 2, y - 0.024, 0)); }
      [-0.85, 0, 0.85].forEach((xt) => { const g = new T.CylinderGeometry(0.018, 0.034, 0.7, 4, 1); g.rotateY(Math.PI / 4); g.scale(1, 1, 1.3); g.translate(xt, 0.33, 0); a(0, g); a(3, box(0.09, 0.06, 0.12, xt, -0.02, 0)); for (let k = 0; k < 18; k++) { const ya = 0.46 + k * 0.011, d = 0.05 + k * 0.024; [-1, 1].forEach((s) => a(1, bar([xt, ya, 0], [xt + s * d, dy(xt + s * d) + 0.004, 0], 0.0026))); } });
      for (let x = -1.72; x <= -1.15; x += 0.095) a(3, box(0.025, dy(x), 0.05, x, -0.02, 0)); for (let x = 1.15; x <= 1.72; x += 0.095) a(3, box(0.025, dy(x), 0.05, x, -0.02, 0));
    }],
    tower: [['Tower', 'Sky terrace', 'Spire', 'Tower crane', 'Podium', 'Site'], (a) => {
      a(5, slab(1.6, 1.4, 0)); a(4, box(0.72, 0.07, 0.6, 0, 0, 0));
      const rr = (th, y) => { let s = 0.07 - (0.022 * y) / 1.5; [[0, 1.18], [1, 1.27], [2, 1.36]].forEach(([k, hk]) => { if (y < hk) { const L = 0.25 * Math.pow(1 - y / hk, 0.75), th0 = (k * TAU) / 3 + Math.PI / 6, d = Math.atan2(Math.sin(th - th0), Math.cos(th - th0)), c = Math.max(0, Math.cos(d * 1.5)); s += L * c * c * c; } }); return s; };
      for (let y = 0.07; y < 1.42; y += 0.028) { const sh = new T.Shape(); for (let i = 0; i <= 72; i++) { const th = (i / 72) * TAU, r = rr(th, y); if (i === 0) sh.moveTo(r * Math.cos(th), r * Math.sin(th)); else sh.lineTo(r * Math.cos(th), r * Math.sin(th)); } const g = new T.ExtrudeGeometry(sh, { depth: 0.022, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); a(y > 1.0 && y < 1.07 ? 1 : 0, g); }
      a(2, cyl(0.002, 0.014, 0.2, 0, 1.42, 0, 12)); a(3, ...lattice(0.1, 0.0, 0.03, 0.03, 1.25, 0.37, 10, 0.003), bar([0.0, 1.62, 0], [0.48, 1.62, 0], 0.006), bar([0.0, 1.62, 0], [-0.15, 1.62, 0], 0.006), bar([0.4, 1.62, 0], [0.4, 1.45, 0], 0.002));
    }]
  };
  const NOTES = { dc: ['Site Vision / hall 2 at 58%', 'Generative Concepts / direct-to-chip cooling', 'Opportunity Map / turbine slots 2027', 'Costline / storage per kWh', 'Risk Analysis / energization P80 April', 'Cockpit / interconnection drift', 'Precedent / 64 comparable campuses'], ccgt: ['Generative Concepts / 2x1 H-class chosen', 'Generative Digital Twin / HRSG 1 modules set', 'Outturn Forecast / stack within P50', 'Site Vision / turbine hall 62% verified', 'Generative Scheduling / ACC fan deck critical', 'Opportunity Map / transformer 30 months', 'Precedent / 41 comparable plants'] };
  const cache = {};
  function industry(id) {
    if (cache[id]) return cache[id].clone();
    const [names, fn] = DEF[id], parts = names.map(() => []), spins = [];
    fn((r, ...g) => parts[r].push(...g), (geo, hub, ph) => spins.push({ geo, hub, ph }));
    const grp = new T.Group(), dim = /site|sea|valley|water$/i;
    parts.forEach((list, r) => { if (!list.length) return; const m = new T.Mesh(merge(list), S.mat(dim.test(names[r]) ? 'ground' : CYC[r % CYC.length])); m.userData = { region: r, name: names[r] }; grp.add(m); });
    spins.forEach((s) => { const m = new T.Mesh(s.geo, S.mat('cool')); m.position.set(...s.hub); m.rotation.z = s.ph; m.userData = { region: 0, name: names[0], spin: 0.55 }; grp.add(m); });
    const b = new T.Box3().setFromObject(grp), sz = b.getSize(new T.Vector3()), c = b.getCenter(new T.Vector3()), k = Math.min(3.3 / sz.x, 1.75 / sz.y, 2.4 / sz.z);
    const wrap = new T.Group(); grp.position.set(-c.x * k, -c.y * k, -c.z * k); grp.scale.setScalar(k); wrap.add(grp);
    const pl = new T.Mesh(new T.BoxGeometry(sz.x * k * 1.06, 0.06, sz.z * k * 1.06), S.mat('ground')); pl.position.set(0, -sz.y * k / 2 - 0.03, 0); pl.userData = { region: -1, dim: true }; wrap.add(pl);
    wrap.userData = { id, names, notes: NOTES[id] || names.map((n) => n), dim: names.map((n) => dim.test(n)) };
    cache[id] = wrap; return wrap.clone();
  }
  S.industry = industry; S.INDUSTRY_IDS = Object.keys(DEF); S.REGIONS = (id) => DEF[id][0];
  S.geo = { box, cyl, sph, bar, tube, lattice, taper, merge, surf };
})();
