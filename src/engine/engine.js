/* Motor de razonamiento SAA-C03: genera preguntas nuevas y explica cualquier pregunta paso a paso.
 *
 * Generación (por familia de decisión):
 *   1. Elige la respuesta objetivo y, si hay, datos de contexto (frecuencia de acceso, vida del objeto…).
 *   2. Aplica los requisitos implícitos; si el objetivo no cumple uno, agrega la frase que lo levanta.
 *   3. Agrega requisitos que el objetivo cumple y que descartan al menos a otra opción, hasta que el
 *      objetivo sea el único válido o el mejor en el objetivo de desempate (costo, esfuerzo operativo…).
 *   4. Usa como distractores las opciones que fallan por un solo requisito o que pierden el desempate
 *      ("casi correctas"), igual que en el examen real.
 *   5. Guarda la traza completa: matriz opción × requisito, motivo de cada descarte y ranking del desempate.
 *
 * Explicación de preguntas existentes: detecta en el enunciado los requisitos conocidos, reconoce los
 * servicios de cada opción y arma la misma matriz; descarta los requisitos que contradicen a la respuesta
 * oficial (autoconsistencia), así nunca explica algo distinto a la clave.
 */
(function (root) {
"use strict";
const KB = root.SAAKB || (typeof require === "function" ? require("./kb.js") : null);
const { FAMILIES, GOALS, ORGS, NOISE } = KB;
const FMAP = Object.fromEntries(FAMILIES.map(f => [f.id, f]));
const LEVELS = { 1: { name: "Básica", center: 2.2 }, 2: { name: "Intermedia", center: 4.2 }, 3: { name: "Avanzada", center: 6.4 } };

/* ── utilidades ── */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
const shuffle = (r, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const lowerFirst = s => s.charAt(0).toLowerCase() + s.slice(1);
const capFirst = s => s.charAt(0).toUpperCase() + s.slice(1);
const joinY = arr => arr.length <= 1 ? (arr[0] || "") : arr.slice(0, -1).join(", ") + " y " + arr[arr.length - 1];
const consOf = (F, id) => F.cons[id] || F.extra[id];
const okC = (F, sid, c, v) => !!c.ok(F.sols[sid].a, v);
function whyC(F, sid, c, v) {
  const s = F.sols[sid];
  if (s.nt[c.id]) return s.nt[c.id];
  if (typeof c.why === "function") return c.why(s.a, v);
  return c.why || ("no cumple: " + c.lbl.toLowerCase());
}
function rankOf(F, sid, goal, P) {
  if (goal === "cost" && F.costFn) return F.costFn(sid, P);
  const v = F.sols[sid].r[goal];
  return v == null ? null : v;
}
const fmtCost = v => "$" + (v < 0.01 ? v.toFixed(4) : v.toFixed(3));
const renderCons = (c, p) => p ? c.t.replace("{p}", p.t) : c.t;

/* ── generación ── */
function build(F, r, opts) {
  const level = opts.level || 2;
  const solIds = Object.keys(F.sols);
  const multi = !!opts.multi && !F.goalAlways;
  const include = (opts.include || []).filter(s => F.sols[s] && s !== opts.target);
  const ndist = opts.ndist || 3;
  let targets;
  if (opts.target && F.sols[opts.target]) targets = [opts.target];
  else targets = multi ? shuffle(r, solIds).slice(0, 2) : [pick(r, solIds)];
  if (multi && targets.length < 2) return null;
  const T = sid => targets.includes(sid);
  const sat = (c, v) => targets.every(t => okC(F, t, c, v));

  // datos de contexto (no descartan, alimentan el costo)
  const P = {}, facts = [], usedGrp = new Set();
  for (const c of Object.values(F.cons)) {
    if (!c.fact || r() > 0.85) continue;
    const p = pick(r, c.params); P[c.id] = p.v; facts.push({ c, p }); if (c.grp) usedGrp.add(c.grp);
  }
  // requisitos implícitos
  const active = [], waivers = [];
  for (const im of F.implicit) {
    const c = consOf(F, im.c);
    if (sat(c)) active.push(c);
    else if (im.waiver) waivers.push(im.waiver);
    else return null;
  }
  let alive = solIds.filter(s => !T(s) && active.every(c => okC(F, s, c)));

  const chosen = [];
  const paramFor = c => {
    if (!c.params) return null;
    const okp = c.params.filter(p => sat(c, p.v));
    if (!okp.length) return undefined;
    // preferir el valor más exigente que el objetivo todavía cumple: descarta más y obliga a razonar
    const elimOf = p => alive.filter(s => !okC(F, s, c, p.v)).length;
    const sorted = okp.slice().sort((a, b) => elimOf(b) - elimOf(a));
    return r() < 0.7 ? sorted[0] : pick(r, okp);
  };
  const add = (c, p) => { chosen.push({ c, p }); if (c.grp) usedGrp.add(c.grp); alive = alive.filter(s => okC(F, s, c, p ? p.v : undefined)); };

  for (const c of shuffle(r, Object.values(F.cons))) {
    if (!c.anchor || c.fact || (c.grp && usedGrp.has(c.grp))) continue;
    const p = paramFor(c); if (p === undefined) continue;
    if (sat(c, p ? p.v : undefined)) add(c, p);
  }

  let goal = null;
  if (!multi && F.goals.length && !(opts.noGoal && !F.goalAlways)) {
    if (F.goalAlways) goal = F.goalAlways;
    else if (r() < 0.3 + 0.15 * level) goal = pick(r, F.goals);
    if (goal && rankOf(F, targets[0], goal, P) == null) goal = F.goalAlways || null;
  }
  const done = () => {
    if (!alive.length) return true;
    if (!goal) return false;
    const tr = rankOf(F, targets[0], goal, P);
    return tr != null && alive.every(s => { const x = rankOf(F, s, goal, P); return x != null && x > tr + 1e-9; });
  };
  const wantExtra = level - 1; // en niveles altos se agregan requisitos aunque ya alcance
  let extra = 0;
  // con una confusión a contrastar, primero se prueban los requisitos que descartan a la opción confundida
  let pool = shuffle(r, Object.values(F.cons));
  if (include.length) { const hits = c => !c.fact && include.some(s => (c.params ? c.params.some(pp => sat(c, pp.v) && !okC(F, s, c, pp.v)) : sat(c) && !okC(F, s, c))); pool = [...pool.filter(hits), ...pool.filter(c => !hits(c))]; }
  for (const c of pool) {
    if (c.fact || c.anchor || (c.grp && usedGrp.has(c.grp))) continue;
    const p = paramFor(c); if (p === undefined) continue;
    if (!sat(c, p ? p.v : undefined)) continue;
    const elim = alive.filter(s => !okC(F, s, c, p ? p.v : undefined));
    if (!elim.length) continue;
    if (done()) { if (extra >= wantExtra || r() < 0.35) break; extra++; }
    add(c, p);
  }
  if (!done()) return null;
  if (!chosen.length) {
    // sin requisitos explícitos: agrega uno que el objetivo cumple (de preferencia uno que descarte a alguna opción)
    const cands = shuffle(r, Object.values(F.cons)).filter(c => !c.fact && !(c.grp && usedGrp.has(c.grp)));
    let pickC = null;
    for (const c of cands) {
      const okp = c.params ? c.params.filter(p => sat(c, p.v)) : [null];
      for (const p of okp) {
        if (!sat(c, p ? p.v : undefined)) continue;
        const elim = solIds.some(s => !T(s) && !okC(F, s, c, p ? p.v : undefined));
        if (!pickC || (elim && !pickC.elim)) pickC = { c, p, elim };
      }
      if (pickC && pickC.elim) break;
    }
    if (pickC) add(pickC.c, pickC.p);
  }
  const goalUsed = goal && alive.length > 0;
  if (!chosen.length && !waivers.length && !(facts.length && goal)) return null;

  // distractores
  const reqs = [...chosen.map(x => ({ c: x.c, p: x.p, implicit: false })), ...active.map(c => ({ c, p: null, implicit: true }))];
  const tRank = goal ? rankOf(F, targets[0], goal, P) : null;
  const info = solIds.filter(s => !T(s)).map(s => {
    const fails = reqs.filter(q => !okC(F, s, q.c, q.p ? q.p.v : undefined));
    const loses = !fails.length && !!goal;
    return { s, fails, loses };
  });
  if (info.some(x => !x.fails.length && !x.loses)) return null; // ambigua
  const nearQuota = level === 1 ? 1 : level === 2 ? 2 : 3;
  const forced = info.filter(x => include.includes(x.s));
  const rest = info.filter(x => !include.includes(x.s));
  const near = shuffle(r, rest.filter(x => x.loses || x.fails.length === 1));
  const far = shuffle(r, rest.filter(x => !(x.loses || x.fails.length === 1)));
  const dist = [...forced, ...near.slice(0, Math.max(0, nearQuota - forced.length))].slice(0, ndist);
  for (const x of [...far, ...near]) { if (dist.length >= ndist) break; if (!dist.includes(x)) dist.push(x); }
  if (dist.length < ndist) return null;
  const nearUsed = dist.filter(x => x.loses || x.fails.length === 1).length;

  // texto
  const noisePool = [...NOISE, ...(F.noise || [])];
  const nNoise = opts.noNoise ? 0 : level === 3 ? 1 + (r() < 0.4 ? 1 : 0) : level === 2 && r() < 0.25 ? 1 : 0;
  const noise = shuffle(r, noisePool).slice(0, nNoise);
  const org = pick(r, ORGS);
  const ctx = pick(r, F.ctx).replace("{org}", org).replace("{orgl}", lowerFirst(org));
  const anchors = chosen.filter(x => x.c.anchor).map(x => renderCons(x.c, x.p));
  const body = shuffle(r, [...facts.map(x => renderCons(x.c, x.p)), ...chosen.filter(x => !x.c.anchor).map(x => renderCons(x.c, x.p)), ...waivers, ...noise]);
  const askGoal = goal && (goalUsed || F.goalAlways) ? " " + GOALS[goal].txt : "";
  const lines = [...anchors, ...body];
  const stem = [ctx, ...lines].join(" ") + " " + pick(r, F.ask) + askGoal + "?" + (multi ? " (Elige 2)" : "");

  const optIds = shuffle(r, [...targets, ...dist.map(x => x.s)]);
  const diff = chosen.length + facts.length * 0.5 + nearUsed * 0.8 + (goalUsed ? 1.5 : 0) + nNoise * 0.7 + (multi ? 1 : 0) + (waivers.length ? 0.5 : 0);

  const q = {
    id: "g-" + hash(stem), t: F.t, src: "gen", q: stem,
    o: optIds.map(s => F.sols[s].n), a: optIds.map((s, i) => T(s) ? i : -1).filter(i => i >= 0),
    gen: { fam: F.id, targets, opts: optIds, cons: chosen.map(x => ({ id: x.c.id, p: x.p ? x.p.v : null })), implicit: active.map(c => c.id), goal: goalUsed || (goal && F.goalAlways) ? goal : null, P, level, diff: +diff.toFixed(2), include: include.length ? include : undefined }
  };
  q.parts = { ctx, lines, goalTxt: askGoal };
  q.x = traceFor(F, q);
  q.e = summary(q.x);
  return q;
}

/* Reconstruye la traza de razonamiento a partir de la definición guardada (sirve también para preguntas guardadas). */
function traceFor(F, q) {
  const g = q.gen, P = g.P || {};
  const reqs = [
    ...g.cons.map(k => { const c = consOf(F, k.id), p = c.params ? c.params.find(pp => pp.v === k.p) : null; return { c, v: k.p, implicit: false, lbl: c.lbl + (p ? ": " + p.t : ""), txt: renderCons(c, p) }; }),
    ...g.implicit.map(id => { const c = consOf(F, id); return { c, v: undefined, implicit: true, lbl: c.lbl, txt: "" }; })
  ];
  const goal = g.goal;
  const rows = g.opts.map((sid, i) => {
    const cells = reqs.map(rq => okC(F, sid, rq.c, rq.v));
    const fails = reqs.filter((rq, j) => !cells[j]).map(rq => (rq.implicit ? "(requisito implícito) " : "") + whyC(F, sid, rq.c, rq.v));
    const rk = goal ? rankOf(F, sid, goal, P) : null;
    return { n: F.sols[sid].n, sid, correct: q.a.includes(i), cells, fails, rank: rk };
  });
  const feasible = rows.filter(r => !r.fails.length);
  const rankLbl = goal === "cost" && F.costFn ? (F.costLbl || "") : "";
  let ranking = null;
  if (goal && feasible.length > 1) {
    ranking = feasible.slice().sort((a, b) => a.rank - b.rank).map(r => ({ n: r.n, v: r.rank, correct: r.correct, txt: goal === "cost" && F.costFn ? fmtCost(r.rank) : null }));
  }
  const signals = reqs.filter(rq => !rq.implicit).map(rq => ({ lbl: rq.lbl, txt: rq.txt, keeps: rows.filter((r, i) => r.cells[reqs.indexOf(rq)]).map(r => r.n) }));
  const costTable = goal === "cost" && F.costFn ? rows.map(r => ({ n: r.n, v: fmtCost(r.rank), feasible: !r.fails.length, correct: r.correct })) : null;
  let contrast = null;
  if (g.include && g.include.length) {
    const t = g.targets[0], b = g.include[0];
    const key = reqs.filter(rq => okC(F, t, rq.c, rq.v) && !okC(F, b, rq.c, rq.v));
    if (key.length) contrast = { a: F.sols[t].n, b: F.sols[b].n, keys: key.map(rq => rq.lbl), why: whyC(F, b, key[0].c, key[0].v) };
  }
  return { fam: F.id, famName: F.name, goal, goalLbl: goal ? GOALS[goal].lbl : null, cols: reqs.map(rq => ({ lbl: rq.lbl, implicit: rq.implicit })), rows, signals, ranking, rankLbl, costTable, rule: F.rule, auto: false, contrast };
}

/* ── preguntas «Elige 2» de dos partes: cada respuesta correcta resuelve una decisión distinta ── */
const PAIRS = [["desacople","tarea"],["identidad","auditoria"],["redvpc","amenazas"],["almacenamiento","respaldo"],["hibrida","migracion"],["datos","ia"],["contenedores","api"],["gobierno","cifrado"],["observabilidad","escalado"],["costoec2","costos3"],["costobd","costored"],["costoec2","costored"],["sqsfeat","lambdafeat"],["dynamofeat","s3perf"],["asgfeat","cfaccess"],["gobop","observabilidad"],["tipoinst","placement"],["route53","asgfeat"]].filter(p => FMAP[p[0]] && FMAP[p[1]]);
const partQ = g => ({ gen: g, a: g.opts.map((s, i) => g.targets.includes(s) ? i : -1).filter(i => i >= 0) });
function traceComposite(q) {
  const parts = q.gen.parts, Fs = parts.map(g => FMAP[g.fam]);
  const xs = parts.map((g, i) => traceFor(Fs[i], partQ(g)));
  const n0 = xs[0].cols.length, n1 = xs[1].cols.length;
  const rows = q.gen.map.map(([p, k]) => {
    const r = xs[p].rows[k];
    const cells = p === 0 ? [...r.cells, ...Array(n1).fill(null)] : [...Array(n0).fill(null), ...r.cells];
    return { ...r, cells, part: p };
  });
  return { fam: Fs[0].id, famName: Fs[0].name + " + " + Fs[1].name, goal: xs[0].goal || xs[1].goal, goalLbl: xs[0].goalLbl || xs[1].goalLbl, cols: [...xs[0].cols, ...xs[1].cols], rows,
    signals: [...xs[0].signals, ...xs[1].signals], ranking: xs[0].ranking || xs[1].ranking, rankLbl: xs[0].rankLbl || xs[1].rankLbl, costTable: null,
    rule: Fs[0].rule + "  ·  " + Fs[1].rule, auto: false, composite: true, partNames: Fs.map(F => F.name) };
}
function summaryComposite(x) {
  const ok = x.rows.filter(r => r.correct), bad = x.rows.filter(r => !r.correct);
  const parts = ["Cada respuesta resuelve una parte del problema: " + ok.map(r => r.n + " (" + x.partNames[r.part].toLowerCase() + ")").join(" y ") + "."];
  for (const r of bad) {
    if (r.fails.length) parts.push(r.n + ": " + r.fails[0] + ".");
    else if (x.goal) parts.push(r.n + ": " + GOALS[x.goal].lose + ".");
  }
  return parts.join(" ");
}
function composite(opts = {}, r) {
  r = r || rng(opts.seed != null ? opts.seed : Math.floor(Math.random() * 2 ** 31));
  let pairs = PAIRS;
  if (opts.topics && opts.topics.length) pairs = pairs.filter(p => opts.topics.includes(FMAP[p[0]].t) || opts.topics.includes(FMAP[p[1]].t));
  if (!pairs.length) return null;
  for (let att = 0; att < 40; att++) {
    let [a, b] = pick(r, pairs); if (r() < 0.5) [a, b] = [b, a];
    if (opts.topics && opts.topics.length && !opts.topics.includes(FMAP[a].t)) [a, b] = [b, a];
    const lv = f => opts.levelFn ? opts.levelFn(f) : (opts.level || 2);
    const q1 = build(FMAP[a], r, { level: lv(a), noGoal: true, ndist: 2, noNoise: true });
    const q2 = build(FMAP[b], r, { level: lv(b), noGoal: true, ndist: 1, noNoise: true });
    if (!q1 || !q2) continue;
    const names = [...q1.o, ...q2.o];
    if (new Set(names).size !== names.length) continue;
    const goalTxt = q1.parts.goalTxt || q2.parts.goalTxt;
    const tail = q2.parts.lines.map((l, i) => i === 0 && /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(l) ? "Además, " + lowerFirst(l) : l);
    const stem = [q1.parts.ctx, ...q1.parts.lines, ...tail].join(" ") + " ¿Qué DOS acciones debe tomar el arquitecto de soluciones para cumplir estos requisitos" + goalTxt + "? (Elige 2)";
    const all = [...q1.gen.opts.map((s, k) => [0, k]), ...q2.gen.opts.map((s, k) => [1, k])];
    const map = shuffle(r, all);
    const parts = [q1.gen, q2.gen];
    const q = { id: "c-" + hash(stem), t: FMAP[a].t, src: "gen", q: stem,
      o: map.map(([p, k]) => p === 0 ? q1.o[k] : q2.o[k]),
      a: map.map(([p, k], i) => parts[p].targets.includes(parts[p].opts[k]) ? i : -1).filter(i => i >= 0),
      gen: { comp: true, fam: a, fam2: b, parts, map, targets: [...q1.gen.targets, ...q2.gen.targets], level: Math.max(q1.gen.level, q2.gen.level), diff: +(q1.gen.diff + q2.gen.diff).toFixed(2) } };
    q.x = traceComposite(q); q.e = summaryComposite(q.x);
    q.gen.levelName = "Elige 2 · dos partes";
    return q;
  }
  return null;
}

function summary(x) {
  const ok = x.rows.filter(r => r.correct), bad = x.rows.filter(r => !r.correct);
  const reqTxt = joinY(x.cols.filter(c => !c.implicit).map(c => "«" + c.lbl + "»"));
  const parts = [];
  if (x.ranking) parts.push(joinY(ok.map(r => r.n)) + " cumple" + (ok.length > 1 ? "n" : "") + " " + (reqTxt ? "los requisitos (" + reqTxt + ")" : "lo que se pide") + " y gana el desempate por " + x.goalLbl.toLowerCase() + ".");
  else parts.push(joinY(ok.map(r => r.n)) + (ok.length > 1 ? " son las únicas opciones" : " es la única opción") + " que cumple" + (ok.length > 1 ? "n" : "") + (reqTxt ? " " + reqTxt : " todo lo que se pide") + ".");
  for (const r of bad) {
    if (r.fails.length) parts.push(r.n + ": " + r.fails[0] + ".");
    else if (x.goal) parts.push(r.n + ": " + GOALS[x.goal].lose + (r.rank != null && x.costTable ? " (" + fmtCost(r.rank) + ")" : "") + ".");
  }
  return parts.join(" ");
}

function generate(opts = {}) {
  const seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 2 ** 31);
  const r = rng(seed);
  const level = opts.level || 2;
  let fams = FAMILIES;
  if (opts.fam) fams = [FMAP[opts.fam]].filter(Boolean);
  else if (opts.topics && opts.topics.length) fams = FAMILIES.filter(f => opts.topics.includes(f.t));
  if (!fams.length) return null;
  const weights = fams.map(f => (opts.weights && opts.weights[f.t]) || 1);
  const tot = weights.reduce((a, b) => a + b, 0);
  const center = LEVELS[level].center;
  let best = null;
  for (let att = 0; att < 80; att++) {
    let x = r() * tot, F = fams[0];
    for (let i = 0; i < fams.length; i++) { x -= weights[i]; if (x <= 0) { F = fams[i]; break; } }
    const wantMulti = att < 40 && !opts.target && (opts.multi != null ? (opts.multi === true || r() < opts.multi) : false);
    if (wantMulti && !opts.fam && r() < 0.7) {
      const c = composite({ topics: opts.topics, level, levelFn: opts.levelFn }, r);
      if (c && !(opts.exclude && opts.exclude.has(c.id))) return c;
    }
    const lv = opts.levelFn ? opts.levelFn(F.id) : level;
    const q = build(F, r, { level: lv, multi: wantMulti, target: opts.target, include: opts.include });
    if (!q || (opts.exclude && opts.exclude.has(q.id))) continue;
    const d = Math.abs(q.gen.diff - LEVELS[q.gen.level].center);
    if (!best || d < best.d) best = { q, d };
    if (d < 0.8) break;
  }
  if (!best) return null;
  best.q.gen.levelName = LEVELS[best.q.gen.level].name;
  return best.q;
}

function generateSet(n, opts = {}) {
  const out = [], seen = new Set(opts.exclude || []);
  let seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 2 ** 31);
  for (let i = 0; i < n * 4 && out.length < n; i++) {
    const q = generate({ ...opts, seed: seed + i * 7919, exclude: seen });
    if (q) { out.push(q); seen.add(q.id); }
  }
  return out;
}

/* ── explicación de preguntas existentes ── */
function matchSol(F, text) {
  let best = null, bestLen = 0;
  for (const s of Object.values(F.sols)) {
    if (!s.al) continue;
    const m = s.al.exec(text);
    if (m && m[0].length > bestLen) { best = s.id; bestLen = m[0].length; }
  }
  return best;
}
function detectGoal(text) {
  if (/M[AÁ]S rentable|m[aá]s barat|bajo costo|menor costo|MENOS cost|m[aá]s econ[oó]mic|costo-efectiv|minimiz\w* (el |los )?cost|reducir (el |los )?cost|MENOR costo/i.test(text)) return "cost";
  if (/menor esfuerzo operativo|MENOR (sobrecarga|overhead)|menos (administraci[oó]n|gesti[oó]n)|m[ií]nimo esfuerzo|menor carga operativa|MENOS esfuerzo/i.test(text)) return "ops";
  if (/M[AÁ]S segur/i.test(text)) return "sec";
  if (/menor latencia|mejor rendimiento|M[AÁ]S r[aá]pid/i.test(text)) return "perf";
  if (/M[AÁ]S disponib|mayor disponibilidad|alta disponibilidad/i.test(text)) return "ha";
  return null;
}
const GOAL_TIPS = {
  cost: "Pregunta de costo: primero descarta lo que no cumple; entre lo que queda, gana lo que no paga capacidad ociosa, compromisos innecesarios ni servicios de más.",
  ops: "Pregunta de esfuerzo operativo: gana la opción más administrada (serverless o un servicio específico), sin servidores que parchar, scripts ni pasos manuales.",
  sec: "Pregunta de seguridad: busca credenciales temporales, mínimo privilegio, cifrado y controles que no dependan de que alguien recuerde hacer algo.",
  perf: "Pregunta de rendimiento: identifica el cuello de botella (red, disco, base de datos o cómputo) y elige el servicio que lo ataca directamente.",
  ha: "Pregunta de disponibilidad: busca varias AZ, conmutación automática y eliminar puntos únicos de falla."
};

function explainBase(q) {
  const goal = detectGoal(q.q);
  const multi = q.a.length > 1;
  const out = { goal, goalTip: goal ? GOAL_TIPS[goal] : null, multiTip: multi ? "«Elige 2»: normalmente cada respuesta correcta resuelve una parte distinta del problema; no elijas dos opciones que hacen lo mismo." : null, x: null, ruleOnly: null, famMap: null };
  let best = null, fallback = null;
  for (const F of FAMILIES) {
    const map = q.o.map(o => matchSol(F, o));
    const corr = q.a.map(i => map[i]);
    if (corr.some(s => !s)) continue;
    // si una opción incorrecta se reconoce como el mismo servicio que la correcta, la diferencia está
    // en un detalle que el KB no modela: esa opción queda sin analizar
    map.forEach((s, i) => { if (s && !q.a.includes(i) && corr.includes(s)) map[i] = null; });
    const mapped = map.filter(Boolean).length;
    if (mapped < 2) continue;
    if (!fallback || F.t === q.t) fallback = fallback && fallback.F.t === q.t ? fallback : { F, map: map.slice() };
    // datos numéricos y de contexto que se pueden leer del enunciado
    const P = {};
    for (const c of Object.values(F.cons)) if (c.fact && c.parse) { const v = c.parse(q.q); if (v != null) P[c.id] = v; }
    const reqs = [];
    for (const c of Object.values(F.cons)) {
      if (c.fact || !c.det || !c.det.test(q.q)) continue;
      let v;
      if (c.params) { if (!c.parse) continue; v = c.parse(q.q); if (v == null) continue; }
      reqs.push({ c, v, implicit: false });
    }
    for (const im of F.implicit) if (!(im.wdet && im.wdet.test(q.q))) reqs.push({ c: consOf(F, im.c), v: undefined, implicit: true });
    // autoconsistencia: nunca usar un requisito que la respuesta oficial no cumple
    // (en «Elige 2» basta con que lo cumpla una de las correctas: cada una resuelve una parte)
    const keep = reqs.filter(rq => multi ? corr.some(s => okC(F, s, rq.c, rq.v)) : corr.every(s => okC(F, s, rq.c, rq.v)));
    const useful = keep.filter(rq => map.some((s, i) => s && !q.a.includes(i) && !okC(F, s, rq.c, rq.v)));
    // desempate por objetivo, solo si favorece con claridad a la respuesta oficial
    const g = goal && (F.goals.includes(goal) || (goal === "cost" && F.costFn)) ? goal : null;
    let ranking = null;
    if (g && !multi) {
      const feas = map.map((s, i) => ({ s, i })).filter(x => x.s && keep.every(rq => okC(F, x.s, rq.c, rq.v)));
      const rk = x => rankOf(F, x.s, g, P);
      if (feas.length > 1 && feas.every(x => rk(x) != null)) {
        const cr = feas.filter(x => q.a.includes(x.i)), wr = feas.filter(x => !q.a.includes(x.i));
        if (cr.length && wr.length && wr.every(x => rk(x) > Math.max(...cr.map(rk)) + 1e-9))
          ranking = feas.slice().sort((a, b) => rk(a) - rk(b)).map(x => ({ n: F.sols[x.s].n, v: rk(x), correct: q.a.includes(x.i), txt: g === "cost" && F.costFn ? fmtCost(rk(x)) : null }));
      }
    }
    const score = useful.length * 3 + (ranking ? 3 : 0) + mapped + (F.t === q.t ? 2 : 0);
    if ((useful.length || ranking) && (!best || score > best.score)) best = { F, map, useful, ranking, g, P, score };
  }
  if (!best) {
    if (fallback){ out.ruleOnly = { famName: fallback.F.name, rule: fallback.F.rule }; out.famMap = { fam: fallback.F.id, sids: fallback.map }; }
    return out;
  }
  out.famMap = { fam: best.F.id, sids: best.map };
  const { F, map, useful, ranking, g, P } = best;
  const cols = useful.map(rq => ({ lbl: rq.c.lbl, implicit: rq.implicit }));
  const rows = q.o.map((o, i) => {
    const sid = map[i], correct = q.a.includes(i);
    if (!sid) return { n: o, sid: null, correct, cells: useful.map(() => null), fails: [], rank: null };
    const cells = useful.map(rq => okC(F, sid, rq.c, rq.v));
    const fails = multi && correct ? [] : useful.filter((rq, j) => !cells[j]).map(rq => (rq.implicit ? "(requisito implícito) " : "") + whyC(F, sid, rq.c, rq.v));
    return { n: o, sid, correct, cells, fails, rank: g ? rankOf(F, sid, g, P) : null, svc: F.sols[sid].n };
  });
  const signals = useful.filter(rq => !rq.implicit).map(rq => ({ lbl: rq.c.lbl, txt: (q.q.match(rq.c.det) || [""])[0], keeps: rows.filter(r => r.sid && okC(F, r.sid, rq.c, rq.v)).map(r => r.svc) }));
  const costTable = ranking && g === "cost" && F.costFn ? rows.filter(r => r.sid).map(r => ({ n: r.svc, v: fmtCost(r.rank), feasible: !r.fails.length, correct: r.correct })) : null;
  out.x = { multiParts: multi, fam: F.id, famName: F.name, goal: ranking ? g : null, goalLbl: ranking ? GOALS[g].lbl : null, cols, rows, signals, ranking, rankLbl: costTable ? (F.costLbl || "") : "", costTable, rule: F.rule, auto: true };
  return out;
}

/* Variante: otra pregunta de la misma familia con la misma respuesta como objetivo. */
function variantOf(q, opts = {}) {
  let fam = null, target = null;
  if (q.gen) { fam = q.gen.fam; target = q.gen.comp ? q.gen.parts[0].targets[0] : q.gen.targets[0]; }
  else { const ex = explainBase(q); if (ex.x) { fam = ex.x.fam; const r = ex.x.rows.find(r => r.correct && r.sid); target = r && r.sid; } }
  if (!fam) {
    const fs = FAMILIES.filter(f => f.t === q.t);
    if (!fs.length) return null;
    fam = fs[Math.floor(Math.random() * fs.length)].id;
  }
  for (let i = 0; i < 6; i++) {
    const g = generate({ fam, target: i < 4 ? target : null, level: opts.levelFn ? opts.levelFn(fam) : (opts.level || 2), exclude: opts.exclude });
    if (g && g.q !== q.q) return g;
  }
  return null;
}

/* Duelo: genera una pregunta de la familia donde la respuesta es «target» y «rival» aparece como distractor. */
function duel(fam, target, rival, opts = {}) {
  if (!FMAP[fam] || !FMAP[fam].sols[target] || !FMAP[fam].sols[rival]) return null;
  for (let i = 0; i < 6; i++) {
    const q = generate({ fam, target, include: [rival], level: opts.level || 2, exclude: opts.exclude, seed: opts.seed != null ? opts.seed + i : undefined });
    if (q && q.x.contrast) return q;
  }
  return null;
}

/* Rehidrata una pregunta generada guardada (las funciones del KB no se serializan). */
function rehydrate(q) {
  if (!q || !q.gen || !FMAP[q.gen.fam]) return null;
  try { q.x = q.gen.comp ? traceComposite(q) : traceFor(FMAP[q.gen.fam], q); } catch (e) { return null; }
  return q;
}

/* ── relevancia de trampas, tarjetas y reglas de bitácora ── */
const STOP = new Set("para como cual cuál esta este estos estas desde entre sobre donde cuando debe deben puede pueden tiene tienen solo sólo todas todos cada otra otro otras otros sin con por que qué más menos muy una uno unos unas los las del al la el de en y o a se su sus es son ser hay ya no si sí lo le les nos fue era ha han".split(" "));
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const toks = s => new Set(norm(s).split(/[^a-z0-9]+/).filter(w => w.length > 3 && !STOP.has(w)));
function related(items, text, getText, k = 2, min = 2) {
  const T = toks(text);
  return items.map(it => { const w = toks(getText(it)); let s = 0; for (const x of w) if (T.has(x)) s++; return { it, s }; })
    .filter(x => x.s >= min).sort((a, b) => b.s - a.s).slice(0, k).map(x => x.it);
}

const stats = () => ({ families: FAMILIES.length, solutions: FAMILIES.reduce((s, f) => s + Object.keys(f.sols).length, 0), constraints: FAMILIES.reduce((s, f) => s + Object.keys(f.cons).length, 0) });

const api = { generate, generateSet, composite, duel, explainBase, variantOf, rehydrate, related, detectGoal, stats, LEVELS, FAMILIES, FMAP, PAIRS, GOAL_TIPS, _build: build, _rng: rng, _matchSol: matchSol };
root.SAAEngine = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
