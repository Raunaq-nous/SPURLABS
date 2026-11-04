/* SPURLABS site: sections drive the character renderer inside each visual frame. */
(function () {
  const S = window.Spur, D = S.DATA, $ = (s, el) => (el || document).querySelector(s), $$ = (s, el) => [...(el || document).querySelectorAll(s)];
  const eng = new S.Engine($('#scene')); S.engine = eng;
  /* light and dark: dark is the default; the choice is remembered on this device */
  const themeBtn = $('#theme-t'), root = document.documentElement;
  const applyTheme = (light) => { if (light) root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme'); eng.setTheme(light);
    if (themeBtn) { themeBtn.setAttribute('aria-pressed', String(light)); themeBtn.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode'); }
    const mc = document.querySelector('meta[name="theme-color"]'); if (mc) mc.setAttribute('content', light ? '#F4F2EE' : '#0A0A0B'); };
  applyTheme(root.getAttribute('data-theme') === 'light');
  if (themeBtn) themeBtn.addEventListener('click', (e) => { e.stopPropagation(); const light = root.getAttribute('data-theme') !== 'light'; applyTheme(light); try { localStorage.setItem('spur-theme', light ? 'light' : 'dark'); } catch (_) {} });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => eng.refreshGlyphs());
  const TOOL = Object.fromEntries(D.tools.map((t) => [t.id, t])), STG = D.stages, SI = Object.fromEntries(STG.map((s, i) => [s.id, i]));
  /* auto-advance with progress bars; scrolling speeds it up */
  const AUTO = {}; let sv = 0, lastSY = scrollY, lastAT = 0, hoverFlag = '';
  const pauseAuto = (k) => { (AUTO[k] = AUTO[k] || { acc: 0, hold: 0 }).hold = 9; };
  const stepAuto = (k, t, dur, n, cur, set, bar) => { const a = (AUTO[k] = AUTO[k] || { acc: 0, hold: 0 }); const dt = a.t == null ? 0 : Math.min(0.1, Math.max(0, t - a.t)); a.t = t; const boost = 1 + Math.min(7, sv / 5);
    if (a.hold > 0) a.hold -= dt; else if (hoverFlag !== k) a.acc += dt * boost; if (a.acc >= dur) { a.acc = 0; set((cur + 1) % n); } const el = bar(); if (el) el.style.setProperty('--p', (a.acc / dur).toFixed(3)); };
  const tl = (id) => '<a href="#tool/' + id + '">' + TOOL[id].name + '</a>';
  const PHRASE = { dc: 'a data center', ccgt: 'a power plant', nuclear: 'a nuclear plant', wind: 'an offshore wind farm', solar: 'a solar and storage project', hvdc: 'a transmission project', lng: 'an LNG terminal', oil: 'an oil and gas field', fab: 'a semiconductor fab', mine: 'a mine', water: 'a water plant', hydro: 'a hydropower dam', bridge: 'a bridge or railway', tower: 'a supertall', manufacturing: 'a manufacturing plant', pharma: 'a pharma facility' };
  const IND_TOOLS = { dc: ['generative-concepts', 'cost-line', 'generative-twin', 'opportunity-map', 'cockpit'], ccgt: ['generative-concepts', 'cost-line', 'investment-case', 'outturn', 'asset-potential'], nuclear: ['outturn', 'risk-analysis', 'generative-twin', 'cockpit', 'forensic'], wind: ['opportunity-map', 'risk-analysis', 'generative-twin', 'cost-line'], solar: ['generative-concepts', 'cost-line', 'investment-case', 'asset-potential'], hvdc: ['generative-scheduling', 'risk-analysis', 'cockpit', 'opportunity-map'], lng: ['generative-concepts', 'cost-line', 'outturn', 'forensic'], oil: ['outturn', 'realityscan', 'generative-twin', 'risk-analysis'], fab: ['generative-twin', 'generative-scheduling', 'cost-line', 'cockpit'], mine: ['realityscan', 'generative-concepts', 'investment-case', 'risk-analysis'], water: ['realityscan', 'outturn', 'cost-line', 'generative-twin'], hydro: ['outturn', 'risk-analysis', 'forensic', 'cockpit'], bridge: ['outturn', 'cockpit', 'forensic', 'lessons-learned'], manufacturing: ['generative-scheduling', 'cost-line', 'generative-twin', 'stage-gate'], pharma: ['stage-gate', 'generative-twin', 'cost-line', 'lessons-learned'], tower: ['cost-line', 'generative-twin', 'generative-scheduling', 'cockpit'] };
  const IND = D.industries, IX = Object.fromEntries(D.industries.map((x) => [x.id, x])), SD = D.stages_detail, LAYER = Object.fromEntries(D.layers.map((l) => [l.id, l]));

  /* tools menu */
  $('#tools-menu').innerHTML = D.layers.map((l) => '<div><p>' + l.name + '</p>' + D.tools.filter((t) => t.layer === l.id).map((t) => '<a href="#tool/' + t.id + '"><b>' + t.name + '</b><span>' + t.line + '</span></a>').join('') + '</div>').join('');
  const tb = $('#tools-btn'), tp = $('#tools-menu'), closeTools = () => { $$('.tm-panel').forEach((x) => (x.hidden = true)); $$('.tm > button').forEach((x) => x.setAttribute('aria-expanded', 'false')); };

  document.addEventListener('click', (e) => { if (!e.target.closest('.tm')) closeTools(); if (!e.target.closest('.dd')) $$('.dd ul').forEach((u) => (u.hidden = true)); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeTools(); $$('.dd ul').forEach((u) => (u.hidden = true)); } });

  /* hero: inline dropdowns for stage and industry */
  const H = { stage: -1, ind: -1, cyc: 0, at: 0, auto: 0 };
  function fit() { const h1 = $('.hero .h1'), box = $('.hero-txt'); if (!h1 || !box) return; if (innerWidth < 1000) { h1.style.fontSize = ''; return; } let fs = Math.min(62, innerWidth * 0.037); h1.style.fontSize = fs + 'px'; while (h1.scrollWidth > box.clientWidth && fs > 24) { fs -= 1; h1.style.fontSize = fs + 'px'; } }
  window.addEventListener('resize', fit);
  function dd(el, opts, get, set) {
    const draw = () => { el.innerHTML = '<button type="button" aria-haspopup="listbox" aria-expanded="false">' + opts[get() + 1][1] + '</button><ul role="listbox" hidden>' + opts.map((o, i) => '<li><button type="button" role="option" data-i="' + (i - 1) + '" aria-selected="' + (i - 1 === get()) + '">' + o[0] + '</button></li>').join('') + '</ul>'; const b = el.firstChild, u = el.lastChild; b.onclick = (e) => { e.stopPropagation(); const o = u.hidden; $$('.dd ul').forEach((x) => (x.hidden = true)); u.hidden = !o; b.setAttribute('aria-expanded', String(o)); }; u.onclick = (e) => { const q = e.target.closest('[data-i]'); if (!q) return; set(+q.dataset.i); draw(); hero(); }; };
    draw();
  }
  dd($('#dd-stage'), [['Every stage', 'every stage']].concat(STG.map((s) => [s.name, 'the ' + s.name.toLowerCase().replace('end of life', 'end-of-life') + ' stage'])), () => H.stage, (v) => (H.stage = v));
  dd($('#dd-ind'), [['Any capital project', 'a capital project']].concat(IND.map((x) => [x.name, PHRASE[x.id]])), () => H.ind, (v) => (H.ind = v));
  function hero() {
    const st = H.stage >= 0 ? STG[H.stage] : null, ind = H.ind >= 0 ? IND[H.ind] : null; let h = '';
    if (!st && !ind) h = '<p class="sub">SPURLABS tests every capital decision against what comparable completed projects actually achieved, and keeps every stakeholder aligned from the first opportunity to the final day.</p><div class="cta"><a class="btn" href="mailto:spurlabs@gmail.com?subject=SPURLABS%20briefing">Request a briefing</a><button type="button" class="lnk" data-go="lifecycle">See the lifecycle</button></div>';
    else {
      const q = st ? st.q : ind.line, list = st ? D.tools.filter((t) => t.stages[st.id]).filter((t) => !ind || IND_TOOLS[ind.id].includes(t.id) || D.tools.filter((x) => x.stages[st.id]).length <= 4).slice(0, 5).map((t) => [t.id, t.stages[st.id]]) : IND_TOOLS[ind.id].map((id) => [id, TOOL[id].line]);
      const use = list.length ? list : D.tools.filter((t) => t.stages[st.id]).slice(0, 5).map((t) => [t.id, t.stages[st.id]]);
      h = '<p class="q">' + q + (st && ind ? ' <span style="color:var(--mute)">' + ind.line + '</span>' : '') + '</p><ul>' + use.map(([id, w]) => '<li>' + tl(id) + '<span>' + w + '</span></li>').join('') + '</ul>';
    }
    $('#hd').innerHTML = h; H.at = (window.Spur.engine || { t: 0 }).t; fit();
  }
  hero();

  /* menus to every page */
  const MENUS = { 'm-life': STG.map((st) => ['#stage/' + st.id, st.name, st.alias || st.phase]), 'm-ind': IND.map((x) => ['#industry/' + x.id, x.name, x.line]), 'm-cust': D.customers.map((c) => ['#customer/' + c.id, c.name, c.value]) };
  Object.entries(MENUS).forEach(([id, L]) => { const el = document.getElementById(id); if (el) el.innerHTML = '<div>' + L.map(([h, a, b]) => '<a href="' + h + '"><b>' + a + '</b><span>' + b + '</span></a>').join('') + '</div>'; });
  $$('.tm > button').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); const p = b.nextElementSibling, o = p.hidden; $$('.tm-panel').forEach((x) => (x.hidden = true)); $$('.tm > button').forEach((x) => x.setAttribute('aria-expanded', 'false')); p.hidden = !o; b.setAttribute('aria-expanded', String(o)); }));
  /* the story */
  const STEPS = [['Find', 'the right project'], ['Shape', 'the concept, the cost and the case'], ['Plan', 'the build, generated and linked to the model'], ['Test', 'every number against reality'], ['Decide', 'at each gate and at FID'], ['Align', 'every stakeholder'], ['Deliver', 'to the approved case'], ['Recover', 'when a project is in trouble'], ['Operate', 'to full potential']];
  if ($('#story-list')) $('#story-list').innerHTML = STEPS.map(([k, w], i) => '<li><span class="n">' + String(i + 1).padStart(2, '0') + '</span><b>' + k + '</b><em>' + w + '</em><span class="t">' + D.tools.filter((t) => t.step === k).map((t) => tl(t.id)).join('') + '</span></li>').join('');
  const card = (v) => { const t = TOOL[v.answer]; return '<figure class="vc"><blockquote>' + v.said + '</blockquote><figcaption>' + v.role + '</figcaption><a class="shot" href="#tool/' + t.id + '" aria-label="Open ' + t.name + '"><span class="bar"><i></i><i></i><i></i><b>' + t.name + '</b></span><span class="body2">' + t.features.slice(0, 3).map((f, k) => '<span class="row"><em>' + f[0] + '</em><u style="--w:' + [86, 64, 74][k] + '%"></u></span>').join('') + '</span><span class="by">Answered by ' + t.name + ' →</span></a></figure>'; };
  const VH = D.voices.map(card).join('');
  $('#voices-list').innerHTML = '<div class="mq-track"><div class="mq-set">' + VH + '</div><div class="mq-set" aria-hidden="true">' + VH + '</div></div>';
  (() => { const m = $('#voices-list'), tr = m.firstChild; let x = 0, v = 0, hov = false, w = 1; const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (rm) { m.classList.add('static'); return; }
    m.addEventListener('mouseenter', () => (hov = true)); m.addEventListener('mouseleave', () => (hov = false));
    m.addEventListener('wheel', (e) => { const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (!d) return; v += d * 0.35; v = Math.max(-60, Math.min(60, v)); if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.preventDefault(); }, { passive: false });
    let down = false, lx = 0; m.addEventListener('pointerdown', (e) => { if (e.target.closest('a')) return; down = true; lx = e.clientX; }); addEventListener('pointerup', () => (down = false)); addEventListener('pointermove', (e) => { if (down) { v = -(e.clientX - lx) * 1.2; x -= e.clientX - lx; lx = e.clientX; } });
    let vis = false; new IntersectionObserver((en) => { vis = en[0].isIntersecting; }, { rootMargin: '100px' }).observe(m); const mw = () => { w = tr.firstChild.offsetWidth + 20 || 1; }; mw(); addEventListener('resize', mw); setTimeout(mw, 1500);
    let lastY = scrollY; (function f() { requestAnimationFrame(f); const dy = scrollY - lastY; lastY = scrollY; if (!vis) return; v += dy * 0.12;
      const base = hov ? 0 : 0.6; x += base + v; v *= 0.92; if (Math.abs(v) < 0.02) v = 0; x = ((x % w) + w) % w; tr.style.transform = 'translate3d(' + -x + 'px,0,0)'; })(); })();
  /* platform layers */
  let layerSel = 0, layerManual = false, layerAt = 0;
  $('#layers').addEventListener('click', (e) => { const li = e.target.closest('[data-l]'); if (!li || e.target.closest('a')) return; pauseAuto('layer'); layerSel = +li.dataset.l; $$('#layers li').forEach((x, i) => x.classList.toggle('on', i === layerSel)); });
  $('#layers').innerHTML = D.layers.map((l, i) => '<li data-l="' + i + '" class="' + (i === 0 ? 'on' : '') + '" tabindex="0"><b>' + l.name + '</b><span>' + l.line + '</span><i>' + D.tools.filter((t) => t.layer === l.id).map((t) => tl(t.id)).join(', ') + '</i></li>').join('');

  /* lifecycle: the whole lifecycle at once, then a stage */
  let lcSel = 4, lcInd = 0;
  $('#lc-ind').innerHTML = IND.map((x, i) => '<button type="button" data-i="' + i + '" aria-pressed="' + (i === 0) + '">' + x.name + '</button>').join('');
  $('#lc-ind').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; lcInd = +b.dataset.i; $$('#lc-ind button').forEach((x, i) => x.setAttribute('aria-pressed', String(i === lcInd))); });
  $('#lc-sel').innerHTML = STG.map((st, i) => '<button type="button" role="tab" data-s="' + i + '" class="' + (st.id === 'fid' ? 'fid' : '') + '" aria-selected="' + (i === lcSel) + '"><i>' + (st.alias || st.phase) + '</i>' + String(i + 1).padStart(2, '0') + ' ' + st.name + '</button>').join('');
  const GATE = { opp: 'Gate 1: pursue or stop', con: 'Gate 2: concept select', sel: 'Gate 3: proceed to definition', def: 'Gate 4: ready for FID', fid: 'FID: commit the capital', pro: 'Contract award', exe: 'Mechanical completion', com: 'Handover to operations', ops: 'Annual performance review', eol: 'Extend, repower or retire' };
  function lcDetail() { const st = STG[lcSel], ts = D.tools.filter((t) => t.stages[st.id]); $$('#lc-sel button').forEach((b, i) => b.setAttribute('aria-selected', String(i === lcSel))); $('#lc-detail').innerHTML = '<div><p class="lc-num">' + st.phase + ' / ' + String(lcSel + 1).padStart(2, '0') + ' of 10</p><h3>' + (st.id === 'fid' ? 'FID, the final investment decision' : st.name) + '</h3><p class="q">' + st.q + '</p><p class="gate">Decision point: ' + GATE[st.id] + '</p><p style="margin-top:16px"><a class="lnk" href="#stage/' + st.id + '">Open the ' + st.name + ' page →</a></p></div><ul>' + ts.map((t) => '<li>' + tl(t.id) + '<span>' + t.stages[st.id] + '</span></li>').join('') + '</ul>'; }
  $('#lc-sel').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (!b) return; lcSel = +b.dataset.s; pauseAuto('life'); lcDetail(); });
  lcDetail();
  [['#lc-sel,#lc-detail', 'life'], ['#ind-sel,#ind-now', 'ind'], ['#layers', 'layer']].forEach(([s, k]) => $$(s).forEach((el) => { el.addEventListener('mouseenter', () => (hoverFlag = k)); el.addEventListener('mouseleave', () => (hoverFlag = '')); }));

  /* industries */
  let indSel = 0;
  let indAt = 0;
  $('#ind-sel').innerHTML = IND.map((x, i) => '<button type="button" role="tab" data-n="' + i + '" aria-selected="' + (i === 0) + '">' + x.name + '</button>').join('');
  $('#ind-sel').addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (!b) return; indSel = +b.dataset.n; pauseAuto('ind'); indNow(); });
  const indNow = () => { $$('#ind-sel button').forEach((b, i) => b.setAttribute('aria-selected', String(i === indSel))); const x0 = IND[indSel] || IND[0]; $('#ind-now').innerHTML = '<b>' + x0.name + '</b><span>' + x0.line + '</span><a href="#industry/' + x0.id + '">Open →</a>'; }; indNow();

  /* customers */
  /* customers: one audience at a time, auto-advancing */
  (() => { const el = $('#cust'); let k = 0;
    const paint = () => { const c = D.customers[k], tools = Object.entries(c.how).filter(([tid]) => TOOL[tid]).slice(0, 3);
      el.innerHTML = '<div class="aud-tabs" role="tablist" aria-label="Who it is for">' + D.customers.map((x, i) => '<button type="button" role="tab" data-c="' + i + '" aria-selected="' + (i === k) + '"><i>' + String(i + 1).padStart(2, '0') + '</i><b>' + x.name + '</b><u></u></button>').join('') + '</div>'
        + '<div class="aud-panel" role="tabpanel"><p class="aud-who">' + c.who + '</p><p class="aud-big"><span class="mute">' + c.need + '</span> ' + c.value + '</p>'
        + '<div class="aud-cols"><div><p class="aud-h">The problem today</p><p class="aud-pain">' + c.pain[0] + '</p></div><div class="aud-tools"><p class="aud-h">How it helps</p>' + tools.map(([tid, w]) => '<a href="#tool/' + tid + '"><b>' + TOOL[tid].name + '</b><span>' + w + '</span></a>').join('') + '</div></div>'
        + '<a class="aud-more" href="#customer/' + c.id + '">How SPURLABS helps ' + c.name.toLowerCase() + ' →</a></div>'; };
    const go = (i) => { k = (i + D.customers.length) % D.customers.length; paint(); };
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) { el.classList.add('manual'); go(+b.dataset.c); } });
    el.addEventListener('animationend', (e) => { if (e.animationName === 'audfill' && !el.classList.contains('manual')) go(k + 1); });
    paint(); })();
  function custPage(id) { const c = D.customers.find((x) => x.id === id); if (!c) { location.hash = ''; return; } const stg = STG.filter((st) => Object.keys(c.how).some((tid) => TOOL[tid] && TOOL[tid].stages[st.id]));
    $('#customer').innerHTML = '<div class="page"><a class="back" href="#">← SPURLABS</a><p class="tp-meta" style="margin-top:28px">Customers</p><h1 class="tp-name">' + c.name + '</h1><p class="tp-line">' + c.value + '</p><p class="body">' + c.who + '.</p><div class="two" style="margin-top:44px"><div><p class="tp-h" style="margin-top:0">The problem today</p><ul class="pains">' + c.pain.map((x) => '<li>' + x + '</li>').join('') + '</ul></div><div><p class="tp-h" style="margin-top:0">What changes</p><p class="prob">' + c.need + '</p></div></div><p class="tp-h">How each tool helps</p><ul class="how">' + Object.entries(c.how).map(([tid, w]) => '<li>' + tl(tid) + '<span>' + w + '</span></li>').join('') + '</ul><p class="tp-h">Where it helps across the lifecycle</p><div class="tl">' + STG.map((st) => { const on = stg.includes(st), names = Object.keys(c.how).filter((tid) => TOOL[tid] && TOOL[tid].stages[st.id]).map((tid) => TOOL[tid].name); return '<div class="' + (on ? 'on' : '') + '"><i>' + st.phase + '</i><b>' + st.name + '</b>' + (on ? '<span>' + names.join(', ') + '</span>' : '') + '</div>'; }).join('') + '</div><div class="cta"><a class="btn" href="mailto:spurlabs@gmail.com?subject=SPURLABS%20for%20' + encodeURIComponent(c.name) + '">Request a briefing</a></div></div>'; window.scrollTo(0, 0); }

  /* tool pages */
  const FILMS = [];
  function toolPage(id) {
    const t = TOOL[id]; if (!t) { location.hash = ''; return; }
    const CUST = Object.fromEntries(D.customers.map((c) => [c.id, c.name]));
    $('#tool').innerHTML = '<div class="page"><a class="back" href="#">← SPURLABS</a><p class="tp-meta" style="margin-top:28px">' + LAYER[t.layer].name + ' / ' + t.status + '</p><h1 class="tp-name">' + t.name + '</h1><p class="tp-line">' + t.line + '</p><div class="vis" data-vis></div>'
      + '<p class="tp-h">The problem</p><p class="prob">' + t.problem + '</p>'
      + '<p class="tp-h">How it helps</p><div class="flow3"><div><b>In</b><span>' + t.flow[0] + '</span></div><div><b>What it does</b><span>' + t.flow[1] + '</span></div><div><b>Out</b><span>' + t.flow[2] + '</span></div></div>'
      + '<div class="tp-desc">' + t.desc.map((p) => '<p>' + p + '</p>').join('') + '</div>'
      + '<p class="tp-h">Where it is used across the lifecycle</p><div class="tl">' + STG.map((st) => '<div class="' + (t.stages[st.id] ? 'on' : '') + '"><i>' + st.phase + '</i><b>' + st.name + '</b>' + (t.stages[st.id] ? '<span>' + t.stages[st.id] + '</span>' : '') + '</div>').join('') + '</div>'
      + '<p class="tp-h">Value by customer</p><ul class="how">' + D.customers.filter((c) => c.how[t.id]).map((c) => '<li><a href="#customer/' + c.id + '">' + c.name + '</a><span>' + c.how[t.id] + '</span></li>').join('') + '</ul>'
      + '<p class="tp-h">Under the hood</p><ul class="pains">' + t.how.map((x) => '<li>' + x + '</li>').join('') + '</ul>'
      + '<p class="tp-h">What it does</p><ul class="tp-feat">' + t.features.map((f) => '<li><b>' + f[0] + '</b><span>' + f[1] + '</span></li>').join('') + '</ul>'
      + '<div class="two" style="margin-top:8px"><div><p class="tp-h">Who uses it</p><div class="chips">' + t.customers.map((c) => '<a href="#customer/' + c + '">' + CUST[c] + '</a>').join('') + '</div></div><div><p class="tp-h">Works with</p><div class="chips">' + t.connects.map((c) => '<a href="#tool/' + c + '">' + TOOL[c].name + '</a>').join('') + '</div></div></div>'
      + (D.voices.some((x) => x.answer === t.id) ? '<p class="tp-h">What project teams tell us</p><div class="voices">' + D.voices.filter((x) => x.answer === t.id).map((x) => '<figure><blockquote>' + x.said + '</blockquote><figcaption>' + x.role + '</figcaption></figure>').join('') + '</div>' : '')
      + '<p class="tp-h">Demo film</p>' + (FILMS.includes(t.id) ? '<video class="filmv" controls preload="none" playsinline src="' + ((window.Spur.FILMDATA || {})[t.id] || ('films/' + t.id + '.mp4')) + '"></video><p class="src">Mesa Ridge Energy Center, illustrative case. Voiceover to follow.</p>' : '<div class="film">' + t.name + ': walkthroughs on the illustrative Mesa Ridge case are given on request.</div>')
      + '<p class="tp-h">Value</p><p class="tp-line" style="margin-top:0;font-size:20px">' + t.value + '</p></div>';
    window.scrollTo(0, 0);
  }
  function indPage(id) { const x = IX[id]; if (!x) { location.hash = ''; return; } const ts = IND_TOOLS[id] || [];
    $('#industry').innerHTML = '<div class="page"><a class="back" href="#">← SPURLABS</a><p class="tp-meta" style="margin-top:28px">Industries</p><h1 class="tp-name">' + x.name + '</h1><p class="tp-line">' + x.line + '</p><div class="vis" data-vis></div>' + (x.base_note ? '<p class="tp-h">The benchmark</p><p class="prob">' + x.base_note + '</p>' : '') + (x.base ? '<p class="tp-h">The base rate</p><p class="prob">' + x.base + ' <span class="src">Flyvbjerg and Gardner, How Big Things Get Done, 2023, from a database of 16,000 projects.</span></p>' : '') + '<p class="tp-h">What goes wrong</p><ul class="pains">' + x.issues.map((q) => '<li>' + q + '</li>').join('') + '</ul><p class="tp-h">The tools that lead here</p><ul class="how">' + ts.map((tid) => '<li>' + tl(tid) + '<span>' + TOOL[tid].line + '</span></li>').join('') + '</ul><p class="tp-h">Across the lifecycle</p><div class="tl">' + STG.map((st) => { const on = ts.filter((tid) => TOOL[tid].stages[st.id]); return '<div class="' + (on.length ? 'on' : '') + '"><i>' + st.phase + '</i><b>' + st.name + '</b>' + (on.length ? '<span>' + on.map((tid) => TOOL[tid].name).join(', ') + '</span>' : '') + '</div>'; }).join('') + '</div><p class="tp-h">Industry workflow film</p><div class="film">Walkthroughs of the ' + x.name.toLowerCase() + ' workflow across the lifecycle are given on request.</div></div>'; window.scrollTo(0, 0); }
  function stagePage(id) { const k = STG.findIndex((x) => x.id === id); if (k < 0) { location.hash = ''; return; } const st = STG[k], d = SD[id], ts = D.tools.filter((t) => t.stages[id]);
    $('#stage').innerHTML = '<div class="page"><a class="back" href="#">← SPURLABS</a><p class="tp-meta" style="margin-top:28px">' + st.phase + ' / stage ' + (k + 1) + ' of 10</p><h1 class="tp-name">' + (id === 'fid' ? 'FID, the final investment decision' : st.name) + '</h1><p class="tp-line">' + st.q + '</p><div class="vis" data-vis></div><p class="tp-h">What happens</p><p class="prob">' + d.happens + '</p><div class="two"><div><p class="tp-h">What it must produce</p><ul class="pains">' + d.deliver.map((q) => '<li>' + q + '</li>').join('') + '</ul></div><div><p class="tp-h">Where it usually goes wrong</p><ul class="pains">' + d.fail.map((q) => '<li>' + q + '</li>').join('') + '</ul></div></div><p class="tp-h">The tools at work</p><ul class="how">' + ts.map((t) => '<li>' + tl(t.id) + '<span>' + t.stages[id] + '</span></li>').join('') + '</ul><div class="cta">' + (k > 0 ? '<a class="lnk" href="#stage/' + STG[k - 1].id + '">← ' + STG[k - 1].name + '</a>' : '') + (k < 9 ? '<a class="lnk" href="#stage/' + STG[k + 1].id + '">' + STG[k + 1].name + ' →</a>' : '') + '</div></div>'; window.scrollTo(0, 0); }
  const SPURS = [
    { slug: 'base-rates', kind: 'Analysis', title: 'Why some project types overrun and others do not', model: 'nuclear', lede: 'Nuclear power overruns its budget by 120% on average; solar by 1%. The difference is not engineering quality. It is whether a project is built from repeatable units.', ch: [['The base rate', 'Across 16,000 projects, Flyvbjerg and Gardner find nuclear power overrunning by 120% on average, hydroelectric dams by 75%, fossil thermal plants by 16%, wind by 13%, transmission by 8% and solar by 1%.'], ['Why modularity wins', 'Solar and wind are assembled from many identical units, so every unit teaches the next. A nuclear plant or a dam is built once, by teams who rarely repeat it, so learning cannot accumulate within the project.'], ['What it means for an owner', 'The forecast for any project should start from the base rate for its type, then move only for traits that evidence supports. That is the outside view, and it is where SPURLABS begins.']] },
    { slug: 'outside-view', kind: 'Article', title: 'The outside view, explained', model: 'ccgt', lede: 'Every estimate is an inside view. The outside view asks what actually happened to projects like this one.', ch: [['The inside view', 'An estimate is built from the project’s own scope, quantities and plans. It is necessary, and it is systematically optimistic.'], ['The outside view', 'Reference class forecasting takes the distribution of outcomes for comparable completed projects and places the project within it.'], ['Contingency at a declared confidence', 'Contingency is then set at P50 or P80 from that distribution, rather than as a percentage chosen by habit.']] }];
  function insightsPage(h) {
    const slug = (h || '').split('/')[1], a = SPURS.find((x) => x.slug === slug);
    if (a) { $('#insights').innerHTML = '<div class="page longform"><a class="back" href="#spurs">← Spurs</a><p class="tp-meta" style="margin-top:28px">' + a.kind + '</p><h1 class="tp-name">' + a.title + '</h1><p class="tp-line">' + a.lede + '</p><div class="vis" data-vis data-model="' + a.model + '"></div>' + a.ch.map(([t2, b]) => '<section class="chap"><h2>' + t2 + '</h2><p>' + b + '</p></section>').join('') + '<p class="src">Source: Flyvbjerg and Gardner, How Big Things Get Done, 2023.</p></div>'; window.scrollTo(0, 0); return; }
    const CATS = ['Analysis', 'Articles', 'Case studies', 'Solution briefs', 'Implementations', 'Industry updates'];
    $('#insights').innerHTML = '<div class="page"><a class="back" href="#">← SPURLABS</a><p class="tp-meta" style="margin-top:28px">Spurs</p><h1 class="tp-name">Spurs</h1><p class="tp-line">Long-form analysis of capital projects, industry by industry, with the evidence behind it.</p><div class="vis" data-vis data-model="hvdc"></div><div class="ins">' + SPURS.map((x) => '<article><p class="tp-meta">' + x.kind + '</p><h3><a href="#spurs/' + x.slug + '">' + x.title + '</a></h3><p>' + x.lede + '</p><a class="lnk" href="#spurs/' + x.slug + '">Read →</a></article>').join('') + '</div><p class="tp-h">In research</p><ul class="pains">' + CATS.map((c) => '<li>' + c + ': built with each industry study</li>').join('') + '</ul></div>'; window.scrollTo(0, 0); }
  /* logo study */
  function logoPage() {
    const wm = (a, b, c1, c2) => '<svg class="wm" viewBox="0 0 150 22"><text x="0" y="17.5"><tspan style="font-weight:' + a + ';fill:' + c1 + '">SPUR</tspan><tspan style="font-weight:' + b + ';fill:' + c2 + '">LABS</tspan></text></svg>';
    $('#logo').innerHTML = '<a class="back" href="#">← SPURLABS</a><h1 class="tp-name" style="margin-top:28px">Wordmark</h1><p class="tp-line">One word, one height for every letter. SPUR carries the weight; LABS follows it.</p><div class="lg"><div>' + wm(650, 300, 'var(--ink)', 'var(--ink)') + '<p>A / primary. SPUR in semibold, LABS in light. Same size and baseline, no space.</p></div><div class="light">' + wm(650, 300, '#111', '#111') + '<p>A on light.</p></div><div>' + wm(560, 560, 'var(--ink)', 'var(--mute)') + '<p>B / single weight. LABS in a lighter shade of the same colour.</p></div><div class="light">' + wm(560, 560, '#111', '#8a867f') + '<p>B on light.</p></div></div>';
    window.scrollTo(0, 0);
  }

  /* section loop */
  const cap = $('#cap');
  let capSig = '';
  const clearCaps = () => { if (capSig !== '') { capSig = ''; cap.innerHTML = ''; } };
  const caps = (list, rc, side) => {
    const P = list.map((c) => ({ c, q: eng.project(c.p) })).filter((o) => o.q && o.q.ok && o.q.x > rc[0] + 6 && o.q.x < rc[2] - 6 && o.q.y > rc[1] + 10 && o.q.y < rc[3] - 10).sort((a, b) => a.q.y - b.q.y);
    let y = rc[1] + 24; const lx = rc[2] - 196, used = [];
    P.forEach((o) => { if (side) { o.ly = Math.max(o.q.y, y); y = o.ly + 36; } else { let ly = o.q.y; used.forEach((u) => { if (Math.abs(u.x - o.q.x) < 170 && Math.abs(u.y - ly) < 30) ly = u.y + 30; }); used.push({ x: o.q.x, y: ly }); o.ly = ly; } });
    const sig = (side ? 's' : 'c') + P.map((o) => o.c.a + '|' + (o.c.b || '')).join('~');
    if (sig !== capSig) {
      capSig = sig; let svg = '', html = '';
      P.forEach((o) => { if (side) svg += '<line/><circle r="2.5"/>'; html += '<div class="cp' + (side ? ' side' : '') + '"><b>' + o.c.a + '</b>' + (o.c.b ? '<span>' + o.c.b + '</span>' : '') + '</div>'; });
      cap.innerHTML = (svg ? '<svg class="lead" width="100%" height="100%">' + svg + '</svg>' : '') + html;
    }
    const ls = cap.querySelectorAll('line'), cs = cap.querySelectorAll('circle'), ds = cap.querySelectorAll('.cp');
    P.forEach((o, i) => { const d = ds[i]; if (!d) return; d.style.left = (side ? lx : o.q.x).toFixed(0) + 'px'; d.style.top = o.ly.toFixed(0) + 'px';
      if (side && ls[i]) { ls[i].setAttribute('x1', o.q.x.toFixed(0)); ls[i].setAttribute('y1', o.q.y.toFixed(0)); ls[i].setAttribute('x2', lx - 10); ls[i].setAttribute('y2', o.ly.toFixed(0)); cs[i].setAttribute('cx', o.q.x.toFixed(0)); cs[i].setAttribute('cy', o.q.y.toFixed(0)); } });
  };
  let ak = null, al = [];
  const anchors = () => { if (ak === eng.key && eng.comp) return al; const L = []; if (eng.comp) eng.comp.traverse((o) => { if (o.userData.cap) L.push({ p: o, a: o.userData.cap[0], b: o.userData.cap[1] }); }); if (eng.comp) { ak = eng.key; al = L; } return L; };
  const rectOf = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; };
  const ORDER = IND.map((x) => x.id);
  function tick() {
    requestAnimationFrame(tick);
    if (!$('#insights').hidden) { const rc = rectOf($('#insights .vis')); eng.set(rc ? { kind: 'model', model: ($('#insights .vis').dataset.model || 'nuclear'), rect: rc, hover: true } : null); clearCaps(); return; }
    const view = !$('#home').hidden ? 'home' : !$('#tool').hidden ? 'tool' : !$('#industry').hidden ? 'industry' : !$('#stage').hidden ? 'stage' : !$('#customer').hidden ? 'customer' : 'other';
    if (view === 'other') { eng.set(null); clearCaps(); return; }
    if (view === 'industry' || view === 'stage' || view === 'customer') { const rc = rectOf($('#' + view + ' .vis')), key = location.hash.split('/')[1]; if (!rc) return; const CV = { owners: 4, contractors: 6, investors: 4, insurers: 5, government: 2, operators: 8 }; eng.set(view === 'industry' ? { kind: 'model', model: key, rect: rc, hover: true, spin: true } : { kind: 'stage', stage: view === 'stage' ? STG.findIndex((x) => x.id === key) : CV[key] || 4, model: 'ccgt', rect: rc, spin: true }); caps(view === 'industry' ? eng.regionAnchors().filter(Boolean).slice(0, 6).map((r) => ({ p: r.p, a: r.name, b: '' })) : anchors(), rc, view === 'industry'); return; }
    if (view === 'tool') { const t = TOOL[(location.hash.split('/')[1] || '')], rc = rectOf($('#tool .vis')); if (!t || !rc) return; eng.set({ kind: 'tool', tool: t.id, model: 'ccgt', rect: rc, inputs: t.flow[0].split(/, | and /).slice(0, 4), outputs: t.features.slice(0, 4).map((f) => f[0]) }); caps(anchors(), rc); return; }
    const vh = innerHeight, t = eng.t; let cur = null; sv += (Math.abs(scrollY - lastSY) - sv) * 0.2; lastSY = scrollY;
    for (const el of $$('[data-scene]')) { const r = el.getBoundingClientRect(); if (r.top <= vh * 0.5 && r.bottom > vh * 0.5) { cur = el; break; } }
    if (!cur) { eng.set(null); clearCaps(); return; }
    const name = cur.dataset.scene, rc = rectOf(cur.querySelector('.lc-sticky .vis') || cur.querySelector('.vis'));
    let v = null, list = [];
    if (name === 'hero') {
      const auto = H.stage < 0 && H.ind < 0;
      if (auto && t - H.at > 3.6) { H.at = t; H.auto = (H.auto + 1) % 10; if (H.auto === 0) H.cyc = (H.cyc + 1) % ORDER.length; }
      const id = H.ind >= 0 ? ORDER[H.ind] : ORDER[H.cyc], stg = H.stage >= 0 ? H.stage : H.ind >= 0 ? -1 : H.auto;
      v = stg >= 0 ? { kind: 'stage', stage: stg, model: id, rect: rc, completion: stg === 6 ? 0.7 : stg === 9 ? 0.55 : 1 } : { kind: 'model', model: id, rect: rc, hover: true };
      list = anchors(); const nw = $('#hero-now'); if (nw) nw.textContent = (stg >= 0 ? String(stg + 1).padStart(2, '0') + ' ' + STG[stg].name + ' / ' : '') + IX[id].name + (auto ? ' / touring the lifecycle' : '');
    } else if (name === 'platform') { stepAuto('layer', t, 3.4, 3, layerSel, (n) => { layerSel = n; $$('#layers li').forEach((x, i) => x.classList.toggle('on', i === layerSel)); }, () => $('#layers li.on'));  v = { kind: 'layer', layer: layerSel, stage: layerSel, model: 'ccgt', rect: rc, spin: true }; list = anchors(); }
    else if (name === 'process') v = { kind: 'process', rect: rc, spin: false, yaw: -0.15, pitch: 0.28, dist: 5.6 };
    else if (name === 'lifecycle') { stepAuto('life', t, 3.2, 10, lcSel, (n) => { lcSel = n; lcDetail(); }, () => $('#lc-sel [aria-selected="true"]')); v = { kind: 'stage', stage: lcSel, model: ORDER[lcInd], rect: rc, spin: true, completion: lcSel === 6 ? 0.7 : lcSel === 9 ? 0.55 : 1 }; list = anchors(); }
    else if (name === 'industries') { stepAuto('ind', t, 3, ORDER.length, indSel, (n) => { indSel = n; indNow(); }, () => $('#ind-sel [aria-selected="true"]'));  v = { kind: 'model', model: ORDER[indSel], rect: rc, hover: true }; list = eng.regionAnchors().filter(Boolean).slice(0, 6).map((r) => ({ p: r.p, a: r.name, b: (r.note || '').split(' / ')[0] === r.name ? '' : r.note })); }
    eng.set(v);
    if (name === 'hero' && v && v.kind === 'model' && eng.hover >= 0) { const ra = eng.regionAnchors()[eng.hover]; if (ra) list = [{ p: ra.p, a: ra.name, b: '' }]; }
    if (rc && list.length) caps(list, rc, name === 'industries'); else clearCaps();
  }
  requestAnimationFrame(tick);

  /* navigation and routing */
  document.addEventListener('click', (e) => { const a = e.target.closest('[data-go]'); if (!a) return; e.preventDefault(); const go = a.dataset.go; if (location.hash) { location.hash = ''; setTimeout(() => scrollTo(go), 80); } else scrollTo(go); });
  const scrollTo = (go) => { const el = document.getElementById(go); if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
  function route() { closeTools(); const h = location.hash; const isT = h.startsWith('#tool/'), isC = h.startsWith('#customer/'), isI = h.startsWith('#industry/'), isS = h.startsWith('#stage/'), isL = h === '#logo', isN = h === '#insights' || h.startsWith('#spurs'); $('#insights').hidden = !isN; if (isN) insightsPage(h); $('#home').hidden = isT || isL || isC || isI || isS || isN; $('#tool').hidden = !isT; $('#customer').hidden = !isC; $('#industry').hidden = !isI; $('#stage').hidden = !isS; $('#logo').hidden = !isL; const k = h.split('/')[1]; if (isT) toolPage(k); if (isC) custPage(k); if (isI) indPage(k); if (isS) stagePage(k); if (isL) logoPage(); }
  window.addEventListener('hashchange', route); route();
})();
