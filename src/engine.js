/* Spur Labs engine: renders a composition to a low-resolution target, then draws it as characters inside a frame. */
(function () {
  const S = window.Spur, T = THREE, G = S.geo, TAU = Math.PI * 2;
  const COL = { warm: 0xece6da, cool: 0xf1f5f7, ice: 0xa3bccb, cyan: 0xa8dadc, teal: 0x5e8e8a, champ: 0xd8c29e, peach: 0xe39b85, ground: 0x151c1b };
  const clip = new T.Plane(new T.Vector3(0, -1, 0), 10);
  S.mat = (k, noclip) => new T.MeshLambertMaterial({ color: COL[k] || k, side: T.DoubleSide, clippingPlanes: noclip ? [] : [clip] });
  /* line-art: near-black faces, white feature edges and surface points, as in an isometric point-cloud render */
  const LM = { base: new T.LineBasicMaterial({ color: 0xc9d1d4, transparent: true, opacity: 0.34, blending: T.AdditiveBlending, depthWrite: false, clippingPlanes: [clip] }), dim: new T.LineBasicMaterial({ color: 0x6f7a7c, transparent: true, opacity: 0.2, blending: T.AdditiveBlending, depthWrite: false, clippingPlanes: [clip] }), hl: new T.LineBasicMaterial({ color: 0xd8c29e, transparent: true, opacity: 0.95, clippingPlanes: [clip] }), cyan: new T.LineBasicMaterial({ color: 0xa8dadc, transparent: true, opacity: 0.9, clippingPlanes: [clip] }) };
  const PM = { base: new T.PointsMaterial({ color: 0xd3dadc, size: 1.2, sizeAttenuation: false, transparent: true, opacity: 0.3, blending: T.AdditiveBlending, depthWrite: false, clippingPlanes: [clip] }), dim: new T.PointsMaterial({ color: 0x7d888a, size: 1.0, sizeAttenuation: false, transparent: true, opacity: 0.16, blending: T.AdditiveBlending, depthWrite: false, clippingPlanes: [clip] }), hl: new T.PointsMaterial({ color: 0xd8c29e, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.9, clippingPlanes: [clip] }), cyan: new T.PointsMaterial({ color: 0xa8dadc, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.85, clippingPlanes: [clip] }) };
  const FACE = new T.MeshBasicMaterial({ color: 0x0b0d0e, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, clippingPlanes: [clip] });
  const FACED = new T.MeshBasicMaterial({ color: 0x070809, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, clippingPlanes: [clip] });
  function sample(g, n) { const P = g.attributes.position.array, tri = P.length / 9, A = new Float64Array(tri); let tot = 0; const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(); for (let t = 0; t < tri; t++) { a.fromArray(P, t * 9); b.fromArray(P, t * 9 + 3); c.fromArray(P, t * 9 + 6); tot += b.sub(a).cross(c.sub(a)).length() / 2; A[t] = tot; } const out = new Float32Array(n * 3); for (let k = 0; k < n; k++) { const r = Math.random() * tot; let lo = 0, hi = tri - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m] < r) lo = m + 1; else hi = m; } let u = Math.random(), v = Math.random(); if (u + v > 1) { u = 1 - u; v = 1 - v; } const o = lo * 9; for (let d = 0; d < 3; d++) out[k * 3 + d] = P[o + d] + (P[o + 3 + d] - P[o + d]) * u + (P[o + 6 + d] - P[o + d]) * v; } const q = new T.BufferGeometry(); q.setAttribute('position', new T.BufferAttribute(out, 3)); return { geo: q, area: tot }; }
  function lineArt(root) {
    root.updateMatrixWorld(true); const ws = new T.Vector3();
    const list = []; root.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && !o.userData.la) list.push(o); });
    list.forEach((o) => {
      o.userData.la = 1; const hex = o.material && o.material.color ? o.material.color.getHex() : 0, tint = o.userData.dim ? 'dim' : o.userData.name ? 'base' : hex === COL.champ ? 'hl' : hex === COL.cyan ? 'cyan' : 'base';
      o.userData.tint = tint; o.material = o.userData.dim ? FACED : FACE;
      let g = o.geometry; if (g.index) g = g.toNonIndexed();
      const e = new T.LineSegments(new T.EdgesGeometry(o.geometry, 26), LM[tint]); e.userData.part = 'e'; o.add(e);
      o.getWorldScale(ws); const s1 = sample(g, 1), n = Math.min(o.userData.dim ? 900 : 16000, Math.max(40, Math.round(s1.area * ws.x * ws.x * (o.userData.dim ? 90 : 4200))));
      const pts = new T.Points(sample(g, n).geo, PM[tint]); pts.userData.part = 'p'; o.add(pts);
    });
    if (!root.userData.haze) { root.userData.haze = 1; const b = new T.Box3().setFromObject(root); if (!b.isEmpty()) { const n = 1400, P = new Float32Array(n * 3), sz = b.getSize(new T.Vector3()); for (let i = 0; i < n; i++) { P[i * 3] = b.min.x - sz.x * 0.05 + Math.random() * sz.x * 1.1; P[i * 3 + 1] = b.min.y + Math.pow(Math.random(), 3) * sz.y * 0.6; P[i * 3 + 2] = b.min.z - sz.z * 0.05 + Math.random() * sz.z * 1.1; } const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); root.add(new T.Points(g, PM.dim)); } }
    return root;
  }
  S.lineArt = lineArt;
  class Engine {
    constructor(canvas) {
      this.cv = canvas; this.r = new T.WebGLRenderer({ canvas, alpha: true, antialias: true }); this.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); this.r.localClippingEnabled = true; this.r.autoClear = false;
      this.scene = new T.Scene(); this.scene.add(new T.AmbientLight(0xffffff, 0.7)); 
      this.cam = new T.PerspectiveCamera(30, 1, 0.05, 200); this.scene.fog = new T.Fog(0x000000, 5, 20); this.root = new T.Group(); this.scene.add(this.root);
      this.key = ''; this.tr = null; this.alpha = 0; this.t = 0; this.mouse = { x: -999, y: -999 }; this.hover = -1; this.built = 0; this.ray = new T.Raycaster();
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.addEventListener('resize', () => this.resize()); window.addEventListener('pointermove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; }, { passive: true });
      this.resize(); this.last = performance.now(); const loop = (n) => { requestAnimationFrame(loop); const dt = Math.min(0.05, (n - this.last) / 1000); this.last = n; if (!document.hidden) this.frame(dt); }; requestAnimationFrame(loop);
    }
    refreshGlyphs() {}
    resize() { this.r.setSize(window.innerWidth, window.innerHeight, false); this.cv.style.width = '100%'; this.cv.style.height = '100%'; }
    set(v) { this.want = v; }
    apply(v) {
      const key = v ? JSON.stringify({ k: v.kind, m: v.model, s: v.stage, t: v.tool }) : '';
      if (key !== this.key) { this.key = key; while (this.root.children.length) this.root.remove(this.root.children[0]); this.comp = v ? S.compose(v) : null; if (this.comp) { this.root.add(this.comp); this.comp.updateMatrixWorld(true); const b = new T.Box3(); this.comp.traverse((o) => { if (o.isMesh && o.visible) b.expandByObject(o); }); if (b.isEmpty() || b.getSize(new T.Vector3()).length() < 0.5) b.setFromObject(this.comp); this.box = b; this.ylo = b.min.y; this.yhi = b.max.y; const cc = b.getCenter(new T.Vector3()); this.parts = []; this.comp.traverse((o) => { if (o.isMesh && o.userData.name && !o.userData.dim && o.userData.region >= 0) { const cw = new T.Box3().setFromObject(o).getCenter(new T.Vector3()), ps = o.parent.getWorldScale(new T.Vector3()).x || 1, d = cw.sub(cc); d.y = Math.max(0, d.y) * 0.6 + 0.14; this.parts.push({ o, base: o.position.clone(), d: d.multiplyScalar(0.5 / ps) }); } }); } this.built = this.t; }
    }
    frame(dt) {
      this.t += this.reduced ? 0 : dt; const v = this.want; this.apply(v);
      const r = this.r; r.setScissorTest(false); r.setClearColor(0x000000, 0); r.clear();
      const tr = v && v.rect; this.alpha += ((tr && this.comp ? 1 : 0) - this.alpha) * Math.min(1, dt * 4);
      if (tr) this.tr = tr.slice();
      if (!this.tr || this.alpha < 0.02 || !this.comp) return;
      const [x0, y0, x1, y1] = this.tr, w = Math.max(40, x1 - x0), h = Math.max(40, y1 - y0); if (y1 < 0 || y0 > window.innerHeight) return;
      const inside = this.mouse.x > x0 && this.mouse.x < x1 && this.mouse.y > y0 && this.mouse.y < y1, mx = inside ? (this.mouse.x - (x0 + x1) / 2) / w : 0;
      const yaw = (v.yaw != null ? v.yaw : 0.75) + mx * 0.6 + (v.spin === false ? 0 : this.t * 0.07), el = this.comp.userData.pitchFn ? this.comp.userData.pitchFn(this.t) : v.pitch != null ? v.pitch : 0.5;
      const sph = this.box.getBoundingSphere(new T.Sphere()), c = sph.center, rr = sph.radius, asp = w / h, vf = (30 * Math.PI) / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * asp), dist = (rr / Math.sin(Math.min(vf, hf) / 2)) * 0.8;
      this.cam.aspect = asp; this.cam.near = Math.max(0.05, dist - rr * 2); this.cam.far = dist + rr * 3; this.cam.position.set(c.x + Math.sin(yaw) * Math.cos(el) * dist, c.y + Math.sin(el) * dist, c.z + Math.cos(yaw) * Math.cos(el) * dist); this.cam.lookAt(c); this.cam.updateProjectionMatrix(); this.cam.updateMatrixWorld();
      this.scene.fog.near = dist - rr * 0.25; this.scene.fog.far = dist + rr * 1.7;
      const want = v.explode !== false && inside ? 1 : 0; this.ex = (this.ex || 0) + (want - (this.ex || 0)) * Math.min(1, dt * 5); (this.parts || []).forEach((q) => q.o.position.copy(q.base).addScaledVector(q.d, this.ex));
      const age = this.t - this.built, ass = this.reduced ? 1 : Math.min(1, age / 1.4), span = (this.yhi - this.ylo) || 1;
      clip.constant = this.ylo + span * (1 - Math.pow(1 - ass, 3)) * (v.completion != null ? v.completion : 1) + 0.002;
      this.comp.traverse((o) => { if (o.userData.spin) o.rotation.z += dt * o.userData.spin; if (o.userData.tick) o.userData.tick(this.t, dt); });
      let hl = v.highlight != null ? v.highlight : -1;
      if (v.hover && inside) { this.ray.setFromCamera({ x: ((this.mouse.x - x0) / w) * 2 - 1, y: -((this.mouse.y - y0) / h) * 2 + 1 }, this.cam); const hit = this.ray.intersectObjects(this.comp.children, true).find((q) => q.object.isMesh && q.object.userData.name && !q.object.userData.dim); this.hover = hit ? hit.object.userData.region : -1; if (this.hover >= 0) hl = this.hover; } else this.hover = -1;
      if (hl !== this.hlLast) { this.hlLast = hl; this.comp.traverse((o) => { if (!o.isMesh || !o.userData.tint) return; const on = hl >= 0 && o.userData.region === hl && o.userData.name; o.children.forEach((ch) => { if (ch.userData.part === 'e') ch.material = on ? LM.hl : LM[o.userData.tint]; if (ch.userData.part === 'p') ch.material = on ? PM.hl : PM[o.userData.tint]; }); }); }
      this.hl = hl; const H = window.innerHeight;
      [LM.base, PM.base, LM.dim, PM.dim].forEach((m) => { m.userData.o = m.userData.o || m.opacity; m.opacity = m.userData.o * this.alpha; });
      r.setViewport(x0, H - y1, w, h); r.setScissor(x0, H - y1, w, h); r.setScissorTest(true); r.render(this.scene, this.cam); r.setScissorTest(false); r.setViewport(0, 0, window.innerWidth, H);
    }
    project(obj) { const v = (obj.isVector3 ? obj.clone() : obj.getWorldPosition(new T.Vector3())).project(this.cam), tr = this.tr; if (!tr) return null; return { x: tr[0] + ((v.x + 1) / 2) * (tr[2] - tr[0]), y: tr[1] + ((1 - v.y) / 2) * (tr[3] - tr[1]), ok: Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 }; }
    regionAnchors() { const out = []; if (!this.comp) return out; this.comp.traverse((o) => { if (o.isMesh && o.userData.name && !o.userData.dim && out[o.userData.region] == null) { const b = new T.Box3().setFromObject(o), c = b.getCenter(new T.Vector3()); c.y = b.max.y; out[o.userData.region] = { p: c, name: o.userData.name, note: o.userData.note }; } }); return out; }
  }
  S.Engine = Engine;

  /* compositions */
  const tick = (o, f) => { o.userData.tick = f; return o; };
  const M = (geo, k, noclip) => new T.Mesh(geo, S.mat(k, noclip));
  const INST = new T.MeshBasicMaterial({ color: 0xf1f5f7 });
  const anchor = (x, y, z, label, sub) => { const o = new T.Object3D(); o.position.set(x, y, z); o.userData.cap = [label, sub || '']; return o; };
  function model(id) { const w = S.industry(id), names = w.userData.names, notes = w.userData.notes, dims = w.userData.dim; w.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.userData = Object.assign({}, o.userData, { note: notes[o.userData.region], dim: dims[o.userData.region] }); } }); return w; }
  S.compose = function (v) {
    const id = v.model || 'ccgt', grp = new T.Group();
    const CAM = { dc: [0.5, 4.5], solar: [0.55, 4.3], hvdc: [0.45, 4.7], fab: [0.45, 4.7], water: [0.5, 4.5], mine: [0.5, 4.6], lng: [0.42, 4.8], oil: [0.24, 5.2], ccgt: [0.42, 4.7], nuclear: [0.3, 5.2], wind: [0.14, 5.6], bridge: [0.2, 5.0], hydro: [0.34, 5.1], tower: [0.1, 5.9] };
    grp.userData.cam = v.kind === 'model' ? CAM[id] : [0.38, 5.6];
    grp.userData.reflect = v.kind === 'model' || v.kind === 'stage';
    if (v.kind === 'model') { grp.add(model(id)); return grp; }
    if (v.kind === 'overview') { const q = overview(id); q.userData.cam = [0.42, 7]; return q; }
    if (v.kind === 'layer') return layer(v.layer || 0, id);
    if (v.kind === 'tool') { const q = model(id); q.scale.setScalar(0.6); grp.add(q); (v.inputs || []).slice(0, 4).forEach((l, i) => { const y = 0.5 - i * 0.34, x = -2.1; grp.add(M(G.merge([0, 1, 2].map((k) => G.box(0.34, 0.006, 0.24, x + k * 0.02, y + k * 0.025, -k * 0.02))), 'cool', true), anchor(x, y + 0.15, 0, l), M(spiral([x + 0.2, y, 0], [-0.45, 0.05, 0], i % 2 ? 1 : -1), 'ice', true)); }); (v.outputs || []).slice(0, 4).forEach((l, i) => { const y = 0.5 - i * 0.34, x = 2.1; grp.add(M(G.merge([0.12, 0.2, 0.28, 0.17].map((hh, k) => G.box(0.06, hh, 0.06, x - 0.12 + k * 0.08, y - 0.12, 0))), 'champ', true), anchor(x, y + 0.22, 0, l), M(spiral([0.45, 0.05, 0], [x - 0.2, y, 0], i % 2 ? -1 : 1), 'ice', true)); }); grp.add(anchor(-2.1, 0.95, 0, 'In'), anchor(2.1, 0.95, 0, 'Out')); grp.userData.cam = [0.3, 6]; return grp; }
    if (v.kind === 'evidence') return evidence();
    if (v.kind === 'platform') { const q = platform(); q.userData.cam = [0.3, 7.2]; return q; }
    if (v.kind === 'process') { const q = process(); q.userData.cam = [0.28, 5.6]; return q; }
    const s = v.stage, m = model(id), b0 = new T.Box3().setFromObject(m), g = b0.min.y;
    const CRIT = { dc: 'power, fiber, water, land', ccgt: 'gas, grid, water, permits', nuclear: 'grid, cooling water, seismic, community', wind: 'wind resource, water depth, port distance', solar: 'irradiance, grid capacity, land', hvdc: 'route, land parcels, permits', lng: 'feed gas, harbour depth, offtake', oil: 'reservoir, water depth, tie-back', fab: 'power, water, talent, incentives', mine: 'ore grade, logistics, water', water: 'demand, intake, outfall', hydro: 'head, flow, geology', bridge: 'crossing, ground, traffic', tower: 'plot, zoning, demand', manufacturing: 'labour, logistics, power', pharma: 'talent, utilities, regulation' }[id] || 'fit, deliverability, permits';
    if (s === 0) {
      grp.add(M(G.surf(48, 28, (u, w2) => { const x = -2.0 + u * 4.0, z = -1.2 + w2 * 2.4; return [x, g + 0.05 * Math.sin(x * 1.7) * Math.cos(z * 1.3), z]; }), 'ground'));
      [[-1.35, -0.5, 8.1], [-0.15, 0.55, 7.2], [0.95, -0.45, 6.8], [1.6, 0.6, 5.9]].forEach(([x, z, sc], i) => { const best = i === 0, q = model(id); q.scale.setScalar(0.2); const qb = new T.Box3().setFromObject(q); q.position.set(x, g - qb.min.y + 0.01, z); grp.add(q, M(G.box(0.07, sc * 0.06, 0.07, x + 0.45, g, z), best ? 'champ' : 'ice', true), anchor(x + 0.45, g + sc * 0.06 + 0.07, z, 'Site ' + 'ABCD'[i] + ', fit ' + sc.toFixed(1), best ? 'Ranked on ' + CRIT : '')); });
      return grp;
    }
    if (s === 1) {
      (id === 'dc' ? [[-1.25, 'Air-cooled', [0.42, 0.3, 0.36]], [0, 'Liquid-cooled, recommended', [0.46, 0.24, 0.3]], [1.25, 'Phased build', [0.36, 0.38, 0.4]]] : [[-1.25, 'Option A', [0.42, 0.3, 0.36]], [0, 'Option B, recommended', [0.48, 0.22, 0.28]], [1.25, 'Option C', [0.32, 0.4, 0.42]]]).forEach(([x, l, bars], i) => { const q = model(id); q.scale.setScalar(0.34); if (i === 0) q.traverse((o) => { if (o.userData.region === 3) o.visible = false; }); if (i === 2) q.traverse((o) => { if (o.userData.region === 1 || o.userData.region === 4) o.visible = false; }); q.position.x = x; grp.add(q); bars.forEach((hh, k) => grp.add(M(G.box(0.08, hh, 0.08, x - 0.14 + k * 0.14, g, 0.95), i === 1 ? 'champ' : 'ice', true))); grp.add(anchor(x, g + 0.48, 0, l, i === 1 ? 'Lowest lifetime cost' : '')); });
      grp.add(anchor(-1.4, g + 0.12, 1.0, id === 'dc' ? 'Capex $10 to $15 per watt by region' : 'Capex, opex, levelized cost', id === 'dc' ? 'liquid cooling +7 to 10% (Turner & Townsend)' : 'per option, from Costline'));
      return grp;
    }
    if (s === 2) { m.scale.setScalar(0.6); m.position.x = -0.75; grp.add(m); [2, 4, 7, 9, 8, 5, 3, 2, 1].forEach((n, i) => grp.add(M(G.box(0.1, n * 0.06, 0.1, 0.45 + i * 0.13, g, 0), i === 3 ? 'champ' : 'ice', true))); grp.add(anchor(1.0, g + 0.62, 0, '41 comparable plants', 'cost per kW'), anchor(0.84, g + 0.58, 0, 'This project', 'P46')); return grp; }
    if (s === 3) { m.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.wireframe = true; } }); grp.add(m); [[0, 0.3], [0.05, 0.55], [0.08, 0.6], [0.22, 0.5], [0.45, 0.75], [0.5, 0.82], [0.7, 0.9], [0.88, 0.98]].forEach(([a0, a1], i) => grp.add(M(G.box((a1 - a0) * 3, 0.035, 0.03, -1.5 + ((a0 + a1) / 2) * 3, g - 0.12 - i * 0.06, 0.95), [1, 2, 4, 6, 7].includes(i) ? 'champ' : 'ice', true))); grp.add(anchor(-1.5, g - 0.06, 0.95, 'Schedule', '1,840 activities'), anchor(0.9, g - 0.32, 0.95, 'Critical path', 'gas turbines')); return grp; }
    if (s === 4) { m.scale.setScalar(0.68); m.position.x = -0.75; grp.add(m); const P = []; for (let i = 0; i <= 40; i++) { const u = i / 40; P.push([0.3 + u * 1.4, g + 0.6 / (1 + Math.exp(-(u - 0.5) / 0.12)), 0]); } grp.add(M(G.tube(P, 0.012, 80), 'ice', true)); [[0.5, 'P50', '$2.36B'], [0.8, 'P80', '$2.52B']].forEach(([p, l, s2]) => { const u = 0.5 + Math.log(p / (1 - p)) * 0.12, x = 0.3 + u * 1.4, y = g + p * 0.6; grp.add(M(G.sph(0.04, x, y, 0), 'champ', true), anchor(x, y + 0.06, 0, l, s2)); }); return grp; }
    if (s === 5) { const ctr = b0.getCenter(new T.Vector3()); m.traverse((o) => { if (o.isMesh && !o.userData.dim) { const c = new T.Box3().setFromObject(o).getCenter(new T.Vector3()); o.position.add(c.sub(ctr).multiplyScalar(0.55 / m.children[0].scale.x)); o.position.y += 0.1 / m.children[0].scale.x; } }); grp.add(m); [[-1.1, 'Contractor B', 'power island'], [0, 'Contractor A', 'air-cooled condenser'], [1.1, 'Contractor C', 'switchyard']].forEach(([x, l, s2]) => grp.add(M(G.sph(0.07, x, g + 0.95, 0), 'champ', true), M(G.tube([[x * 0.7, g + 0.3, 0], [x * 0.85, g + 0.6, 0], [x, g + 0.88, 0]], 0.005), 'ice', true), anchor(x, g + 1.05, 0, l, s2))); return grp; }
    if (s === 6 || s === 9) {
      grp.add(m);
      if (s === 6) [[-0.75, -0.55, 0], [0.75, 0.5, 2.2]].forEach(([x, z, ph], i) => { grp.add(M(G.merge(G.lattice(x, z, 0.035, 0.035, g, 0.78, 14, 0.003)), 'champ', true)); const jib = M(G.merge([G.box(0.75, 0.02, 0.02, 0.18, 0, 0), G.box(0.006, 0.12, 0.006, 0.4, -0.12, 0)]), 'champ', true); jib.position.set(x, g + 0.78, z); jib.rotation.y = ph; grp.add(tick(jib, (t) => { jib.rotation.y = ph + t * 0.25; })); grp.add(anchor(x, g + 0.85, z, 'Crane C-' + (i + 1))); });
      return grp;
    }
    if (s === 8) { m.traverse((o) => { if (o.isMesh) o.userData.glow = 1; }); grp.add(m); const n = 90, im = new T.InstancedMesh(new T.SphereGeometry(0.012, 6, 4), INST, n), d = new T.Object3D(); const P = new T.CatmullRomCurve3([new T.Vector3(1.2, g + 0.15, 0.4), new T.Vector3(1.6, g + 0.3, 0.6), new T.Vector3(2.2, g + 0.25, 1.0)]); grp.add(tick(im, (t) => { for (let i = 0; i < n; i++) { const u = (i / n + t * 0.08) % 1, p = P.getPoint(u); d.position.copy(p); d.updateMatrix(); im.setMatrixAt(i, d.matrix); } im.instanceMatrix.needsUpdate = true; })); return grp; }
    grp.add(m); return grp;
  };
  function spiralPts(a, b, dir) { const P = []; for (let i = 0; i <= 48; i++) { const t = i / 48, r = 0.22 * Math.sin(Math.PI * t), an = t * 4 * Math.PI * dir; P.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.cos(an) * r, a[2] + (b[2] - a[2]) * t + Math.sin(an) * r]); } return P; }
  const spiral = (a, b, dir) => G.tube(spiralPts(a, b, dir), 0.0035, 90);
  function rings(names, per, r0, dr, dy, items) {
    const grp = new T.Group(), n = names.length, tot = n * per, im = new T.InstancedMesh(new T.BoxGeometry(0.012, 0.034, 0.005), new T.MeshBasicMaterial({ color: 0xd9d3c6, transparent: true, opacity: 0.85 }), tot), d = new T.Object3D(), pos = [];
    for (let k = 0; k < n; k++) { const r = r0 + k * dr, y = k * dy, m = Math.round(per * (0.55 + 0.45 * Math.random())); for (let j = 0; j < per; j++) { const a = (j / per) * TAU * (m / per) + k * 0.4; d.position.set(Math.cos(a) * r, y, Math.sin(a) * r); d.rotation.set(0, -a, 0); d.scale.setScalar(j < m ? 1 : 0.0001); d.updateMatrix(); im.setMatrixAt(k * per + j, d.matrix); pos.push(d.position.clone()); }
      const lp = []; for (let j = 0; j <= 96; j++) { const a = (j / 96) * TAU; lp.push(new T.Vector3(Math.cos(a) * (r + 0.03), y - 0.02, Math.sin(a) * (r + 0.03))); } grp.add(new T.Line(new T.BufferGeometry().setFromPoints(lp), new T.LineBasicMaterial({ color: 0x8a6f5a, transparent: true, opacity: 0.45 })));
      grp.add(anchor(Math.cos(k * 0.4 - 0.25) * (r + 0.08), y + 0.06, Math.sin(k * 0.4 - 0.25) * (r + 0.08), names[k])); }
    grp.add(im); const L = []; for (let q = 0; q < 900; q++) { const a = pos[(Math.random() * pos.length) | 0], b = pos[(Math.random() * pos.length) | 0]; L.push(a.x, a.y, a.z, b.x, b.y, b.z); } const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(L, 3)); grp.add(new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0xb8b2a6, transparent: true, opacity: 0.07, blending: T.AdditiveBlending, depthWrite: false })));
    return grp;
  }
  function overview(id) {
    const grp = new T.Group(), kids = []; grp.userData.cam = [0.46, 7.4]; grp.userData.reflect = false;
    for (let s = 0; s < 10; s++) { const c = S.compose({ kind: 'stage', stage: s, model: id || 'ccgt' }); c.traverse((o) => { if (o.userData.cap) o.userData.capStage = s; }); const w = new T.Group(); w.add(c); w.position.set(-2.7 + (s % 5) * 1.35, 0, s < 5 ? -0.85 : 0.85); w.scale.setScalar(0.42); grp.add(w); kids.push(w); const nm = anchor(w.position.x, -0.55, w.position.z + 0.5, String(s + 1).padStart(2, '0') + ' ' + ['Opportunity', 'Concept', 'Selection', 'Definition', 'FID', 'Contracting', 'Execution', 'Commissioning', 'Operations', 'End of life'][s]); grp.add(nm); }
    const gate = M(G.box(0.012, 0.9, 0.5, 2.7 + 0.72, -0.45, -0.85), 'champ', true); grp.add(gate, anchor(2.7 + 0.72, 0.55, -0.85, 'FID', 'final investment decision'));
    grp.add(M(G.box(6.4, 0.006, 0.006, 0, -0.5, -0.35), 'ice', true), M(G.box(6.4, 0.006, 0.006, 0, -0.5, 1.35), 'ice', true));
    tick(grp, () => { const sel = (S.engine.want && S.engine.want.sel != null) ? S.engine.want.sel : -1; kids.forEach((w, s) => { const on = s === sel, k = on ? 0.56 : sel >= 0 ? 0.38 : 0.42; w.scale.setScalar(w.scale.x + (k - w.scale.x) * 0.12); w.position.y += ((on ? 0.2 : 0) - w.position.y) * 0.12; }); });
    return grp;
  }
  function layer(k, id) {
    const grp = new T.Group(), hub = model(id || 'ccgt');
    if (k === 0) {
      hub.scale.setScalar(0.7); grp.add(hub);
      const wp = [['Concepts generated', -1.9, 0.5, (x, y) => [0, 1, 2].map((q) => G.box(0.32, 0.004, 0.22, x + q * 0.05, y + q * 0.03, -q * 0.05))], ['Schedule generated', 1.9, 0.5, (x, y) => [0.2, 0.34, 0.26, 0.4, 0.3].map((w2, q) => G.box(w2, 0.02, 0.03, x - 0.15 + q * 0.05 + w2 / 2, y + q * 0.04, 0))], ['Estimate built', -1.9, -0.2, (x, y) => [0.1, 0.16, 0.24, 0.18, 0.3].map((h2, q) => G.box(0.04, h2, 0.04, x - 0.12 + q * 0.06, y, 0))], ['Documents read and cited', 1.9, -0.2, (x, y) => [0, 1, 2, 3].map((q) => G.box(0.24, 0.006, 0.3, x + q * 0.02, y + q * 0.02, 0))], ['Progress measured from imagery', 0, 0.85, (x, y) => [G.box(0.08, 0.02, 0.08, x, y, 0), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => G.cyl(0.04, 0.04, 0.006, x + a * 0.07, y + 0.02, b * 0.07, 16, true))]]];
      wp.forEach(([l, x, y, f]) => { grp.add(M(G.merge(f(x, y)), 'cool', true), anchor(x, y + 0.32, 0, l), M(G.tube([[x * 0.85, y, 0], [x * 0.4, y * 0.6 + 0.1, 0.1], [0, 0.05, 0]], 0.004), 'ice', true)); });
    } else if (k === 1) {
      hub.scale.setScalar(0.62); grp.add(hub);
      const N = [['Cost', 0], ['Schedule', 1], ['Risk', 2], ['Contract', 3], ['Stakeholders', 4], ['Stage gates', 5]];
      N.forEach(([l, i]) => { const a = (i / 6) * TAU, x = Math.cos(a) * 1.85, z = Math.sin(a) * 0.95, b = ((i + 1) / 6) * TAU; grp.add(M(G.sph(0.07, x, 0.15, z), 'champ', true), anchor(x, 0.3, z, l), M(G.tube([[x, 0.15, z], [x * 0.5, 0.35, z * 0.5], [0, 0.2, 0]], 0.005), 'ice', true), M(G.tube([[x, 0.15, z], [(x + Math.cos(b) * 1.85) / 2 * 1.08, 0.15, (z + Math.sin(b) * 0.95) / 2 * 1.08], [Math.cos(b) * 1.85, 0.15, Math.sin(b) * 0.95]], 0.003), 'ice', true)); });
    } else {
      const R = rings(['Data centers', 'Power', 'Nuclear', 'Offshore wind', 'Solar and storage', 'Transmission', 'LNG', 'Oil and gas', 'Semiconductors', 'Mining', 'Water', 'Hydropower', 'Transport', 'Real estate'], 150, 0.5, 0.12, 0.09); grp.add(R); grp.add(anchor(0, 0.7, 0, '20,000+ completed projects', 'with their documents and lessons'));
      grp.userData.pitchFn = (t) => 0.45 + 0.6 * (0.5 + 0.5 * Math.cos(t * 0.22)); grp.userData.cam = [0.6, 6]; return grp;
    }
    grp.userData.cam = [0.5, 6]; return grp;
  }
  function evidence() {
    const grp = new T.Group(); grp.userData.cam = [0.42, 7.4]; const n = 20000, P = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const r = 2.3 * Math.sqrt(Math.random()) , a = Math.random() * TAU; P[i * 3] = 0.55 + r * Math.cos(a); P[i * 3 + 1] = -0.55 + (Math.random() - 0.5) * 0.08 * (1 - r / 2.3); P[i * 3 + 2] = r * Math.sin(a) * 0.62; }
    const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.BufferAttribute(P, 3)); grp.add(new T.Points(gg, new T.PointsMaterial({ color: 0xc9d3d6, size: 1.2, sizeAttenuation: false, transparent: true, opacity: 0.45 })));
    const H = [2, 4, 7, 9, 8, 5, 3, 2, 1]; H.forEach((h, i) => { for (let k = 0; k < h; k++) grp.add(M(G.sph(0.045, 1.35 + i * 0.13, 0.05 + k * 0.1, 0), i === 3 ? 'champ' : 'cyan', true)); });
    const pm = model('ccgt'); pm.scale.setScalar(0.42); pm.position.set(-1.75, 0.2, 0.2); grp.add(pm);
    grp.add(M(G.tube([[-1.2, 0.45, 0.2], [-0.2, 0.95, 0.1], [1.05, 0.6, 0]], 0.008, 60), 'champ', true));
    grp.add(anchor(-1.75, 0.62, 0.2, 'Inside view', 'the project’s own estimate'), anchor(1.85, 1.0, 0, 'Outside view', 'comparable completed projects'), anchor(1.74, 0.5, 0, 'This project', 'P46 of 41 comparables'), anchor(-0.3, -0.5, 1.45, 'Evidence base', '20,000+ completed projects'));
    return grp;
  }
  function platform() {
    const grp = new T.Group(), y3 = -0.78, y2 = 0.02, y1 = 0.78;
    grp.add(M(G.box(3.2, 0.012, 1.3, 0, y3 - 0.012, 0), 'ground', true));
    const ids = ['dc', 'ccgt', 'nuclear', 'wind', 'lng', 'bridge', 'mine', 'fab', 'hydro', 'solar'];
    ids.forEach((id, i) => { const q = model(id); q.scale.setScalar(0.15); q.position.set(-1.35 + (i % 5) * 0.68, y3 + 0.08, (Math.floor(i / 5) - 0.5) * 0.6); grp.add(q); });
    [3, 5, 8, 11, 9, 6, 4, 2].forEach((n, i) => grp.add(M(G.box(0.05, n * 0.02, 0.05, 1.52, y3, -0.45 + i * 0.12), 'champ', true)));
    const hub = model('ccgt'); hub.scale.setScalar(0.32); hub.position.set(0, y2, 0); grp.add(hub);
    const nodes = [['Cost', -1.3, 0.1], ['Schedule', -0.65, -0.55], ['Risk', 0.65, -0.55], ['Contract', 1.3, 0.1], ['Delivery', 0, 0.62]];
    nodes.forEach(([l, x, z]) => grp.add(M(G.sph(0.055, x, y2 + 0.05, z), 'champ', true), M(G.tube([[x, y2 + 0.05, z], [x * 0.5, y2 + 0.1, z * 0.5], [0, y2 + 0.05, 0]], 0.006), 'ice', true), anchor(x, y2 + 0.13, z, l)));
    const wp = [['Estimate', -1.3, (gx, gy) => { const L = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) L.push(G.box(0.07, 0.012, 0.045, gx - 0.12 + i * 0.08, gy + j * 0.03, 0)); return L; }], ['Schedule', -0.65, (gx, gy) => [0.1, 0.18, 0.12, 0.22].map((w, i) => G.box(w, 0.018, 0.03, gx - 0.1 + i * 0.05 + w / 2, gy + i * 0.035, 0))], ['Drawing', 0, (gx, gy) => [G.box(0.28, 0.006, 0.18, gx, gy, 0), ...G.lattice(gx, 0, 0.12, 0.08, gy + 0.006, 0.1, 2, 0.003)]], ['Document', 0.65, (gx, gy) => [0, 1, 2].map((k) => G.box(0.2, 0.012, 0.26, gx + k * 0.012, gy + k * 0.016, -k * 0.01))], ['Site imagery', 1.3, (gx, gy) => [G.box(0.06, 0.02, 0.06, gx, gy + 0.08, 0), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => G.cyl(0.035, 0.035, 0.006, gx + a * 0.06, gy + 0.1, b * 0.06, 16, true)), G.cyl(0.11, 0.2, 0.002, gx, gy, 0, 24, true)]]];
    wp.forEach(([l, x, f], i) => { grp.add(M(G.merge(f(x, y1)), 'cool', true), anchor(x, y1 + 0.2, 0, l)); const n = nodes[i]; grp.add(M(G.tube([[x, y1 - 0.02, 0], [(x + n[1]) / 2, (y1 + y2) / 2, n[2] / 2], [n[1], y2 + 0.1, n[2]]], 0.004), 'ice', true)); });
    for (let i = 0; i < 6; i++) { const x = -1.2 + i * 0.48; grp.add(M(G.tube([[x, y3 + 0.1, 0.1], [x * 0.6, (y3 + y2) / 2, 0.05], [0, y2 - 0.02, 0]], 0.004), 'teal', true)); }
    grp.userData.layers = [y1, y2, y3];
    grp.add(anchor(-1.62, y1 + 0.02, 0, 'Frontline productivity'), anchor(-1.62, y2 + 0.02, 0.62, 'Integrated intelligence'), anchor(-1.62, y3 + 0.02, 0.5, 'Portfolio learning'));
    return grp;
  }
  function process() {
    const grp = new T.Group(), hub = model('ccgt'); hub.scale.setScalar(0.55); grp.add(hub); const RG = rings(['Contracts', 'Schedules', 'Estimates', 'Drawings and models', 'Site imagery', 'Stakeholder responses', 'Operating data'], 110, 1.35, 0.14, 0.0); RG.position.y = -0.28; grp.add(tick(RG, (t) => { RG.rotation.y = t * 0.04; }));
    const n = 60, docs = new T.InstancedMesh(new T.BoxGeometry(0.06, 0.004, 0.08), INST, n), outs = new T.InstancedMesh(new T.SphereGeometry(0.018, 8, 6), INST, n), d = new T.Object3D();
    const lane = (k, side) => new T.CatmullRomCurve3(spiralPts(side < 0 ? [-2.3, (k - 2) * 0.34, 0] : [0.45, (k - 2) * 0.03, 0], side < 0 ? [-0.45, (k - 2) * 0.03, 0] : [2.3, (k - 2) * 0.34, 0], k % 2 ? 1 : -1).map((q) => new T.Vector3(q[0], q[1], q[2])));
    const LI = [0, 1, 2, 3, 4].map((k) => lane(k, -1)), LO = [0, 1, 2, 3, 4].map((k) => lane(k, 1));
    LI.concat(LO).forEach((c) => grp.add(M(new T.TubeGeometry(c, 40, 0.003, 4, false), 'teal', true)));
    grp.add(tick(docs, (t) => { for (let i = 0; i < n; i++) { const u = (i / n * 5 + t * 0.12) % 1, p = LI[i % 5].getPoint(u); d.position.copy(p); d.rotation.set(0.3, t + i, 0); d.updateMatrix(); docs.setMatrixAt(i, d.matrix); } docs.instanceMatrix.needsUpdate = true; }));
    grp.add(tick(outs, (t) => { for (let i = 0; i < n; i++) { const u = (i / n * 5 + t * 0.12) % 1, p = LO[i % 5].getPoint(u); d.position.copy(p); d.rotation.set(0, 0, 0); d.updateMatrix(); outs.setMatrixAt(i, d.matrix); } outs.instanceMatrix.needsUpdate = true; }));
    return grp;
  }
  const _compose = S.compose; S.compose = (v) => lineArt(_compose(v));
})();
