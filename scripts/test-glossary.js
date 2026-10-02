// Valida el glosario: alias que apuntan a dos términos, cobertura sobre el banco y las preguntas
// generadas, y que la explicación de opciones incorrectas encuentre qué decir.
const fs = require("fs"), path = require("path"), vm = require("vm");
const G = require("../src/data/glossary.js");
const E = require("../src/engine/engine.js");
const src = fs.readFileSync(path.join(__dirname, "../src/data/content.js"), "utf8");
const C = vm.runInNewContext(src + "\n;({TOPICS,Q1,Q2,Q3,Q4})");
const BASE = [...C.Q1, ...C.Q2, ...C.Q3, ...C.Q4];

let errors = 0;
const fail = msg => { errors++; if (errors <= 30) console.log("ERROR:", msg); };

// 1. un mismo alias (sin distinguir mayúsculas) no debe llevar a dos términos distintos
const seen = new Map();
for (const e of G.GLOSSARY) for (let a of e.a) {
  const cs = a[0] === "=" || !/[a-záéíóúñü]/.test(a); a = a.replace(/^=/, "");
  const k = (cs ? "cs:" + a : "ci:" + a.toLowerCase());
  if (seen.has(k) && seen.get(k) !== e.id) fail(`alias «${a}» en ${seen.get(k)} y ${e.id}`);
  seen.set(k, e.id);
}
for (const e of G.GLOSSARY) { if (!e.d || e.d.length < 25) fail(`${e.id} sin definición`); if (!e.c) fail(`${e.id} sin categoría`); }

// 2. ningún subrayado dentro de una palabra y el HTML escapado conserva el texto
const texts = [];
for (const q of BASE) texts.push(q.q, ...q.o, q.e);
for (const t of C.TOPICS) texts.push(...t.keys, ...t.traps, ...t.cards.flat());
for (const F of E.FAMILIES) texts.push(F.rule, ...Object.values(F.sols).map(s => s.n));
const strip = h => h.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const hits = {};
let withTerms = 0;
for (const t of texts) {
  const h = G.annotate(t, new Set());
  if (strip(h) !== t) fail("el texto anotado cambió: " + t.slice(0, 80));
  const ids = G.termsIn(t).map(e => e.id); if (ids.length) withTerms++;
  for (const id of ids) hits[id] = (hits[id] || 0) + 1;
  for (const m of h.matchAll(/(\p{L})<span class="gl"|<\/span>(\p{L})/gu)) fail("término pegado a una palabra: …" + h.slice(Math.max(0, m.index - 30), m.index + 40));
}
// 3. falsos positivos conocidos: palabras comunes que no deben marcarse
for (const [txt, bad] of [["Haz clic aquí", null], ["El sistema transcribe el audio", "transcribe"], ["La configuración inicial", null], ["Recibir 3 IPs públicas", "ip"], ["Usa la RAM del servidor", null]]) {
  const ids = G.termsIn(txt).map(e => e.id);
  if (bad === null ? ids.length : ids.includes(bad) && bad === "transcribe") fail(`falso positivo en «${txt}»: ${ids.join(",")}`);
}
if (!G.termsIn("Recibir 3 IPs públicas").some(e => e.id === "ip")) fail("«IPs públicas» no se reconoce como IP");
if (G.resolve("AZs")?.id !== "az") fail("AZs no se reconoce");
if (G.resolve("subredes")?.id !== "subnet") fail("subredes no se reconoce");

// 4. preguntas generadas
let gen = 0, genWith = 0;
for (const F of E.FAMILIES) for (let i = 0; i < 20; i++) {
  const q = E.generate({ fam: F.id, level: 1 + (i % 3), seed: i * 17 + 3 }); if (!q) continue;
  gen++; if (G.termsIn(q.q, ...q.o).length) genWith++;
  for (const o of q.o) if (!G.mainTerm(o)) { /* opciones sin término: se explican con el motor */ }
}
// 4b. cada opción incorrecta del banco tiene un porqué específico (a mano, del motor o del glosario)
const W = require("../src/data/whynot.js");
let wHand = 0, wMotor = 0, wGlos = 0;
for (const [id, m] of Object.entries(W)) { const q = BASE.find(x => x.id === id); if (!q) { fail("whynot: pregunta inexistente " + id); continue; }
  for (const k of Object.keys(m)) { if (!q.o[k]) fail(`whynot ${id}: opción ${k} inexistente`); else if (q.a.includes(+k)) fail(`whynot ${id}: la opción ${k} es correcta`); } }
for (const q of BASE) { const x = E.explainBase(q).x; q.o.forEach((o, i) => { if (q.a.includes(i)) return;
  if (W[q.id] && W[q.id][i]) return wHand++; const r = x && x.rows[i];
  if (r && ((r.fails && r.fails.length) || (r.sid && x.goal))) return wMotor++;
  const t = G.mainTerm(o); if (t && t.n) return wGlos++;
  fail(`${q.id} opción ${i} sin explicación de por qué no: ${o}`); }); }
console.log("Opciones incorrectas explicadas · a mano:", wHand, "· motor:", wMotor, "· glosario:", wGlos);
// 5. cobertura de términos frecuentes en mayúsculas que no están en el glosario
const freq = {};
for (const t of texts) for (const m of t.matchAll(/\b[A-Z][A-Za-z0-9]*(?:[ -][A-Z0-9][A-Za-z0-9]*)*\b/g)) freq[m[0]] = (freq[m[0]] || 0) + 1;
const missing = Object.entries(freq).filter(([w, n]) => n >= 4 && !G.termsIn(w).length && /[A-Z]{2}|[a-z][A-Z]/.test(w)).sort((a, b) => b[1] - a[1]).slice(0, 25);

console.log("Términos:", G.GLOSSARY.length, "· categorías:", G.CATS.length, "· textos con términos:", withTerms + "/" + texts.length, "· generadas con términos:", genWith + "/" + gen);
console.log("Más frecuentes:", Object.entries(hits).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, n]) => k + ":" + n).join(" "));
console.log("Siglas frecuentes sin entrada:", missing.map(([w, n]) => w + ":" + n).join(" ") || "ninguna");
console.log("Ejemplo:", G.annotate("Una empresa tiene un NAT gateway en una sola AZ para todas las subredes privadas de tres AZ. ¿Qué cambio mejora la disponibilidad?", new Set()));
console.log(errors ? `${errors} errores` : "Glosario sin errores");
process.exit(errors ? 1 : 0);
