// Valida el motor: genera preguntas por familia y nivel, revisa su consistencia lógica
// y mide cuántas preguntas del banco original puede explicar.
const fs = require("fs"), path = require("path"), vm = require("vm");
const E = require("../src/engine/engine.js");
const src = fs.readFileSync(path.join(__dirname, "../src/data/content.js"), "utf8");
const C = vm.runInNewContext(src + "\n;({DOMAINS,TOPICS,Q1,Q2,Q3,Q4,PLAN,KIND})");
const BASE = [...C.Q1, ...C.Q2, ...C.Q3, ...C.Q4];
const TOPIC_IDS = new Set(C.TOPICS.map(t => t.id));

let errors = 0;
const fail = (msg, q) => { errors++; if (errors <= 25) console.log("ERROR:", msg, q ? "\n  " + q.q : ""); };

console.log("Base de conocimiento:", E.stats());
for (const F of E.FAMILIES) if (!TOPIC_IDS.has(F.t)) fail(`familia ${F.id} con tema desconocido ${F.t}`);

const coverage = {};
const N = Number(process.env.N || 150);
for (const F of E.FAMILIES) {
  const targets = new Set(), stems = new Set();
  let ok = 0, nulls = 0;
  for (const level of [1, 2, 3]) for (let i = 0; i < N; i++) {
    const q = E.generate({ fam: F.id, level, seed: i * 31 + level, multi: i % 5 === 0 ? 1 : 0 });
    if (!q) { nulls++; continue; }
    ok++; stems.add(q.q); q.gen.targets.forEach(t => targets.add(t));
    const multi = /\(Elige 2\)/.test(q.q);
    if (q.a.length !== (multi ? 2 : 1)) fail(`${F.id}: ${q.a.length} correctas`, q);
    if (new Set(q.o).size !== q.o.length) fail(`${F.id}: opciones repetidas`, q);
    if (q.o.length < 4) fail(`${F.id}: menos de 4 opciones`, q);
    for (const r of q.x.rows) {
      if (r.correct && r.fails.length) fail(`${F.id}: la correcta falla un requisito (${r.fails[0]})`, q);
      if (!r.correct && !r.fails.length && !q.x.goal) fail(`${F.id}: distractor sin motivo de descarte (${r.n})`, q);
    }
    if (q.x.goal && q.x.ranking) {
      const top = q.x.ranking[0];
      if (!top.correct) fail(`${F.id}: el desempate no favorece a la correcta`, q);
      if (q.x.ranking.length > 1 && Math.abs(q.x.ranking[0].v - q.x.ranking[1].v) < 1e-9) fail(`${F.id}: empate en el desempate`, q);
    }
    if (/\{p\}|\{org/.test(q.q)) fail(`${F.id}: plantilla sin rellenar`, q);
  }
  const all = Object.keys(F.sols);
  coverage[F.id] = { generadas: ok, fallidas: nulls, unicas: stems.size, objetivos: `${targets.size}/${all.length}`, nunca: all.filter(s => !targets.has(s)).join(",") };
}
console.table(coverage);

// «Elige 2» de dos partes
{
  let ok = 0, nul = 0; const pairsSeen = new Set();
  for (let i = 0; i < 1500; i++) {
    const q = E.composite({ seed: 9000 + i, level: 1 + (i % 3) });
    if (!q) { nul++; continue; }
    ok++; pairsSeen.add(q.gen.fam + "+" + q.gen.fam2);
    if (q.a.length !== 2) fail(`compuesta con ${q.a.length} correctas`, q);
    if (q.o.length !== 5) fail(`compuesta con ${q.o.length} opciones`, q);
    if (!/\(Elige 2\)$/.test(q.q)) fail("compuesta sin «(Elige 2)»", q);
    if (new Set(q.o).size !== 5) fail("compuesta con opciones repetidas", q);
    for (const r of q.x.rows) {
      if (r.correct && r.fails.length) fail("parte correcta que falla su requisito", q);
      if (!r.correct && !r.fails.length && !q.x.goal) fail(`distractor compuesto sin motivo (${r.n})`, q);
    }
    if (q.x.rows.filter(r => r.correct).map(r => r.part).sort().join() !== "0,1") fail("las correctas no cubren ambas partes", q);
    const again = E.rehydrate(JSON.parse(JSON.stringify({ ...q, x: undefined })));
    if (!again || again.x.rows.length !== 5) fail("no se pudo rehidratar una compuesta", q);
  }
  console.log(`Compuestas: ${ok} generadas, ${nul} fallidas, ${new Set([...pairsSeen].map(k => k.split('+').sort().join('+'))).size}/${E.PAIRS.length} pares usados`);
}

// Duelos de confusiones: cada par de soluciones de una familia
{
  let tried = 0, ok = 0, bad = 0;
  for (const F of E.FAMILIES) {
    const ids = Object.keys(F.sols);
    for (const t of ids) for (const b of ids) {
      if (t === b) continue; tried++;
      const q = E.duel(F.id, t, b, { seed: tried });
      if (!q) continue;
      ok++;
      if (!q.gen.opts.includes(b) || q.gen.targets[0] !== t) { bad++; fail(`duelo ${F.id} ${t}/${b} sin el rival`, q); }
      if (!q.x.contrast || !q.x.contrast.keys.length) { bad++; fail(`duelo ${F.id} sin contraste`, q); }
    }
  }
  console.log(`Duelos: ${ok}/${tried} pares de soluciones se pueden enfrentar`);
}

// Explicación del banco original
let explained = 0, withSignals = 0;
const misses = {};
for (const q of BASE) {
  const ex = E.explainBase(q);
  if (ex.x) {
    explained++;
    if (ex.x.signals.length) withSignals++;
    for (const r of ex.x.rows) if (r.correct && r.fails.length) fail(`explicación contradice la clave: ${q.id}`, q);
    if (ex.x.ranking && !ex.x.ranking[0].correct) fail(`desempate contradice la clave: ${q.id}`, q);
  } else (misses[q.t] = (misses[q.t] || 0) + 1);
}
console.log(`Banco original: ${BASE.length} preguntas · con matriz automática: ${explained} · con requisitos detectados: ${withSignals}`);
console.log("Sin matriz por tema:", misses);

// Muestras para revisión humana
if (process.env.SAMPLES) {
  for (const id of process.env.SAMPLES.split(",")) {
    for (const level of [1, 3]) {
      const q = E.generate({ fam: id, level, seed: 7 + level });
      if (!q) { console.log(`\n[${id} L${level}] sin pregunta`); continue; }
      console.log(`\n[${id} · ${q.gen.levelName} · dif ${q.gen.diff}] ${q.q}`);
      q.o.forEach((o, i) => console.log(`  ${q.a.includes(i) ? "✓" : " "} ${"ABCDE"[i]}. ${o}`));
      console.log("  → " + q.e);
    }
  }
}
console.log(errors ? `\n${errors} errores` : "\nSin errores");
process.exit(errors ? 1 : 0);
