(function(){
"use strict";
const E = window.SAAEngine;
const G = window.SAAGloss;
const DAY = 864e5;
const EXAM = new Date(2026, 9, 23);
const TMAP = Object.fromEntries(TOPICS.map(t => [t.id, t]));
const BASE = [...Q1, ...Q2, ...Q3, ...Q4];
const BASE_N = Object.fromEntries(TOPICS.map(t => [t.id, BASE.filter(q => q.t === t.id).length]));
const GEN_TOPICS = new Set(E.FAMILIES.map(f => f.t));
const GEN_MAX = 800;
let BANK = BASE.slice();
const S = { qstate:{}, sessions:[], external:[], plan:{done:{}}, errlog:[], genq:[] };
const P = { xp:0, days:{}, best:{time:0, surv:0, combo:0}, badges:{}, goal:30, sound:true, fams:{}, fr:{}, conf:{}, simUsed:[], path:{r:{}, skip:{}}, onb:null, gloss:true, glossSim:true, glSeen:{}, glTip:false };
let view = "ruta", Q = null, topic = null, fam = null, planDay = null, progTab = "resumen", pathOpen = null, onb = null;
let repTab = "flash", glQ = "", glCat = "", glFocus = null;

/* ───────── iconos ───────── */
const IC = {
  play:'<polygon points="7 4 20 12 7 20" />', bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', heart:'<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/>',
  flame:'<path d="M12 22c4.4 0 7-2.9 7-6.6 0-3.6-2.6-5.6-3.6-8.9-.4 1.8-1.4 3-2.6 3.6.3-3.2-1.2-6.3-4.3-8.1.4 3.4-1.6 5.6-3.2 7.7C4.4 11.4 5 13 5 15.4 5 19.1 7.6 22 12 22z"/>',
  crown:'<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>', target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  redo:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>', map:'<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>', grid:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  cards:'<rect x="6" y="3" width="14" height="18" rx="3"/><path d="M3 7v12a2 2 0 0 0 2 2"/>', chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  book:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>', star:'<path d="M12 2l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8 5.7 21.4l1.5-7.1L1.8 9.4 9 8.6z"/>',
  trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>', x:'<path d="M6 6l12 12M18 6L6 18"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>', sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>', help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01"/>',
  sound:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>', mute:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  shuffle:'<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>', list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  spark:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>', clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  chest:'<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v9H4z"/><path d="M4 12h16M10.5 12v3h3v-3"/>', route:'<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>'
};
const ic = (k, cls="i") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
const icFill = (k, cls="") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" style="fill:currentColor;stroke:none">${IC[k]}</svg>`;

const VIEWS = [["ruta","Ruta","route"],["jugar","Jugar","play"],["plan","Plan","cal"],["decisiones","Decisiones","grid"],["repaso","Repaso","cards"],["progreso","Progreso","chart"],["recursos","Recursos","book"]];

/* ───────── utilidades ───────── */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pct = v => v == null ? "–" : Math.round(v*100) + "%";
const dcol = d => `var(--d${d})`;
const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const keyOf = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const todayKey = () => keyOf(new Date());
const fmtDate = s => { const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString("es-PE",{weekday:"long",day:"numeric",month:"long"}); };
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const capFirst = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
// glosario: subraya los términos de un texto (la primera vez que aparece cada uno en el bloque «seen»)
const glossOn = () => P.gloss !== false && !(Q && Q.exam && !Q.result && P.glossSim === false);
const glx = (s, seen) => glossOn() ? G.annotate(s, seen) : esc(s);
const daysLeft = () => Math.max(0, Math.ceil((EXAM - new Date(new Date().toDateString()))/DAY));

/* ───────── almacenamiento: archivo local vía Electron, o el navegador como respaldo ───────── */
const LS = {
  k: p => "saa3:" + p,
  get(p){ try { const v = localStorage.getItem(this.k(p)); return v ? JSON.parse(v) : null; } catch(e){ return null; } },
  set(p, d){ try { localStorage.setItem(this.k(p), JSON.stringify(d)); } catch(e){} },
  del(p){ try { localStorage.removeItem(this.k(p)); } catch(e){} },
  list(c){ const out=[]; try { const pre=this.k(c+"/"); for (let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if (k && k.startsWith(pre)) out.push({...JSON.parse(localStorage.getItem(k)), id:k.slice(pre.length)}); } } catch(e){} return out; }
};
const D = window.desk || null;
const Store = {
  get: p => D ? D.get(p) : Promise.resolve(LS.get(p)),
  set: (p, d) => D ? D.set(p, d) : Promise.resolve(LS.set(p, d)),
  del: p => D ? D.del(p) : Promise.resolve(LS.del(p)),
  list: c => D ? D.list(c) : Promise.resolve(LS.list(c))
};
const pend = {};
function queue(path, get, delay=700){ const p = pend[path] || (pend[path] = {timer:null}); p.get = get; clearTimeout(p.timer); p.timer = setTimeout(() => { p.timer = null; Store.set(path, p.get()); }, delay); }
function flushAll(){ for (const [path, p] of Object.entries(pend)) if (p.timer){ clearTimeout(p.timer); p.timer = null; Store.set(path, p.get()); } }
window.addEventListener("beforeunload", flushAll);
document.addEventListener("visibilitychange", () => { if (document.hidden) flushAll(); });
const saveQS = () => queue("progress/qstate", () => ({m:S.qstate, updated:Date.now()}));
const savePlan = () => queue("progress/plan", () => ({done:S.plan.done, updated:Date.now()}), 500);
const saveP = () => queue("progress/profile", () => ({...P, updated:Date.now()}), 500);

async function load(){
  const [qs, pl, pr, ses, ext, err, gen] = await Promise.all([
    Store.get("progress/qstate"), Store.get("progress/plan"), Store.get("progress/profile"), Store.list("sessions"),
    Store.list("external"), Store.list("errlog"), Store.list("gen")]);
  if (qs && qs.m) S.qstate = qs.m;
  if (pl && pl.done) S.plan.done = pl.done;
  if (pr) Object.assign(P, pr, { best: { ...P.best, ...(pr.best||{}) } });
  P.path = { r:{}, skip:{}, ...(P.path||{}) };
  S.sessions = ses; S.external = ext; S.errlog = err;
  S.genq = gen.map(E.rehydrate).filter(Boolean);
  BANK = [...BASE, ...S.genq];
  syncPath();
}
const packGen = q => ({ id:q.id, t:q.t, src:"gen", q:q.q, o:q.o, a:q.a, e:q.e, gen:q.gen, created:Date.now() });
function keepGen(q){
  if (q.src !== "gen") return;
  for (const f of q.gen.comp ? [q.gen.fam, q.gen.fam2] : [q.gen.fam]) P.fams[f] = (P.fams[f] || 0) + 1;
  if (S.genq.some(x => x.id === q.id)) return;
  S.genq.push(q); BANK.push(q); Store.set("gen/"+q.id, packGen(q));
  if (S.genq.length > GEN_MAX){
    const old = S.genq.find(x => !(S.qstate[x.id] && S.qstate[x.id].box > 0));
    if (old){ S.genq = S.genq.filter(x => x !== old); BANK = BANK.filter(x => x !== old); Store.del("gen/"+old.id); }
  }
}

/* ───────── analítica de dominio ───────── */
const hist = id => (S.qstate[id] && S.qstate[id].h) || "";
function topicStats(tid){
  let num=0, den=0, n=0, seen=0;
  for (const q of BANK){ if (q.t !== tid) continue; const h = hist(q.id); if (h && q.src !== "gen") seen++; for (let i=0;i<h.length;i++){ const w = Math.pow(0.7, h.length-1-i); num += w*(+h[i]); den += w; n++; } }
  return { plat: n ? num/den : null, n, seen, total: BASE_N[tid] || 0 };
}
const extSorted = () => S.external.slice().sort((a,b) => (b.date||"").localeCompare(a.date||"") || (b.created||0)-(a.created||0));
function tdDomain(d){ let num=0, den=0, w=1; for (const e of extSorted()){ const v = e.domains && e.domains[d]; if (v==null || v==="") continue; num += w*(+v/100); den += w; w *= 0.6; if (w < 0.2) break; } return den ? num/den : null; }
const tdMentions = tid => extSorted().slice(0,3).reduce((s,e) => s + ((e.weak||[]).includes(tid) ? 1 : 0), 0);
function mastery(tid){
  const st = topicStats(tid), dTD = tdDomain(TMAP[tid].d);
  let m = null;
  if (st.n >= 3) m = dTD != null ? 0.7*st.plat + 0.3*dTD : st.plat;
  else if (st.n > 0) m = dTD != null ? 0.5*st.plat + 0.5*dTD : st.plat;
  else if (dTD != null) m = dTD;
  if (m != null) m = Math.max(0, m - Math.min(0.15, 0.05*tdMentions(tid)));
  return { m, st };
}
function domainMastery(d){ const ms = TOPICS.filter(t=>t.d===d).map(t=>mastery(t.id).m).filter(v=>v!=null); return ms.length ? ms.reduce((a,b)=>a+b,0)/ms.length : tdDomain(d); }
function readiness(){ let num=0, den=0; for (const d of [1,2,3,4]){ const m = domainMastery(d); if (m!=null){ num += DOMAINS[d].w*m; den += DOMAINS[d].w; } } return den ? num/den : null; }
function priorities(){
  return TOPICS.map(t => { const {m, st} = mastery(t.id); const tw = DOMAINS[t.d].w / TOPICS.filter(x=>x.d===t.d).length; return { t, m, st, p: tw * (1 - (m ?? 0.45)) * (st.n < 3 ? 1.15 : 1) }; }).sort((a,b) => b.p - a.p);
}
const starsOf = m => m == null ? 0 : m >= 0.85 ? 3 : m >= 0.7 ? 2 : m >= 0.5 ? 1 : 0;
const starsHTML = (n, max=3) => `<span class="stars" aria-label="${n} de ${max} estrellas">${Array.from({length:max},(_,i)=>icFill("star", i<n?"":"off")).join("")}</span>`;
const dueList = (all=false) => BANK.filter(q => { const s = S.qstate[q.id]; return s && s.box>0 && (all || (s.due||0) <= Date.now()); });
const coverage = () => BASE.filter(q => hist(q.id)).length / BASE.length;
const levelFor = tid => { const m = mastery(tid).m; return m == null ? 2 : m < 0.55 ? 1 : m < 0.78 ? 2 : 3; };
// rating tipo Elo por decisión: cada nivel de pregunta tiene una dificultad y el rating sube o baja según aciertes
const LVD = {1:900, 2:1050, 3:1200};
const famR = f => (P.fr[f] && P.fr[f].r) || 1000;
function levelForFam(f){ const target = famR(f) + 50; let best = 2, bd = 1e9; for (const L of [1,2,3]){ const d = Math.abs(LVD[L] - target); if (d < bd){ bd = d; best = L; } } return best; }
const LVNAME = {1:"Básica", 2:"Intermedia", 3:"Avanzada"};
function rate(f, d, ok){ const x = P.fr[f] || (P.fr[f] = { r:1000, n:0 }); const e = 1/(1+Math.pow(10, (d - x.r)/400)); const K = x.n < 10 ? 40 : 24; x.r = Math.round(x.r + K*((ok?1:0) - e)); x.n++; }
const FAMMEMO = {};
const famOf = q => q.id in FAMMEMO ? FAMMEMO[q.id] : (FAMMEMO[q.id] = E.explainBase(q).famMap);
function rateQ(q, ok){
  if (q.src === "gen"){ if (q.gen.comp) for (const g of q.gen.parts) rate(g.fam, LVD[q.gen.level] + 50, ok); else rate(q.gen.fam, LVD[q.gen.level] || 1050, ok); return; }
  const fm = famOf(q); if (fm) rate(fm.fam, 1050, ok);
}
// confusiones: qué solución elegiste cuando la correcta era otra, dentro de la misma decisión
function confusionsOf(it){
  const q = it.q, wrong = it.picked.filter(i => !q.a.includes(i)), out = [];
  if (q.src === "gen"){
    if (q.gen.comp) for (const i of wrong){ const [pp, k] = q.gen.map[i], g = q.gen.parts[pp]; out.push([g.fam, g.targets[0], g.opts[k]]); }
    else for (const i of wrong) out.push([q.gen.fam, q.gen.targets[0], q.gen.opts[i]]);
  } else {
    const fm = famOf(q); if (fm){ const corr = q.a.map(i => fm.sids[i]).filter(Boolean)[0]; for (const i of wrong){ const b = fm.sids[i]; if (corr && b && b !== corr) out.push([fm.fam, corr, b]); } }
  }
  return out.filter(([f,t,b]) => t && b && t !== b);
}
function recordConfusion(it){
  for (const [f,t,b] of confusionsOf(it)){ const k = f+"|"+t+"|"+b, c = P.conf[k] || (P.conf[k] = { n:0, w:0 }); c.n++; c.last = Date.now(); }
  const q = it.q;
  if (it.ok && q.src === "gen" && q.gen.include){ const k = q.gen.fam+"|"+q.gen.targets[0]+"|"+q.gen.include[0]; if (P.conf[k]) P.conf[k].w = (P.conf[k].w||0) + 1; }
}
function confList(){
  return Object.entries(P.conf).map(([k, c]) => { const [f,t,b] = k.split("|"); return { k, f, t, b, n:c.n, w:c.w||0, s: c.n - 0.7*(c.w||0) + (Date.now()-(c.last||0) < 3*DAY ? 0.5 : 0) }; })
    .filter(x => x.s > 0 && E.FMAP[x.f] && E.FMAP[x.f].sols[x.t] && E.FMAP[x.f].sols[x.b]).sort((a,b) => b.s - a.s);
}
function duelSet(n=8){
  const list = confList(), out = [], seen = new Set();
  for (let g = 0; out.length < n && g < n*4 && list.length; g++){
    const x = list[g % list.length], flip = g >= list.length && Math.random() < 0.4;
    const q = E.duel(x.f, flip ? x.b : x.t, flip ? x.t : x.b, { level: levelForFam(x.f), exclude: seen });
    if (q){ out.push(q); seen.add(q.id); }
  }
  return out;
}
const solName = (f, s) => E.FMAP[f].sols[s].n;

/* ───────── gamificación ───────── */
const TITLES = [[1,"Novato de la nube"],[3,"Explorador"],[5,"Constructor"],[8,"Arquitecto junior"],[12,"Arquitecto"],[16,"Arquitecto senior"],[20,"Maestro Well-Architected"]];
const xpAt = L => 50*L*(L-1);
const levelOf = xp => { let L=1; while (xpAt(L+1) <= xp) L++; return L; };
const titleOf = L => TITLES.filter(t => t[0] <= L).pop()[1];
const today = () => P.days[todayKey()] || (P.days[todayKey()] = { n:0, c:0, xp:0 });
function streak(){
  let d = new Date(); d.setHours(12);
  if (!(P.days[keyOf(d)]?.n)) d = new Date(d - DAY);
  let s = 0; while (P.days[keyOf(d)]?.n){ s++; d = new Date(d - DAY); }
  return s;
}
const totals = () => Object.values(P.days).reduce((a, x) => ({ n: a.n + (x.n||0), c: a.c + (x.c||0) }), { n:0, c:0 });
const BADGES = [
  ["primera","Primer paso","Tu primera respuesta correcta.","star"],
  ["combo5","En racha","Combo de 5 aciertos seguidos.","flame"],
  ["combo10","Imparable","Combo de 10 aciertos seguidos.","flame"],
  ["combo20","Leyenda","Combo de 20 aciertos seguidos.","crown"],
  ["meta","Meta cumplida","Alcanza tu meta diaria de preguntas.","target"],
  ["racha3","Constancia","Practica 3 días seguidos.","cal"],
  ["racha7","Semana perfecta","Practica 7 días seguidos.","cal"],
  ["cien","Centenario","Responde 100 preguntas.","check"],
  ["quinientos","Veterano","Responde 500 preguntas.","trophy"],
  ["jefe","Cara a cara","Termina un simulacro de 65 preguntas.","crown"],
  ["aprobado","Jefe derrotado","Saca 72% o más en un simulacro.","trophy"],
  ["rayo","Rayo","15 aciertos en una partida contrarreloj.","bolt"],
  ["sobreviviente","Sobreviviente","20 aciertos en supervivencia.","heart"],
  ["explorador","Explorador del motor","Responde 50 preguntas generadas.","spark"],
  ["decisor","Arquitecto de decisiones","Practica 15 decisiones distintas.","grid"],
  ["d1","Guardián","Mundo 1 (seguridad) al 80%.","lock"],
  ["d2","Inquebrantable","Mundo 2 (resiliencia) al 80%.","redo"],
  ["d3","Velocista","Mundo 3 (rendimiento) al 80%.","bolt"],
  ["d4","Ahorrador","Mundo 4 (costos) al 80%.","chart"]
];
function unlock(id){
  if (P.badges[id]) return;
  P.badges[id] = Date.now(); saveP();
  const b = BADGES.find(x => x[0] === id); sound("badge");
  toast("¡Logro desbloqueado! " + b[1], { sub: b[2], c:"var(--gold)", icon: b[3] });
}
function checkBadges(){
  const t = totals(), st = streak();
  if (t.c >= 1) unlock("primera");
  if (P.best.combo >= 5) unlock("combo5"); if (P.best.combo >= 10) unlock("combo10"); if (P.best.combo >= 20) unlock("combo20");
  if (st >= 3) unlock("racha3"); if (st >= 7) unlock("racha7");
  if (t.n >= 100) unlock("cien"); if (t.n >= 500) unlock("quinientos");
  if (P.best.time >= 15) unlock("rayo"); if (P.best.surv >= 20) unlock("sobreviviente");
  if (Object.values(P.fams).reduce((a,b)=>a+b,0) >= 50) unlock("explorador");
  if (Object.keys(P.fams).length >= 15) unlock("decisor");
  // un mundo cuenta como dominado solo con datos suficientes: 25+ respuestas y la mitad de sus temas jugados
  for (const d of [1,2,3,4]) {
    const ts = TOPICS.filter(x => x.d === d), stats = ts.map(x => topicStats(x.id));
    const n = stats.reduce((a, s) => a + s.n, 0), played = stats.filter(s => s.n > 0).length;
    const m = domainMastery(d);
    if (m != null && m >= 0.8 && n >= 25 && played >= ts.length / 2) unlock("d"+d);
  }
}
function addXP(n){
  if (!n) return;
  const before = levelOf(P.xp); P.xp += n; today().xp += n; saveP();
  const after = levelOf(P.xp);
  if (after > before){ sound("lvl"); confetti(); toast(`¡Subiste al nivel ${after}!`, { sub: titleOf(after), c:"var(--primary)", icon:"crown" }); }
}
function recordAnswer(ok){
  const d = today(); d.n++; if (ok) d.c++;
  if (d.n === P.goal){ addXP(50); unlock("meta"); toast("¡Meta diaria cumplida! +50 XP", { sub: `${P.goal} preguntas hoy`, c:"var(--good)", icon:"target" }); }
  saveP();
}
const xpFor = (q, combo) => (q.src === "gen" ? [0,10,13,16][q.gen.level || 2] : 12) + Math.min(10, Math.max(0, combo-1) * 2);

/* sonido y efectos */
let AC = null;
const SND = { ok:[[660,.09],[880,.15]], no:[[230,.16],[180,.22]], lvl:[[523,.1],[659,.1],[784,.1],[1046,.28]], badge:[[880,.08],[1175,.08],[1568,.22]], tick:[[1200,.04]] };
function sound(k){
  if (!P.sound) return;
  try {
    AC = AC || new AudioContext(); let t = AC.currentTime;
    for (const [f, d] of SND[k]){ const o = AC.createOscillator(), g = AC.createGain(); o.type = "triangle"; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02); t += d * 0.85; }
  } catch(e){}
}
function confetti(){
  if (reduced()) return;
  const host = document.createElement("div"); host.className = "confetti";
  const cols = ["#8B5CF6","#22D3EE","#F472B6","#FBBF24","#34D399"];
  for (let i=0;i<70;i++){ const s = document.createElement("i"); s.style.left = Math.random()*100+"%"; s.style.background = cols[i%cols.length]; s.style.animationDuration = (1.4+Math.random()*1.6)+"s"; s.style.animationDelay = (Math.random()*.4)+"s"; host.appendChild(s); }
  document.body.appendChild(host); setTimeout(() => host.remove(), 3400);
}
function toast(msg, o={}){
  const t = document.createElement("div"); t.className = "toast"; if (o.c) t.style.setProperty("--c", o.c);
  t.innerHTML = `${o.icon?`<div class="ti">${ic(o.icon)}</div>`:""}<div>${esc(msg)}${o.sub?`<small>${esc(o.sub)}</small>`:""}</div>`;
  const host = $("#toasts"); host.appendChild(t); while (host.children.length > 3) host.firstChild.remove();
  setTimeout(() => t.remove(), o.ms || 3200);
}

/* ───────── selección de preguntas ───────── */
function pickFrom(cands, n){
  const scored = shuffle(cands).map(q => { const h = hist(q.id); return {q, k: h.length ? (h.slice(-1)==="0" ? 1 : 2 + h.length) : 0}; });
  scored.sort((a,b) => a.k - b.k);
  return scored.slice(0, n).map(x => x.q);
}
function weightedTopic(filter){
  const pr = priorities().filter(filter || (() => true)); if (!pr.length) return null;
  let r = Math.random() * pr.reduce((s,x)=>s+x.p,0);
  for (const x of pr){ r -= x.p; if (r <= 0) return x.t; }
  return pr[0].t;
}
function genFor(tids, n, opts={}){
  const out = [], seen = new Set(opts.exclude || []);
  const tset = tids.filter(t => GEN_TOPICS.has(t)); if (!tset.length) return out;
  for (let g = 0; out.length < n && g < n*6; g++){
    const t = opts.weighted ? weightedTopic(x => tset.includes(x.t.id)).id : tset[g % tset.length];
    const q = E.generate({ topics:[t], level: opts.level || levelFor(t), levelFn: opts.level ? undefined : levelForFam, multi: opts.multi ?? 0.15, exclude: seen });
    if (q){ out.push(q); seen.add(q.id); }
  }
  return out;
}
const genAdaptive = (n, opts={}) => genFor(opts.topics || [...GEN_TOPICS], n, { ...opts, weighted: true });
function quickSet(n=10){
  const out = pickFrom(dueList(), 3);
  while (out.length < Math.round(n*0.6)){ const t = weightedTopic(x => BASE_N[x.t.id] > 0); const c = pickFrom(BASE.filter(q => q.t===t.id && !out.includes(q)), 1); if (!c.length) break; out.push(c[0]); }
  out.push(...genAdaptive(n - out.length, { exclude: out.map(q=>q.id) }));
  return shuffle(out);
}
function diagnosticSet(){
  const out = [];
  for (const t of TOPICS){ const b = pickFrom(BASE.filter(q=>q.t===t.id), 1); out.push(...(b.length ? b : genFor([t.id], 1, { level: 2, multi: 0 }))); }
  for (const [d,n] of Object.entries({1:5, 2:4, 3:3})) out.push(...pickFrom(BASE.filter(q => TMAP[q.t].d===+d && !out.includes(q)), n));
  return shuffle(out);
}
const SIM_SCORED = {1:15, 2:13, 3:12, 4:10};
const simLevel = f => Math.max(2, levelForFam(f));
const simWeek = ts => Math.max(1, Math.min(4, Math.floor((ts - new Date(2026,9,1).getTime()) / (7*DAY)) + 1));
// estimación de la escala 100-1000: AWS no publica la conversión; se asume que 72% de las puntuables ≈ 720
const toScaled = p => Math.round(p <= 0.72 ? 100 + p/0.72*620 : 720 + (p-0.72)/0.28*280);
function simSet(){
  const used = new Set(P.simUsed || []), per = { ...SIM_SCORED };
  for (let i = 0; i < 15; i++){ let x = Math.random()*100; for (const d of [1,2,3,4]){ x -= DOMAINS[d].w; if (x <= 0){ per[d]++; break; } } }
  const out = [];
  for (const d of [1,2,3,4]){
    const n = per[d], pool = BASE.filter(q => TMAP[q.t].d === d), fresh = pool.filter(q => !used.has(q.id));
    const nb = Math.round(n*0.5), base = pickFrom(fresh.length >= nb ? fresh : pool, nb);
    const tids = TOPICS.filter(t => t.d === d && GEN_TOPICS.has(t.id)).map(t => t.id);
    const comps = [], nComp = Math.round(n*0.12);
    for (let g = 0; comps.length < nComp && g < nComp*6; g++){ const c = E.composite({ topics: tids, levelFn: simLevel }); if (c && TMAP[c.t].d === d && !comps.some(x => x.id === c.id)) comps.push(c); }
    const gen = E.generateSet(n - base.length - comps.length, { topics: tids, levelFn: simLevel, multi: 0, exclude: new Set([...base, ...comps].map(q => q.id)) });
    out.push(...base, ...comps, ...gen);
    while (out.filter(q => TMAP[q.t].d === d).length < n){ const extra = pickFrom(pool.filter(q => !out.includes(q)), 1); if (!extra.length) break; out.push(extra[0]); }
  }
  return shuffle(out);
}
const sims = () => S.sessions.filter(s => s.sim).sort((a,b) => a.end - b.end);
function topicSet(ids, n){
  const base = pickFrom(BASE.filter(q => ids.includes(q.t)), Math.ceil(n * 0.6));
  return shuffle([...base, ...genFor(ids, n - base.length)]);
}
// siguiente pregunta para los modos sin fin (contrarreloj y supervivencia): solo de una respuesta
function nextEndless(used){
  for (let g = 0; g < 20; g++){
    if (Math.random() < 0.55){
      const t = weightedTopic(x => GEN_TOPICS.has(x.t.id));
      const q = E.generate({ topics:[t.id], level: levelFor(t.id), levelFn: levelForFam, multi: 0, exclude: used });
      if (q && !used.has(q.id)) return q;
    } else {
      const t = weightedTopic(x => BASE_N[x.t.id] > 0);
      const c = pickFrom(BASE.filter(q => q.t===t.id && q.a.length===1 && !used.has(q.id)), 1);
      if (c.length) return c[0];
    }
  }
  return null;
}

/* ───────── ruta por mundos (estilo Duolingo) ─────────
   Campamento base → 4 mundos (uno por dominio) → Recta final. Cada tema tiene 2 lecciones
   (Aprender y Dominar); a mitad de cada mundo hay un cofre de repaso y al final un jefe.
   Vencer al jefe abre el mundo siguiente y salta las lecciones que falten. */
const ORDER_PREF = { 1:["iam","org","vpcsec","threat","encrypt","s3sec","audit","govops"], 2:["decouple","serverless","containers","ha","dr","dbha","observ"],
  3:["storage","compute","dbperf","edge","network","data","migrate","ml","hybrid","webapps"], 4:["coststorage","costcompute","costdb","costnet","costtools"] };
const ORDER = Object.fromEntries([1,2,3,4].map(d => { const ts = TOPICS.filter(t => t.d === d).map(t => t.id); return [d, [...ORDER_PREF[d].filter(t => ts.includes(t)), ...ts.filter(t => !ORDER_PREF[d].includes(t))]]; }));
const WORLDS = [
  { w:0, eyebrow:"Punto de partida", name:"Campamento base", sub:"Mide desde dónde partes", c:"var(--cyan)" },
  ...[1,2,3,4].map(d => ({ w:d, eyebrow:`Mundo ${d} · ${DOMAINS[d].w}% del examen`, name:DOMAINS[d].short, sub:DOMAINS[d].name, c:dcol(d),
    lock: d === 1 ? "Se abre al completar el campamento base" : `Se abre al vencer al Jefe del mundo ${d-1}` })),
  { w:5, eyebrow:"Mundo final", name:"Recta final", sub:"Simulacros, brechas y el día del examen", c:"var(--gold)", lock:"Se abre al vencer al Jefe del mundo 4" }
];
const PATH = [{ id:"diag", w:0, kind:"diag", title:"Diagnóstico", rounds:1 }];
for (const d of [1,2,3,4]){
  const ts = ORDER[d], mid = Math.ceil(ts.length/2);
  ts.forEach((t, i) => { PATH.push({ id:"t:"+t, w:d, kind:"topic", t, title:TMAP[t].name, rounds:2 }); if (i === mid-1) PATH.push({ id:"chest:"+d, w:d, kind:"chest", title:"Cofre de repaso", rounds:1 }); });
  PATH.push({ id:"boss:"+d, w:d, kind:"boss", title:`Jefe del mundo ${d}`, rounds:1 });
}
PATH.push({ id:"sim1", w:5, kind:"sim1", title:"Simulacro completo", rounds:1 }, { id:"gaps", w:5, kind:"gaps", title:"Cerrar brechas", rounds:1 },
  { id:"duel", w:5, kind:"duel", title:"Duelos de confusiones", rounds:1 }, { id:"simfinal", w:5, kind:"simfinal", title:"Simulacro final: 720+", rounds:1 },
  { id:"goal", w:5, kind:"goal", title:"Día del examen", rounds:1 });
const PMAP = Object.fromEntries(PATH.map(n => [n.id, n]));
const BONUS = { diag:50, topic:20, chest:30, boss:100, sim1:50, gaps:30, duel:30, simfinal:150 };
const rDone = n => P.path.skip[n.id] ? n.rounds : Math.min(n.rounds, P.path.r[n.id] || 0);
const isDone = n => rDone(n) >= n.rounds;
const worldOpen = w => w === 0 || (w === 1 ? isDone(PMAP.diag) : isDone(PMAP["boss:"+(w-1)]));
function nodeState(n){
  if (n.kind !== "goal" && isDone(n)) return "done";
  if (!worldOpen(n.w) || n.kind === "goal") return "locked";
  if (n.kind === "boss") return "open"; // el jefe siempre se puede intentar para saltar el mundo
  const ws = PATH.filter(x => x.w === n.w);
  return ws.slice(0, ws.indexOf(n)).every(isDone) ? "open" : "locked";
}
const currentNode = () => PATH.find(n => n.kind !== "goal" && nodeState(n) === "open") || null;
const needOf = (n, round) => n.kind === "topic" ? (round === 1 ? 0.6 : 0.7) : (n.kind === "boss" || n.kind === "gaps") ? 0.72 : 0;
const shortName = n => n.kind === "topic" ? TMAP[n.t].name.split(":")[0] : n.title;
// créditos por lo que ya hiciste fuera de la ruta (diagnóstico o simulacros desde Jugar)
function syncPath(){
  if (S.sessions.some(s => s.mode === "diag" && s.n >= 20)) P.path.r.diag = Math.max(P.path.r.diag || 0, 1);
  if (sims().length) P.path.r.sim1 = 1;
  if (sims().some(s => s.sim.pass)) P.path.r.simfinal = 1;
}
// ritmo frente al plan de 23 días: los días de estudio piden la lección 1 y los de práctica la 2
function pace(){
  const k = todayKey(), exp = {};
  for (const p of PLAN) if (p.d <= k && p.topics) for (const t of p.topics) exp[t] = Math.max(exp[t] || 0, p.k === "A" ? 1 : 2);
  let behind = 0; for (const [t, r] of Object.entries(exp)) if (PMAP["t:"+t]) behind += Math.max(0, r - rDone(PMAP["t:"+t]));
  const p = planToday();
  return { behind, today: new Set(p && p.d === k && p.topics ? p.topics : []), plan: p };
}
function lessonSet(tid, n, level){
  const base = pickFrom(BASE.filter(q => q.t === tid && (level !== 1 || q.a.length === 1)), Math.ceil(n/2));
  return shuffle([...base, ...genFor([tid], n - base.length, { level, multi: level === 1 ? 0 : 0.15, exclude: base.map(q => q.id) })]);
}
function bossSet(d){
  const ids = shuffle(ORDER[d]), out = [];
  for (const t of ids){ if (out.length >= 6) break; out.push(...pickFrom(BASE.filter(q => q.t === t), 1)); }
  out.push(...genFor(ids, 12 - out.length, { exclude: out.map(q => q.id), multi: 0.15 }));
  return shuffle(out);
}
function chestSet(d){
  const played = ORDER[d].filter(t => rDone(PMAP["t:"+t]) > 0), ids = played.length ? played : ORDER[d].slice(0, 2);
  const due = pickFrom(dueList().filter(q => ids.includes(q.t)), 4);
  return shuffle([...due, ...topicSet(ids, 8 - due.length).filter(q => !due.includes(q))]);
}
function startNode(id){
  const n = PMAP[id]; if (!n || nodeState(n) === "locked") return;
  pathOpen = null;
  const round = isDone(n) ? n.rounds : rDone(n) + 1, base = { path:{ id, round }, from:"ruta" };
  switch (n.kind){
    case "diag": return startQuiz({ ...base, label:"Diagnóstico", mode:"diag", qs: diagnosticSet() });
    case "topic": return round === 1
      ? startQuiz({ ...base, label:`${shortName(n)} · Aprender`, mode:"lesson", qs: lessonSet(n.t, 6, 1), intro: n.t })
      : startQuiz({ ...base, label:`${shortName(n)} · Dominar`, mode:"lesson", qs: lessonSet(n.t, 8) });
    case "chest": return startQuiz({ ...base, label:`Cofre de repaso · Mundo ${n.w}`, mode:"chest", qs: chestSet(n.w) });
    case "boss": return startQuiz({ ...base, label:n.title, mode:"boss", qs: bossSet(n.w) });
    case "sim1": case "simfinal": return startQuiz({ ...base, label:n.title, mode:"exam", qs: simSet(), exam:true, minutes:130, sim:true });
    case "gaps": return startQuiz({ ...base, label:"Cerrar brechas", mode:"topic", qs: topicSet(priorities().slice(0,4).map(x => x.t.id), 12) });
    case "duel": { const qs = confList().length ? duelSet(8) : genAdaptive(8); return startQuiz({ ...base, label:"Duelos de confusiones", mode:"duel", qs }); }
  }
}
function pathResult(sess){
  const n = PMAP[Q.path.id], round = Q.path.round, before = rDone(n), need = needOf(n, round);
  const complete = Q.items.every(i => i.done), ratio = sess.sim ? sess.sim.p : sess.c / sess.n;
  const passed = complete && (n.kind === "simfinal" ? sess.sim.pass : ratio >= need);
  const out = { id:n.id, round, passed, complete, need, ratio, first:false, bonus:0, unlocked:null };
  if (passed && round > before){
    out.first = true; out.bonus = BONUS[n.kind] || 0;
    P.path.r[n.id] = Math.max(P.path.r[n.id] || 0, round);
    if (n.kind === "boss"){ for (const x of PATH) if (x.w === n.w && !isDone(x)) P.path.skip[x.id] = true; out.unlocked = n.w + 1; }
    saveP();
  }
  return out;
}

/* ───────── motor de partidas ───────── */
const newItem = q => ({ q, order: shuffle(q.o.map((_,i)=>i)), picked: [], done:false, ok:null, flag:false, xp:0, ms:0 });
function stamp(){ if (!Q || Q.result) return; const it = Q.items[Q.i]; if (it){ it.ms += Date.now() - Q.t0; } Q.t0 = Date.now(); }
function setIdx(i){ stamp(); Q.i = i; Q.review = false; render(); }
function startQuiz(opts){
  const { label, mode, qs, exam=false, minutes=0, lives=0, endless=false, sim=false, path=null, intro=null, from=null } = opts;
  if (!qs.length){ toast("No hay preguntas disponibles para este modo todavía.", { c:"var(--bad)", icon:"x" }); return; }
  if (Q && Q.timer) clearInterval(Q.timer);
  Q = { label, mode, exam, sim, path, intro, from: from || view, start: Date.now(), t0: Date.now(), i:0, deadline: minutes ? Date.now() + minutes*60000 : 0, items: qs.map(newItem), combo:0, maxCombo:0, xp:0, lives, maxLives: lives, endless, used: new Set(qs.map(q=>q.id)), drawer:null, review:false, filter:"todas" };
  if (sim) shuffle(Q.items.map((_,i) => i)).slice(0, 15).forEach(i => Q.items[i].unscored = true);
  if (Q.deadline) Q.timer = setInterval(tick, 250);
  render(); $("#mainscroll").scrollTo({top:0});
  if (!P.glTip && glossOn()){ P.glTip = true; saveP(); setTimeout(() => toast("Palabras con línea punteada = glosario", { sub:"Pasa el mouse para ver qué significan (clic para fijar). La tecla G muestra todos los términos de la pregunta.", icon:"book", c:"var(--cyan)", ms:7000 }), 500); }
}
function tick(){
  if (!Q || !Q.deadline || Q.result) return;
  const left = Q.deadline - Date.now(); const el = $("#qtimer");
  if (left <= 0){ clearInterval(Q.timer); Q.timer = null; finishQuiz(true); return; }
  if (el){ const h = Math.floor(left/3600000), m = Math.floor(left/60000)%60, s = Math.floor(left/1000)%60; el.textContent = (h ? h+":"+String(m).padStart(2,"0") : m)+":"+String(s).padStart(2,"0"); el.classList.toggle("low", left < (Q.mode==="time" ? 30000 : 600000)); }
}
const isRight = it => it.q.a.slice().sort().join(",") === it.picked.slice().sort().join(",");
function updateQS(q, ok){
  const s = S.qstate[q.id] || {h:"", box:0, due:0};
  s.h = (s.h + (ok ? "1" : "0")).slice(-5); s.last = Date.now();
  if (!ok){ s.box = 1; s.due = Date.now(); }
  else if (s.box > 0){ s.box++; if (s.box >= 4){ s.box = 0; s.due = 0; } else s.due = Date.now() + [0,0,1,3][s.box]*DAY; }
  S.qstate[q.id] = s; keepGen(q); rateQ(q, ok);
}
function confirmItem(){
  const it = Q.items[Q.i]; if (!it.picked.length || it.done) return;
  it.done = true; it.ok = isRight(it); updateQS(it.q, it.ok); recordAnswer(it.ok); recordConfusion(it); saveQS();
  if (it.ok){ Q.combo++; Q.maxCombo = Math.max(Q.maxCombo, Q.combo); if (Q.combo > P.best.combo) P.best.combo = Q.combo; it.xp = xpFor(it.q, Q.combo); Q.xp += it.xp; addXP(it.xp); sound("ok"); }
  else { Q.combo = 0; sound("no"); if (Q.lives) Q.lives--; }
  checkBadges();
  if (Q.mode === "time"){ render(); setTimeout(() => { if (Q && !Q.result){ if (!advance()) finishQuiz(); } }, 550); return; }
  render();
}
function advance(){
  if (Q.i < Q.items.length - 1){ setIdx(Q.i + 1); return true; }
  if (Q.endless){ const q = nextEndless(Q.used); if (!q) return false; Q.used.add(q.id); Q.items.push(newItem(q)); setIdx(Q.i + 1); return true; }
  return false;
}
function next(){
  const it = Q.items[Q.i];
  if (Q.mode === "surv" && it.done && Q.lives <= 0) return finishQuiz();
  if (Q.exam && Q.i === Q.items.length - 1){ stamp(); Q.review = true; return render(); }
  if (!advance() && (it.done || Q.exam)) finishQuiz();
}
async function finishQuiz(timeUp=false){
  if (!Q || Q.result) return;
  stamp();
  if (Q.timer){ clearInterval(Q.timer); Q.timer = null; }
  if (Q.exam){
    for (const it of Q.items){ if (it.done) continue; if (it.picked.length){ it.done = true; it.ok = isRight(it); updateQS(it.q, it.ok); recordAnswer(it.ok); recordConfusion(it); } else { it.done = true; it.ok = false; it.blank = true; } }
    const c = Q.items.filter(i => i.ok).length; Q.xp = c * 10 + 100; saveQS();
  }
  const done = Q.items.filter(i => i.done);
  if (!done.length){ Q = null; render(); return; }
  const byD = {}, byT = {};
  for (const it of done){ const d = TMAP[it.q.t].d; (byD[d] ||= [0,0]); byD[d][1]++; (byT[it.q.t] ||= [0,0]); byT[it.q.t][1]++; if (it.ok){ byD[d][0]++; byT[it.q.t][0]++; } }
  const c = done.filter(i => i.ok).length;
  const sess = { id: uid(), mode: Q.mode, label: Q.label, start: Q.start, end: Date.now(), n: done.length, c, byD, byT, wrong: done.filter(i=>!i.ok).map(i=>i.q.id), timeUp, xp: Q.xp, combo: Q.maxCombo };
  if (Q.sim){
    const sc = Q.items.filter(i => !i.unscored), cs = sc.filter(i => i.ok).length, p = cs / sc.length, scaled = toScaled(p);
    const sd = {}; for (const it of sc){ const d = TMAP[it.q.t].d; (sd[d] ||= [0,0]); sd[d][1]++; if (it.ok) sd[d][0]++; }
    const wt = {}; for (const it of sc) if (!it.ok) wt[it.q.t] = (wt[it.q.t]||0) + 1;
    const fl = Q.items.filter(i => i.flag), un = Q.items.filter(i => i.unscored);
    sess.sim = { scaled, pass: scaled >= 720, p, cs, ns: sc.length, byD: sd, wrongT: wt, avgSec: Math.round(Q.items.reduce((a,i)=>a+i.ms,0)/Q.items.length/1000), flagged: fl.length, flaggedOk: fl.filter(i=>i.ok).length, blank: Q.items.filter(i=>i.blank).length, unscoredOk: un.filter(i=>i.ok).length, week: simWeek(Date.now()) };
    Q.xp = Math.round(scaled/10) + 100;
    P.simUsed = [...(P.simUsed||[]), ...Q.items.filter(i => i.q.src !== "gen").map(i => i.q.id)].slice(-400);
    sess.xp = Q.xp;
  }
  if (Q.exam) addXP(Q.xp);
  if (Q.path){
    Q.pathOut = pathResult(sess);
    if (Q.pathOut.bonus){ addXP(Q.pathOut.bonus); sess.xp = (sess.xp || 0) + Q.pathOut.bonus; }
    if (Q.pathOut.first) sound(Q.pathOut.unlocked ? "lvl" : "badge");
  }
  Q.result = sess; S.sessions.push(sess); syncPath();
  Q.record = false;
  if (Q.mode === "time" && c > P.best.time){ P.best.time = c; Q.record = true; }
  if (Q.mode === "surv" && c > P.best.surv){ P.best.surv = c; Q.record = true; }
  const passed = sess.sim ? sess.sim.pass : c / sess.n >= 0.72;
  if (Q.exam){ unlock("jefe"); if (passed) unlock("aprobado"); }
  const ratio = c / sess.n;
  if (Q.record || (Q.exam && passed) || (sess.n >= 5 && ratio >= 0.9) || (Q.pathOut && Q.pathOut.unlocked)) confetti();
  saveP(); checkBadges(); Q.drawer = null;
  render(); $("#mainscroll").scrollTo({top:0});
  await Store.set("sessions/"+sess.id, sess);
}

/* ───────── razonamiento paso a paso ───────── */
function reasonHTML(it){
  const q = it.q, T = TMAP[q.t];
  const ex = q.x ? { x:q.x, goalTip: q.x.goal ? E.GOAL_TIPS[q.x.goal] : null, multiTip: q.a.length>1 ? "«Elige 2»: cada respuesta correcta suele resolver una parte distinta del problema." : null } : E.explainBase(q);
  const x = ex.x, L = k => "ABCDE"[it.order.indexOf(k)];
  const gs = new Set(), parts = [`<div class="step"><h4>Explicación</h4><div>${glx(q.e, gs)}</div></div>`];
  if (it.done && !it.ok) parts.unshift(`<div class="step"><h4>Tu respuesta vs. la correcta</h4>${compareHTML(it, true)}</div>`);
  const tips = [ex.goalTip, ex.multiTip].filter(Boolean);
  if (tips.length) parts.push(`<div class="step"><h4>Qué pide la pregunta</h4>${tips.map(t=>`<div>${esc(t)}</div>`).join("")}</div>`);
  if (x){
    if (x.signals.length) parts.push(`<div class="step"><h4>Señales del enunciado</h4>${x.signals.map(s=>`<div class="signal">${s.txt?`<span class="muted">«${esc(s.txt)}»</span>`:""}<b>${esc(s.lbl)}</b><span class="muted">Solo lo cumple${s.keeps.length>1?"n":""}: ${esc(s.keeps.join(", ") || "ninguna")}</span></div>`).join("")}</div>`);
    if (x.cols.length) parts.push(`<div class="step"><h4>Matriz de descarte</h4><table class="mx"><thead><tr><th>Opción</th>${x.cols.map(c=>`<th>${esc(c.lbl)}${c.implicit?" *":""}</th>`).join("")}</tr></thead><tbody>
      ${it.order.map(k => { const r = x.rows[k]; return `<tr class="${r.correct?'ok':''}"><td><b>${L(k)}</b> ${r.correct?'✓':''}${r.fails.length?`<div class="why">${esc(r.fails[0])}</div>`:(!r.correct && r.sid && x.goal ? `<div class="why">Cumple, pero pierde en ${esc((x.goalLbl||"").toLowerCase())}</div>` : (!r.sid ? `<div class="why">Fuera del modelo: revisa la explicación</div>` : ""))}</td>${r.cells.map(c=>`<td class="${c==null?'u':c?'y':'x'}">${c==null?'·':c?'✓':'✗'}</td>`).join("")}</tr>`; }).join("")}
      </tbody></table>${x.cols.some(c=>c.implicit)?'<div class="why">* Requisito implícito: se da por sentado aunque el enunciado no lo diga.</div>':''}</div>`);
    if (x.ranking) parts.push(`<div class="step"><h4>Desempate · ${esc(x.goalLbl)}</h4><ol class="rank">${x.ranking.map(r=>`<li class="${r.correct?'ok':''}">${esc(r.n)}${r.txt?` <span class="muted">${esc(r.txt)}</span>`:""}</li>`).join("")}</ol>${x.rankLbl?`<div class="why">${esc(x.rankLbl)}</div>`:""}</div>`);
    if (x.contrast) parts.splice(1, 0, `<div class="trap"><b>Duelo: ${esc(x.contrast.a)} vs ${esc(x.contrast.b)}</b><div>Lo que los separa: ${esc(x.contrast.keys.map(k=>"«"+k+"»").join(", "))}. ${esc(x.contrast.b)} ${esc(x.contrast.why)}.</div></div>`);
    if (x.composite) parts.splice(1, 0, `<div class="signal"><b>Pregunta de dos partes</b><span class="muted">Las columnas de la izquierda son de «${esc(x.partNames[0])}» y las de la derecha de «${esc(x.partNames[1])}». Cada respuesta correcta cumple su parte; · significa que esa columna no aplica.</span></div>`);
    if (x.multiParts) parts.splice(1, 0, `<div class="signal"><b>Cada respuesta correcta cubre una parte</b><span class="muted">Por eso una correcta puede tener ✗ en la columna de la otra parte.</span></div>`);
    parts.push(`<div class="rule"><b>Regla para el examen · ${esc(x.famName)}</b><div>${glx(x.rule, gs)}</div></div>`);
  } else if (ex.ruleOnly) parts.push(`<div class="rule"><b>Regla relacionada · ${esc(ex.ruleOnly.famName)}</b><div>${esc(ex.ruleOnly.rule)}</div></div>`);
  const text = q.q + " " + q.a.map(i=>q.o[i]).join(" ") + " " + (q.e||"");
  const traps = E.related(T.traps, text, s => s, 2, 2);
  if (traps.length) parts.push(`<div class="trap"><b>Trampa relacionada</b><ul>${traps.map(t=>`<li>${glx(t, gs)}</li>`).join("")}</ul></div>`);
  const cards = E.related(T.cards, text, c => c[0]+" "+c[1], 2, 3);
  if (cards.length) parts.push(`<div class="step"><h4>Para recordar</h4>${cards.map(c=>`<div><b>${glx(c[0], gs)}</b> → ${glx(c[1], gs)}</div>`).join("")}</div>`);
  const mine = S.errlog.filter(e => e.t === q.t).slice(-3);
  if (mine.length) parts.push(`<div class="step"><h4>Tus reglas de la bitácora</h4>${mine.map(e=>`<div>• ${esc(e.rule)}</div>`).join("")}</div>`);
  return `<div class="reason">${parts.join("")}</div>`;
}

/* ───────── glosario y «por qué tu opción no es» ───────── */
function glEntryHTML(e, o = {}){
  const self = new Set([e.id]), txt = s => o.page ? glx(s, self) : esc(s);
  return `<div class="gle"><div class="gleh"><b>${esc(e.t)}</b>${e.f ? `<span>${esc(e.f)}</span>` : ""}</div>
    <p>${txt(e.d)}</p>${e.x ? `<div class="glx"><b>En el examen:</b> ${txt(e.x)}</div>` : ""}${e.n ? `<div class="gln"><b>Ojo:</b> ${esc(capFirst(e.n))}.</div>` : ""}
    ${o.tip ? `<div class="glfoot"><span>${esc(e.c)}</span>${!o.pin ? `<span>Clic en la palabra para fijarla</span>` : !Q ? `<button class="btn ghost small" data-glgo="${e.id}">Ver en el glosario →</button>` : `<span>Clic fuera para cerrar</span>`}</div>` : o.page ? `<small class="faint">${esc(e.c)}</small>` : ""}</div>`;
}
const EXMEMO = {};
const exOf = q => q.x ? q.x : (q.id in EXMEMO ? EXMEMO[q.id] : (EXMEMO[q.id] = E.explainBase(q).x));
// por qué la opción i no es la respuesta: primero lo que dice el motor para ESTA pregunta, luego el glosario
function whyNot(q, i){
  const hand = typeof WHYNOT !== "undefined" && WHYNOT[q.id] && WHYNOT[q.id][i];
  if (hand) return { src:"motor", txt: hand };
  const x = exOf(q), r = x && x.rows && x.rows[i], term = G.mainTerm(q.o[i]);
  const subj = q.o[i].length <= 70 ? `«${q.o[i]}»` : term ? term.t : "Esta opción";
  if (r && r.fails && r.fails.length){
    const j = r.cells ? r.cells.findIndex(c => c === false) : -1, col = j >= 0 && x.cols[j] ? x.cols[j] : null;
    let f = r.fails[0], imp = false; if (f.startsWith("(requisito implícito) ")){ f = f.slice(22); imp = true; }
    return { src:"motor", req: col ? col.lbl : null, txt: `${subj} ${f}.${imp ? " (Es un requisito implícito: el enunciado lo da por sentado.)" : ""}` };
  }
  if (r && r.sid && x.goal && x.goalLbl) return { src:"motor", req: x.goalLbl, txt: `${subj} cumple los requisitos, pero pierde en «${x.goalLbl.toLowerCase()}» frente a la respuesta correcta.` };
  if (term && term.n) return { src:"glosario", txt: `${capFirst(term.n)}.` };
  return null;
}
function compareHTML(it, compact){
  const q = it.q, L = k => "ABCDE"[it.order.indexOf(k)], wrong = it.picked.filter(i => !q.a.includes(i));
  const rightTerms = new Set(q.a.map(i => G.mainTerm(q.o[i])).filter(Boolean).map(e => e.id));
  const what = (e, skip) => e && !skip ? `<p><b>Qué es ${esc(e.t)}:</b> ${esc(e.d)}</p>` : "";
  const wrongCol = wrong.map(i => {
    const e = G.mainTerm(q.o[i]), w = whyNot(q, i);
    return `<div class="cmpcol no"><div class="cmph">${ic("x")} Elegiste ${L(i)}</div><div class="cmpopt">${glx(q.o[i], new Set())}</div>
      ${what(e, e && rightTerms.has(e.id))}
      <p><b>${w && w.src === "motor" ? "Por qué no aquí" : "Por qué no"}:</b> ${w ? `${w.req ? `no cumple «${esc(w.req)}». ` : ""}${esc(w.txt)}` : "no resuelve lo que pide el enunciado. Compárala con la correcta y abre el razonamiento (R) para ver la tabla completa."}</p></div>`;
  }).join("");
  const blank = !it.picked.length ? `<div class="cmpcol no"><div class="cmph">${ic("x")} Sin responder</div><p>En el examen real una pregunta sin responder cuenta como incorrecta: siempre marca algo.</p></div>` : "";
  const right = q.a.map(i => {
    const e = G.mainTerm(q.o[i]);
    return `<div class="cmpopt">${glx(q.o[i], new Set())}</div>${what(e, false)}${e && e.x && !compact ? `<p class="glx"><b>En el examen:</b> ${esc(e.x)}</p>` : ""}`;
  }).join("");
  return `<div class="cmp ${compact ? "compact" : ""}">${wrongCol}${blank}
    <div class="cmpcol ok"><div class="cmph">${ic("check")} La correcta: ${q.a.map(L).join(" y ")}</div>${right}<p><b>Por qué sí:</b> ${glx(q.e, new Set())}</p></div></div>`;
}

/* ───────── barra superior ───────── */
function renderTop(){
  const due = dueList().length;
  $("#tabs").innerHTML = VIEWS.map(([v,l,i]) => `<button role="tab" data-v="${v}" aria-selected="${v===view || (v==="ruta" && view==="mapa")}" title="${l}">${ic(i)}<span class="lbl">${l}</span>${v==="jugar"&&due?`<span class="badge" title="Errores por repasar">${due}</span>`:""}</button>`).join("");
  const L = levelOf(P.xp), into = P.xp - xpAt(L), need = xpAt(L+1) - xpAt(L), st = streak(), days = daysLeft();
  const light = document.documentElement.dataset.theme === "light";
  $("#stats").innerHTML = `
    <div class="stat fire ${today().n?'':'off'}" title="Racha de días practicando">${icFill("flame","i")}${st}</div>
    <div class="stat lvl" title="${esc(titleOf(L))} · ${P.xp} XP"><div class="ring" style="--p:${Math.round(into/need*100)}"><span>${L}</span></div><div class="xp"><span>${P.xp.toLocaleString("es-PE")} XP</span><small>${esc(titleOf(L))}</small></div></div>
    <div class="stat" title="Días para el examen">${ic("clock")}${days === 0 ? "¡Hoy!" : days + " d"}</div>
    <button class="iconbtn" data-top="sound" title="Sonido">${ic(P.sound?"sound":"mute")}</button>
    <button class="iconbtn" data-top="theme" title="Cambiar tema">${ic(light?"moon":"sun")}</button>
    <button class="iconbtn" data-top="help" title="Atajos (F1)">${ic("help")}</button>`;
}

/* ───────── vistas ───────── */
function go(v, opt){
  if (Q && !Q.result) return;
  if (Q && Q.result) Q = null;
  view = v; pathOpen = null;
  if (v === "mapa") topic = opt ?? null;
  if (v === "decisiones") fam = opt ?? null;
  render(); $("#mainscroll").scrollTo({top:0});
  if (v === "ruta") focusCurrent(false);
}
function render(){
  hideTip(); // el término al que apuntaba el tooltip desaparece al redibujar
  document.body.classList.toggle("playing", !!Q);
  if (Q){ $("#main").innerHTML = Q.result ? (Q.result.sim ? vSimResult() : vResult()) : Q.intro ? vIntro() : Q.review ? vReview() : vArena(); $("#drawerhost").innerHTML = Q.drawer ? drawerHTML() : ""; bind(); if (Q.deadline) tick(); return; }
  $("#drawerhost").innerHTML = "";
  renderTop();
  const fn = { ruta:vRuta, jugar:vJugar, mapa:vMapa, plan:vPlan, decisiones:vDecisiones, repaso:vRepaso, progreso:vProgreso, recursos:vRecursos }[view] || vRuta;
  $("#main").innerHTML = `<div class="wrap"><section class="view">${fn()}</section></div>`;
  bind();
}

/* Jugar */
function planToday(){ const k = todayKey(); return PLAN.find(p => p.d === k) || (k < PLAN[0].d ? PLAN[0] : null); }
function taskList(p){
  return p.tasks.map((t,i) => { const key = p.d+"#"+i, on = !!S.plan.done[key];
    return `<div class="task ${on?'done':''}"><input type="checkbox" id="tk-${key}" data-task="${key}" ${on?'checked':''}><label for="tk-${key}">${esc(t)}</label></div>`; }).join("");
}
function dayActions(p){
  if (!p) return "";
  const b = [];
  if (p.k === "D") b.push(`<button class="btn" data-act="diag">${ic("target")} Diagnóstico</button>`);
  if (p.topics) b.push(`<button class="btn" data-act="topics" data-topics="${p.topics.join(",")}" data-n="12">${ic("spark")} Temas del día</button>`);
  if (p.k === "S") b.push(`<button class="btn" data-act="exam">${ic("crown")} Simulacro</button>`);
  return b.join("");
}
function weekSimTxt(){ const w = simWeek(Date.now()), done = sims().filter(s => s.sim.week === w); return done.length ? `Semana ${w}: hecho · ${Math.max(...done.map(s=>s.sim.scaled))}` : `Semana ${w}: pendiente`; }
const MODES = [
  ["quick","Partida rápida","10 preguntas mezcladas de tus brechas, con explicación.","play","var(--primary)", () => "10 preguntas"],
  ["duel","Duelos","Enfrenta los servicios que confundes, con el requisito que los separa.","shuffle","var(--d3)", () => confList().length ? `${confList().length} confusiones activas` : "Aún sin confusiones"],
  ["time","Contrarreloj","3 minutos para acertar todas las que puedas.","bolt","var(--cyan)", () => `Récord: ${P.best.time}`],
  ["surv","Supervivencia","Tres vidas. Cada error cuesta una.","heart","var(--pink)", () => `Récord: ${P.best.surv}`],
  ["srs","Repaso de errores","Las que fallaste vuelven hasta que las domines.","redo","var(--good)", () => `${dueList().length} pendientes hoy`],
  ["exam","Jefe final: simulacro semanal","65 preguntas en 130 min (15 no puntúan) con puntaje 100-1000.","crown","var(--gold)", () => weekSimTxt()],
  ["diag","Diagnóstico","Una pregunta de cada tema para trazar tu mapa.","target","var(--d1)", () => `${TOPICS.length + 12} preguntas`]
];
const MODEN = { duel:"Duelos", quick:"Rápida", time:"Contrarreloj", surv:"Supervivencia", srs:"Repaso", exam:"Simulacro", diag:"Diagnóstico", gen:"Generadas", redo:"Repetición", topic:"Tema", lesson:"Lección", chest:"Cofre", boss:"Jefe" };

/* Ruta */
const NODE_IC = { diag:"target", chest:"chest", boss:"crown", sim1:"clock", gaps:"target", duel:"shuffle", simfinal:"flag", goal:"trophy" };
const ZIG = [0, 70, 112, 70, 0, -70, -112, -70];
function nodeIcon(n, st){
  if (n.kind === "goal") return ic("trophy");
  if (st === "locked" && n.kind !== "boss") return ic("lock");
  if (st === "done" && n.kind !== "boss") return ic("check");
  return n.kind === "topic" ? icFill("star") : ic(NODE_IC[n.kind]);
}
const worldName = w => WORLDS[w].w === 0 || w === 5 ? WORLDS[w].name : `Mundo ${w} · ${DOMAINS[w].short}`;
function nodeSub(n){
  if (n.kind !== "topic") return worldName(n.w);
  const r = rDone(n);
  return worldName(n.w) + " · " + (r >= 2 ? (P.path.skip[n.id] ? "saltada con el jefe" : "completada") : `lección ${r+1} de 2`);
}
function nodeDesc(n, st){
  if (n.kind === "goal") return `Viernes 23 de octubre. Faltan ${daysLeft()} días: llega con la ruta completa y la bitácora repasada.`;
  if (st === "locked"){
    if (!worldOpen(n.w)) return WORLDS[n.w].lock + ".";
    const prev = PATH.filter(x => x.w === n.w).find(x => !isDone(x));
    return `Completa «${shortName(prev)}» para desbloquear este paso.`;
  }
  const done = st === "done", pending = PATH.filter(x => x.w === n.w && x.kind !== "boss" && !isDone(x)).length;
  switch (n.kind){
    case "diag": return done ? "Diagnóstico hecho. Repítelo cuando quieras volver a medir tu punto de partida." : `Una pregunta de cada tema y algunas extra (${TOPICS.length + 12} en total, unos 60 minutos). Traza tu mapa de brechas: no importa el puntaje, se completa al terminarlo.`;
    case "topic": { const r = done ? 2 : rDone(n) + 1;
      return r === 1 ? "Aprender: primero lees lo esencial del tema y luego respondes 6 preguntas básicas. Completas la lección con 4 correctas."
        : done ? "Tema completado. Repite «Dominar» para reforzarlo: 8 preguntas a tu nivel." : "Dominar: 8 preguntas al nivel que te toca, incluidas algunas «Elige 2». Completas la lección con 70%."; }
    case "chest": return "8 preguntas de los temas que ya jugaste en este mundo, empezando por tus errores pendientes. Ábrelo para ganar +30 XP.";
    case "boss": return done ? "Jefe vencido. Puedes volver a enfrentarlo para medir cómo vas en este mundo."
      : pending ? `12 preguntas de todo el mundo. ¿Ya lo dominas? Con 72% abres el siguiente mundo y saltas las ${pending} lecciones que faltan.` : "12 preguntas de todo el mundo. Con 72% lo vences y se abre el siguiente mundo.";
    case "sim1": return "65 preguntas en 130 minutos, como el examen real, con puntaje de 100 a 1000. Se completa al entregarlo.";
    case "gaps": return "12 preguntas de tus 4 temas más débiles según tu historial. Completas el paso con 72%.";
    case "duel": return confList().length ? "Duelos entre los servicios que más confundes, con el requisito que los separa. Se completa al terminar." : "Aún no tienes confusiones registradas: será una práctica adaptativa de 8 preguntas.";
    case "simfinal": return "Otro simulacro completo. Este paso se completa cuando sacas 720 o más.";
  }
  return "";
}
const nodeBtn = (n, st) => st === "done" ? "Repasar" : n.kind === "boss" && PATH.some(x => x.w === n.w && x.kind !== "boss" && !isDone(x)) ? "Enfrentar al jefe" : rDone(n) ? "Continuar" : "Empezar";
function popHTML(n, st){
  const bonus = st !== "done" && BONUS[n.kind] ? ` <span class="pbonus">+${BONUS[n.kind]} XP</span>` : "";
  const btns = n.kind === "goal" ? "" : st === "locked" ? `<button class="btn popgo" disabled>${ic("lock")} Bloqueado</button>`
    : `<button class="btn big popgo" data-act="pathgo" data-node="${n.id}">${nodeBtn(n, st)}${bonus}</button>`
      + (n.kind === "topic" ? `<button class="btn small ghostw" data-topic="${n.t}">${ic("book")} Ver ficha</button>` : "")
      + (n.kind === "diag" && st !== "done" ? `<button class="btn small ghostw" data-act="pathskip" data-node="diag">Saltar por ahora</button>` : "");
  return `<div class="pop s-${st}" role="dialog" aria-label="${esc(n.title)}"><b>${esc(n.title)}</b><span class="psub">${esc(nodeSub(n))}</span><p>${esc(nodeDesc(n, st))}</p>${btns?`<div class="row">${btns}</div>`:""}</div>`;
}
function nodeHTML(n, i, cur, todaySet){
  const st = nodeState(n), isCur = cur && cur.id === n.id, r = rDone(n);
  const hoy = n.kind === "topic" && todaySet.has(n.t) && st !== "done";
  const stTxt = st === "done" ? "completado" : st === "locked" ? "bloqueado" : "disponible";
  return `<div class="pn ${pathOpen===n.id?'popped':''}" style="--x:${ZIG[i % ZIG.length]}px">
    ${isCur ? `<div class="bubble">${r ? "CONTINUAR" : "EMPEZAR"}</div>` : ""}
    <button class="pnode s-${st} nk-${n.kind} ${isCur?'cur':''} ${P.path.skip[n.id]?'skip':''} ${n.kind==="topic"?'ringed':''}" data-pnode="${n.id}" style="--p:${r/n.rounds*100}" aria-label="${esc(shortName(n))}: ${stTxt}" aria-expanded="${pathOpen===n.id}"><span class="disc">${nodeIcon(n, st)}</span></button>
    <div class="plabel">${esc(shortName(n))}${hoy?' <span class="hoy">Hoy</span>':''}</div>
    ${pathOpen===n.id ? popHTML(n, st) : ""}
  </div>`;
}
function vRuta(){
  const cur = currentNode(), pc = pace(), d = today(), goalP = Math.min(100, Math.round(d.n / P.goal * 100)), st = streak(), p = pc.plan;
  const countable = PATH.filter(n => n.kind !== "goal"), doneN = countable.filter(isDone).length;
  const units = WORLDS.map(W => {
    const ns = PATH.filter(n => n.w === W.w), open = worldOpen(W.w), cnt = ns.filter(n => n.kind !== "goal");
    return `<section class="unit ${open?'':'locked'}" style="--c:${W.c}">
      <header class="ubanner"><div><div class="eyebrow">${esc(W.eyebrow)}</div><h2>${esc(W.name)}</h2><div class="sub">${open ? esc(W.sub) : ic("lock")+" "+esc(W.lock)}</div></div>
        <div class="ucount"><b class="num">${cnt.filter(isDone).length}/${cnt.length}</b><small>completados</small></div></header>
      <div class="track">${ns.map((n, i) => nodeHTML(n, i, cur, pc.today)).join("")}</div></section>`;
  }).join("");
  const nextCard = cur ? `<div class="card stack nextc" style="--c:${WORLDS[cur.w].c}">
      <div class="eyebrow">Tu siguiente paso</div>
      <div class="row" style="gap:14px;flex-wrap:nowrap"><div class="nico">${nodeIcon(cur, "open")}</div><div><h3>${esc(cur.title)}</h3><div class="muted" style="font-size:.85rem">${esc(nodeSub(cur))}</div></div></div>
      <p class="note">${esc(nodeDesc(cur, "open"))}</p>
      <button class="btn primary big" data-act="pathgo" data-node="${cur.id}">${icFill("play","i")} ${nodeBtn(cur, "open")}</button>
      <div class="pace ${pc.behind?'late':''}">${pc.behind ? `${ic("clock")}<span>Te faltan <b>${pc.behind}</b> ${pc.behind===1?"lección":"lecciones"} para ir al día con el plan.</span>` : `${ic("check")}<span>¡Vas al día con el plan de estudio!</span>`}</div>
      <div class="stack" style="gap:6px"><div class="row between"><span class="eyebrow">Ruta completa</span><span class="muted num">${doneN}/${countable.length}</span></div><div class="bar"><i style="width:${doneN/countable.length*100}%;background:linear-gradient(90deg,var(--primary),var(--pink))"></i></div></div>
    </div>` : `<div class="card stack nextc" style="--c:var(--gold)"><div class="eyebrow">Ruta completa</div><h3>¡Llegaste al final de la ruta!</h3><p class="note">Hasta el examen: un simulacro por semana, duelos de tus confusiones y repaso de la bitácora desde Jugar y Repaso.</p><button class="btn primary" data-go="jugar">${icFill("play","i")} Ir a Jugar</button></div>`;
  return `<div class="ruta">
    <div class="path">${units}</div>
    <aside class="side">
      ${nextCard}
      <div class="card stack">
        <div class="goal sm"><div class="ringbig" style="--p:${goalP}"><div><div><b>${d.n}</b><div class="muted" style="font-size:.75rem">de ${P.goal}</div></div></div></div>
          <div class="stack" style="gap:4px"><div class="eyebrow">Meta diaria</div><h3>${d.n >= P.goal ? "¡Meta cumplida!" : `Faltan ${P.goal - d.n} preguntas`}</h3><span class="pill gold" style="justify-self:start">${icFill("flame","i")} ${st} ${st===1?"día":"días"} de racha</span></div></div>
      </div>
      ${p ? `<div class="card stack k-${p.k}"><div class="row between"><div class="eyebrow">Plan · ${p.d === todayKey() ? "hoy" : fmtDate(p.d)}</div><span class="tag k-${p.k}">${KIND[p.k]}</span></div><h3>${esc(p.title)}</h3><div class="mini">${taskList(p)}</div><button class="btn ghost" data-go="plan" style="justify-self:start">Ver el plan completo →</button></div>` : ""}
      <button class="btn" data-go="jugar">${ic("bolt")} Entrenamiento libre: contrarreloj, simulacros…</button>
    </aside>
  </div>`;
}
function focusCurrent(smooth){
  const el = $(".pnode.cur") || $(".pn.popped .pnode"); if (!el) return;
  el.scrollIntoView({ block:"center", behavior: smooth && !reduced() ? "smooth" : "auto" });
}

/* Jugar */
function vJugar(){
  const pr = priorities().slice(0,3), cur = currentNode();
  const recent = S.sessions.slice().sort((a,b)=>b.end-a.end).slice(0,4);
  return `<div class="row between"><div><h1>Entrenamiento libre</h1><p class="note">Modos para practicar por tu cuenta, fuera de la ruta. Si no sabes qué hacer, la ruta siempre te indica el siguiente paso.</p></div>
    ${cur ? `<button class="btn primary" data-go="ruta">${ic("route")} Seguir la ruta: ${esc(shortName(cur))}</button>` : ""}</div>
  <div class="stack"><h2>Modos de juego</h2>
    <div class="modes">${MODES.map(([k,n,s,i,c,meta]) => `<button class="mode" style="--c:${c}" data-mode="${k}" ${(k==="srs"&&!dueList(true).length)||(k==="duel"&&!confList().length)?"disabled":""}><div class="ic">${k==="surv"||k==="quick"?icFill(i):ic(i)}</div><h3>${n}</h3><span class="muted">${s}</span><span class="meta">${meta()}</span></button>`).join("")}</div>
  </div>
  <div class="g2">
    <div class="card"><div class="row between" style="margin-bottom:8px"><h3>Tus 3 brechas</h3><button class="btn ghost" data-go="mapa">Dominio por tema →</button></div>
      ${pr.map(x => `<div class="gapcard"><div class="tico" style="background:${dcol(x.t.d)}">D${x.t.d}</div><div><b>${esc(x.t.name)}</b><div class="row" style="gap:8px;margin-top:2px">${starsHTML(starsOf(x.m))}<span class="muted" style="font-size:.85rem">${x.m==null?"Sin jugar":"Dominio "+pct(x.m)}</span></div></div><button class="btn small" data-act="topics" data-topics="${x.t.id}" data-n="8">${icFill("play","i")} Jugar</button></div>`).join("")}
    </div>
    <div class="card"><h3 style="margin-bottom:8px">Últimas partidas</h3>
      ${recent.length ? recent.map(s => `<div class="gapcard"><div class="tico" style="background:${s.c/s.n>=0.72?'var(--good)':'var(--bad)'}">${Math.round(s.c/s.n*100)}</div><div><b>${esc(s.label)}</b><div class="muted" style="font-size:.85rem">${s.c}/${s.n} correctas${s.xp?` · +${s.xp} XP`:""}</div></div><span class="pill">${esc(MODEN[s.mode]||s.mode)}</span></div>`).join("") : `<div class="empty">Tu historial aparecerá aquí. ¡Empieza con una partida rápida!</div>`}
    </div>
  </div>`;
}

/* Mapa */
function vMapa(){
  if (topic && TMAP[topic]) return vTema(TMAP[topic]);
  return `<div class="row between"><div><h1>Dominio por tema</h1><p class="note">Cuánto dominas cada tema según tus respuestas y tus resultados de Tutorials Dojo. Estrellas: 1 desde 50% de dominio, 2 desde 70% y 3 desde 85%.</p></div><div class="row"><span class="pill acc">Preparación ${pct(readiness())}</span><button class="btn small" data-go="ruta">${ic("route")} Volver a la ruta</button></div></div>
  <div class="worlds">${[1,2,3,4].map(d => { const m = domainMastery(d), ts = TOPICS.filter(t=>t.d===d); const st = ts.reduce((s,t)=>s+starsOf(mastery(t.id).m),0);
    return `<section class="world" style="--c:${dcol(d)}"><header><div class="wnum">${d}</div><div><div class="eyebrow">Mundo ${d} · ${DOMAINS[d].w}% del examen</div><h2>${esc(DOMAINS[d].short)}</h2><div class="muted" style="font-size:.85rem">${esc(DOMAINS[d].name)}</div></div><div class="wpct"><b>${pct(m)}</b><div class="muted" style="font-size:.8rem">${st}/${ts.length*3} estrellas</div></div></header>
      <div class="bar"><i style="width:${m==null?0:Math.round(m*100)}%;background:var(--c)"></i><span class="tgt" title="Meta 80%"></span></div>
      <div class="nodes">${ts.map(t => { const {m:tm} = mastery(t.id); return `<button class="node ${tm==null?'new':''}" style="--c:${dcol(d)}" data-topic="${t.id}"><b>${esc(t.name)}</b><span class="row" style="gap:8px">${starsHTML(starsOf(tm))}<span class="muted" style="font-size:.8rem">${tm==null?"Sin jugar":pct(tm)}</span></span></button>`; }).join("")}</div>
    </section>`; }).join("")}</div>`;
}
function vTema(t){
  const {m, st} = mastery(t.id), fams = E.FAMILIES.filter(f => f.t === t.id), ks = new Set();
  return `<div class="row"><button class="btn small" data-go="ruta">← Ruta</button><button class="btn small" data-act="mapback">Dominio por tema</button><span class="pill"style="color:${dcol(t.d)}">Mundo ${t.d} · ${esc(DOMAINS[t.d].short)}</span></div>
  <div class="card stack" style="border-top:6px solid ${dcol(t.d)}"><div class="row between"><div><h1>${esc(t.name)}</h1><div class="row" style="margin-top:6px">${starsHTML(starsOf(m))}<span class="muted">${m==null?"Todavía sin jugar":"Dominio "+pct(m)}${st.total?` · ${st.seen}/${st.total} preguntas del banco vistas`:" · preguntas generadas por el motor"}</span></div></div>
    <div class="row"><button class="btn primary big" data-act="topics" data-topics="${t.id}" data-n="10">${icFill("play","i")} Jugar este tema</button><button class="btn" data-act="deck" data-t="${t.id}">${ic("cards")} Flashcards</button></div></div></div>
  <div class="g2" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);align-items:start">
    <div class="card stack ficha"><h3>Lo que tienes que saber</h3><ul>${t.keys.map(k=>`<li>${glx(k, ks)}</li>`).join("")}</ul>
      <div class="trap"><b>Trampas del examen</b><ul>${t.traps.map(k=>`<li>${glx(k, ks)}</li>`).join("")}</ul></div></div>
    <div class="stack">
      ${fams.map(f=>`<div class="rule stack" style="gap:6px"><b>${esc(f.name)}</b><div>${glx(f.rule, ks)}</div><div class="row"><button class="btn small" data-act="genfam" data-f="${f.id}">${ic("spark")} 8 preguntas</button><button class="btn small ghost" data-act="fam" data-f="${f.id}">Tabla →</button></div></div>`).join("")}
      <div class="card flat stack"><h3>Lab práctico</h3><p style="margin:0">${esc(t.lab)}</p></div>
      <div class="card flat stack"><h3>Documentación oficial</h3><ul style="margin:0;padding-left:1.1rem">${t.docs.map(([n,u])=>`<li><a href="${esc(u)}" data-ext="${esc(u)}">${esc(n)}</a></li>`).join("")}</ul></div>
    </div></div>`;
}

/* Plan */
function vPlan(){
  const k = todayKey(); planDay = planDay || (PLAN.find(p=>p.d===k) ? k : PLAN[0].d);
  const lead = (new Date(2026, 9, 1).getDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...PLAN];
  const sel = PLAN.find(p => p.d === planDay);
  const doneOf = p => p.tasks.filter((_,i)=>S.plan.done[p.d+"#"+i]).length;
  return `<div class="row between"><div><h1>Plan de 23 días</h1><p class="note">Un día de estudio y uno de práctica, alternados; la última semana es de simulacros y cierre de brechas. Toca un día para ver sus tareas.</p></div>
    <div class="row">${[["A","Estudio"],["B","Práctica"],["S","Simulacro"],["D","Diagnóstico"],["E","Examen"]].map(([c,l])=>`<span class="tag k-${c}">${l}</span>`).join("")}</div></div>
  <div class="card stack"><div class="cal">${["lun","mar","mié","jue","vie","sáb","dom"].map(d=>`<div class="dow">${d}</div>`).join("")}
    ${cells.map(p => p ? `<button class="day k-${p.k} ${p.d===k?'today':''} ${p.d<k?'past':''} ${p.d===planDay?'sel':''}" data-day="${p.d}"><span class="dn">${+p.d.slice(8)}</span><span class="tag k-${p.k}">${KIND[p.k]}</span><small>${esc(p.title)}</small><div class="prog"><i style="width:${doneOf(p)/p.tasks.length*100}%"></i></div></button>` : `<div class="day blank"></div>`).join("")}</div></div>
  ${sel ? `<div class="card stack k-${sel.k}" style="border-left:6px solid var(--c)"><div class="row between"><div><div class="eyebrow">${fmtDate(sel.d)}</div><h2>${esc(sel.title)}</h2></div><span class="tag k-${sel.k}">${KIND[sel.k]}</span></div><div>${taskList(sel)}</div>${sel.d>=k && sel.k!=="R" && sel.k!=="E" ? `<div class="row">${dayActions(sel)}<button class="btn primary" data-mode="quick">${icFill("play","i")} Partida rápida</button></div>` : ""}</div>` : ""}`;
}

/* Decisiones */
function famCell(f, s, c){
  if (!c.params) return c.ok(s.a) ? '<span class="y">✓</span>' : '';
  const sols = Object.values(f.sols);
  const okp = c.params.filter(p => c.ok(s.a, p.v)).sort((a, b) => sols.filter(x => !c.ok(x.a, b.v)).length - sols.filter(x => !c.ok(x.a, a.v)).length);
  return okp.length ? `<span class="val">${esc(okp[0].t)}</span>` : '';
}
function vDecisiones(){
  const F = fam && E.FAMILIES.find(f => f.id === fam);
  if (F){
    const sols = Object.values(F.sols), cons = [...Object.values(F.cons).filter(c => !c.fact), ...F.implicit.map(im => F.extra[im.c]).filter(Boolean)];
    const T = TMAP[F.t];
    const goalCols = F.goals.filter(g => sols.some(s => s.r[g] != null) && !(g === "cost" && F.costFn));
    const dots = (v, all) => { const vals = all.filter(x => x != null), mn = Math.min(...vals), mx = Math.max(...vals); const k = mx===mn ? 1 : 1 + Math.round((v-mn)/(mx-mn)*3); return "●".repeat(k) + "○".repeat(4-k); };
    return `<div class="row"><button class="btn small" data-act="famback">← Decisiones</button><span class="pill" style="color:${dcol(T.d)}">Mundo ${T.d} · ${esc(T.name)}</span></div>
    <div class="card stack"><div class="row between"><h1>${esc(F.name)}</h1><div class="row"><button class="btn primary" data-act="genfam" data-f="${F.id}">${icFill("play","i")} Practicar esta decisión</button><button class="btn" data-topic="${T.id}">Ficha del tema</button></div></div>
      <div class="rule"><b>Regla para el examen</b><div>${glx(F.rule, new Set())}</div></div>
      <div class="dtable"><table><thead><tr><th>Solución</th>${cons.map(c=>`<th title="${esc(c.t||c.lbl)}">${esc(c.lbl)}</th>`).join("")}${goalCols.map(g=>`<th>${g==="cost"?"Costo relativo":"Esfuerzo operativo"}</th>`).join("")}</tr></thead>
      <tbody>${sols.map(s=>`<tr><td>${esc(s.n)}</td>${cons.map(c=>`<td>${famCell(F, s, c)}</td>`).join("")}${goalCols.map(g=>`<td class="muted" title="Menos puntos = mejor">${s.r[g]!=null?dots(s.r[g], sols.map(x=>x.r[g])):''}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <p class="note">✓ = cumple el requisito. Pasa el cursor sobre una columna para leer el requisito completo. En costo y esfuerzo, menos puntos es mejor.${F.costFn?' En esta decisión el costo se calcula en cada pregunta según la frecuencia de acceso y la vida de los objetos.':''}</p>
    </div>`;
  }
  return `<div><h1>Tablas de decisión</h1><p class="note">Cada tabla resume una decisión típica del examen: qué soluciones compiten y qué requisito descarta a cada una. Es la misma base que usa el motor para generar y explicar preguntas.</p></div>
  ${[1,2,3,4].map(d=>`<div class="stack"><div class="row"><span class="dot" style="background:${dcol(d)}"></span><h3>Mundo ${d} · ${DOMAINS[d].name}</h3></div>
    <div class="famlist">${E.FAMILIES.filter(f=>TMAP[f.t].d===d).map(f=>`<button class="famcard" style="--c:${dcol(d)}" data-act="fam" data-f="${f.id}"><b>${esc(f.name)}</b><span class="muted" style="font-size:.84rem">${Object.keys(f.sols).length} soluciones · ${Object.values(f.cons).filter(c=>!c.fact).length} requisitos</span><span class="row" style="gap:6px">${P.fams[f.id]?`<span class="pill good">${P.fams[f.id]} practicadas</span>`:'<span class="pill">Sin practicar</span>'}<span class="pill acc" title="Rating ${famR(f.id)}">${LVNAME[levelForFam(f.id)]}</span></span></button>`).join("")}</div></div>`).join("")}`;
}

/* Repaso (flashcards) */
let deck = null;
function makeDeck(src, tid){
  if (src === "tema" && TMAP[tid]) return { src, tid, title: TMAP[tid].name, cards: shuffle(TMAP[tid].cards), i:0, flip:false, known:0 };
  if (src === "todo") return { src, title: "Todos los temas", cards: shuffle(TOPICS.flatMap(t=>t.cards)), i:0, flip:false, known:0 };
  if (src === "terminos"){
    const ids = [...Object.entries(P.glSeen || {}).sort((a,b) => b[1]-a[1]).map(x => x[0]), ...ESSENTIAL].filter((v,i,a) => a.indexOf(v) === i && G.BY_ID[v]).slice(0, 25);
    return { src, title: "Términos del glosario", cards: shuffle(ids.map(id => [G.BY_ID[id].t, G.BY_ID[id].d])), i:0, flip:false, known:0 };
  }
  const ids = priorities().slice(0,5).map(x=>x.t.id);
  return { src:"brechas", title: "Tus 5 brechas", cards: shuffle(ids.flatMap(i=>TMAP[i].cards)), i:0, flip:false, known:0 };
}
const ESSENTIAL = ["az","region","vpc","subnet","nat","igw","sg","nacl","iam","role","s3","ebs","efs","ec2","asg","elb","alb","rds","readreplica","multiaz","dynamodb","sqs","sns","lambda","rpo","rto","cloudfront","kms"];
const normTxt = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const repHead = () => `<div class="seg">${[["flash","Flashcards"],["glosario","Glosario"]].map(([k,l]) => `<button data-rtab="${k}" aria-pressed="${repTab===k}">${l}</button>`).join("")}</div>`;
function vGlosario(){
  const top = Object.entries(P.glSeen || {}).sort((a,b) => b[1]-a[1]).slice(0, 14).map(([id]) => G.BY_ID[id]).filter(Boolean);
  const list = G.GLOSSARY.filter(e => !glCat || e.c === glCat).slice().sort((a,b) => a.t.localeCompare(b.t, "es"));
  return `${repHead()}<div class="row between"><div><h1>Glosario</h1><p class="note">${G.GLOSSARY.length} términos del examen explicados en simple. En preguntas, fichas y flashcards, las palabras con línea punteada muestran su significado al pasar el mouse (clic para fijarlo); en una pregunta, la tecla <kbd>G</kbd> muestra todos sus términos.</p></div>
    <input type="search" id="glq" placeholder="Buscar: AZ, NAT, RPO, subred…" value="${esc(glQ)}" style="max-width:320px" aria-label="Buscar en el glosario"></div>
  ${top.length ? `<div class="card stack"><div class="row between"><h3>Los que más consultaste</h3><button class="btn small primary" data-act="glcards">${ic("cards")} Practicarlos como flashcards</button></div><div class="chips">${top.map(e => `<button class="chip" data-gljump="${e.id}">${esc(e.t)}</button>`).join("")}</div></div>` : ""}
  <div class="chips">${["", ...G.CATS].map(c => `<button class="chip" data-glcat="${esc(c)}" aria-pressed="${glCat===c}">${esc(c || "Todas")}</button>`).join("")}</div>
  <div class="glgrid" id="glgrid">${list.map(e => `<article class="card glcard" id="g-${e.id}" data-s="${esc(normTxt([e.t, e.f, ...e.a].join(" ")))}" data-a="${esc("|" + [e.t, ...e.a].map(a => normTxt(a.replace(/^=/, ""))).join("|") + "|")}" data-d="${esc(normTxt(e.d))}">${glEntryHTML(e, { page:true })}</article>`).join("")}</div>
  <div class="empty" id="glempty" hidden>No hay términos con esa búsqueda.</div>`;
}
// filtra sin volver a pintar, para no perder el foco del buscador: primero por nombre, si no hay, por definición
function filterGloss(){
  const q = normTxt(glQ).trim(), cards = $$("#glgrid .glcard");
  // 3: el nombre o un alias es exactamente lo buscado · 2: alguna palabra empieza así · 1: aparece dentro · 0.5: en la definición
  const score = c => !q ? 1 : c.dataset.a.includes("|" + q + "|") ? 3 : (" " + c.dataset.s).includes(" " + q) ? 2 : c.dataset.s.includes(q) ? 1 : c.dataset.d.includes(q) ? 0.5 : 0;
  const sc = cards.map(score), best = Math.max(0, ...sc), min = best >= 2 ? 2 : best;
  cards.forEach((c, i) => c.hidden = !sc[i] || sc[i] < min);
  const em = $("#glempty"); if (em) em.hidden = cards.some(c => !c.hidden);
}
function vRepaso(){
  if (repTab === "glosario") return vGlosario();
  deck = deck || makeDeck("brechas");
  const c = deck.cards[deck.i], done = deck.i >= deck.cards.length;
  const rules = S.errlog.slice().sort((a,b)=>(b.created||0)-(a.created||0));
  return `${repHead()}<div class="row between"><div><h1>Repaso</h1><p class="note">Voltea cada tarjeta, di la respuesta en voz alta y marca si la sabías. <kbd>Espacio</kbd> voltea · <kbd>1</kbd> no la sabía · <kbd>2</kbd> la sabía.</p></div>
    <div class="row"><div class="seg">${[["brechas","Mis brechas"],["todo","Todo"],["terminos","Términos"]].map(([k,l])=>`<button data-deck="${k}" aria-pressed="${deck.src===k}">${l}</button>`).join("")}</div>
    <select id="decktopic" style="width:auto"><option value="">Un tema…</option>${TOPICS.map(t=>`<option value="${t.id}" ${deck.tid===t.id?"selected":""}>${esc(t.name)}</option>`).join("")}</select></div></div>
  <div class="card stack" style="justify-items:center">
    <div class="row between" style="width:100%;max-width:760px"><b>${esc(deck.title)}</b><span class="muted num">${Math.min(deck.i+1, deck.cards.length)} / ${deck.cards.length} · sabías ${deck.known}</span></div>
    <div class="bar" style="width:100%;max-width:760px"><i style="width:${deck.i/deck.cards.length*100}%;background:var(--good)"></i></div>
    ${done ? `<div class="result"><div class="score num">${deck.known}/${deck.cards.length}</div><div class="muted">tarjetas que ya sabías</div><button class="btn primary" data-act="deckagain">Otra ronda</button></div>` :
    `<div class="flash ${deck.flip?'flipped':''}" data-act="flip" tabindex="0" role="button" aria-label="Voltear tarjeta"><div class="inner"><div class="face">${deck.src === "terminos" ? esc(c[0]) : glx(c[0], new Set())}</div><div class="face back">${glx(c[1], new Set())}</div></div></div>
    <div class="row">${deck.flip ? `<button class="btn bad" data-act="cardno">No la sabía <kbd>1</kbd></button><button class="btn good" data-act="cardyes">La sabía <kbd>2</kbd></button>` : `<button class="btn primary big" data-act="flip">Voltear <kbd>Espacio</kbd></button>`}</div>`}
  </div>
  <div class="card stack"><div class="row between"><h3>Tus reglas de la bitácora</h3><button class="btn small" data-go="progreso" data-ptab="bitacora">Agregar reglas</button></div>
    ${rules.length ? `<div class="g2">${rules.map(e=>`<div class="rule"><div class="row" style="gap:6px;margin-bottom:4px"><span class="dot" style="background:${dcol(TMAP[e.t]?.d||1)}"></span><b style="font-size:.85rem">${esc(TMAP[e.t]?.name||e.t)}</b></div>${esc(e.rule)}</div>`).join("")}</div>` : `<div class="empty">Cuando falles una pregunta, conviértela en una regla corta desde la pantalla de resultados. Aquí las repasarás antes del examen.</div>`}
  </div>`;
}

/* Progreso */
const SOURCES = ["TD · Practice Exam (Review Mode)","TD · Practice Exam (Timed Mode)","TD · Section-based test","TD · Topic-based test","TD · Final Test","Skill Builder · Official Practice Question Set","Skill Builder · Official Practice Exam","Otro"];
let regWeak = new Set();
function trendChart(){
  const W=560, H=210, L=34, R=26, T=12, B=26;
  const x0 = new Date(2026,9,1).getTime(), x1 = EXAM.getTime();
  const X = t => L + (Math.min(Math.max(t,x0),x1)-x0)/(x1-x0)*(W-L-R), Y = v => T + (1-v)*(H-T-B);
  const sp = S.sessions.filter(s => s.n >= 5).sort((a,b)=>a.end-b.end).map(s => [X(s.end), Y(s.c/s.n), s]);
  const tp = S.external.filter(e=>e.score!==""&&e.score!=null).map(e => { const [y,m,d]=(e.date||todayKey()).split("-").map(Number); return [X(new Date(y,m-1,d,20).getTime()), Y(+e.score/100), e]; }).sort((a,b)=>a[0]-b[0]);
  const path = pts => pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  let grid = ""; for (const v of [0,.25,.5,.75,1]) grid += `<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${L-6}" y="${Y(v)+4}" text-anchor="end">${v*100}</text>`;
  let ticks = ""; for (const dd of [1,8,15,23]){ ticks += `<text x="${X(new Date(2026,9,dd).getTime())}" y="${H-6}" text-anchor="middle">${dd} oct</text>`; }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Aciertos por partida y puntajes de Tutorials Dojo">${grid}${ticks}
    <line x1="${L}" x2="${W-R}" y1="${Y(.8)}" y2="${Y(.8)}" stroke="var(--good)" stroke-dasharray="5 4" stroke-width="2"/>
    ${sp.length>1?`<path d="${path(sp)}" fill="none" stroke="var(--primary)" stroke-width="2.5"/>`:""}
    ${sp.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="var(--primary)"><title>${esc(p[2].label)}: ${Math.round(p[2].c/p[2].n*100)}% (${p[2].n} preguntas)</title></circle>`).join("")}
    ${tp.length>1?`<path d="${path(tp)}" fill="none" stroke="var(--gold)" stroke-width="2.5"/>`:""}
    ${tp.map(p=>`<rect x="${p[0]-4.5}" y="${p[1]-4.5}" width="9" height="9" rx="2" fill="var(--gold)"><title>${esc(p[2].name)}: ${p[2].score}%</title></rect>`).join("")}</svg>
  <div class="legend"><span><i style="background:var(--primary)"></i>Tus partidas (5+ preguntas)</span><span><i style="background:var(--gold)"></i>Tutorials Dojo</span><span><i style="background:var(--good)"></i>Meta 80%</span></div>`;
}
function vProgreso(){
  const tabs = [["resumen","Resumen"],["simulacros","Simulacros"],["logros","Logros"],["td","Resultados TD"],["bitacora","Bitácora"]];
  const head = `<div class="row between"><h1>Progreso</h1><div class="seg">${tabs.map(([k,l])=>`<button data-ptab="${k}" aria-pressed="${progTab===k}">${l}</button>`).join("")}</div></div>`;
  const t = totals(), L = levelOf(P.xp);
  if (progTab === "simulacros") return head + vSims();
  if (progTab === "logros") return head + `<div class="card stack"><div class="row between"><h3>Logros</h3><span class="pill gold">${Object.keys(P.badges).length} / ${BADGES.length}</span></div><div class="badges">${BADGES.map(([id,n,dsc,i])=>`<div class="bdg ${P.badges[id]?'':'locked'}"><div class="medal">${ic(i)}</div><b>${esc(n)}</b><small>${esc(dsc)}</small></div>`).join("")}</div></div>`;
  if (progTab === "td"){
    const ext = extSorted();
    return head + `<div class="card stack"><h3>Registrar un resultado externo</h3><p class="note">Después de cada examen de Tutorials Dojo o Skill Builder, anota el puntaje general y por dominio y marca los temas donde fallaste. El mapa usa estos datos.</p>
      <form id="extform" class="stack"><div class="fgrid"><label class="f">Fuente<select id="ex-src">${SOURCES.map(s=>`<option>${esc(s)}</option>`).join("")}</select></label><label class="f">Nombre<input type="text" id="ex-name" placeholder="Practice Exam 1"></label><label class="f">Fecha<input type="date" id="ex-date" value="${todayKey()}"></label><label class="f">Puntaje general %<input type="number" id="ex-score" min="0" max="100" placeholder="72"></label></div>
      <div class="fgrid">${[1,2,3,4].map(d=>`<label class="f">D${d} · ${DOMAINS[d].short} %<input type="number" id="ex-d${d}" min="0" max="100"></label>`).join("")}</div>
      <div class="stack" style="gap:6px"><span class="eyebrow">Temas donde fallaste</span><div class="chips">${TOPICS.map(t=>`<button type="button" class="chip" aria-pressed="${regWeak.has(t.id)}" data-weak="${t.id}">${esc(t.name)}</button>`).join("")}</div></div>
      <label class="f">Notas<textarea id="ex-notes" placeholder="Me confundí entre Global Accelerator y CloudFront…"></textarea></label><div class="row"><button class="btn primary" type="submit">Guardar resultado</button></div></form></div>
    <div class="card stack"><h3>Historial</h3>${ext.length?`<div class="tbl"><table><thead><tr><th>Fecha</th><th>Examen</th><th>General</th><th>D1</th><th>D2</th><th>D3</th><th>D4</th><th>Temas fallados</th><th></th></tr></thead><tbody>
      ${ext.map(e=>`<tr><td class="num">${esc(e.date)}</td><td>${esc(e.name||e.src)}<div class="muted" style="font-size:.78rem">${esc(e.src)}</div></td><td class="num">${e.score!==""&&e.score!=null?esc(e.score)+'%':'–'}</td>${[1,2,3,4].map(d=>`<td class="num">${e.domains&&e.domains[d]!=null&&e.domains[d]!==""?esc(e.domains[d])+'%':'–'}</td>`).join("")}<td>${(e.weak||[]).map(w=>esc(TMAP[w]?.name||w)).join(", ")}</td><td><button class="btn ghost small" data-delext="${e.id}">Borrar</button></td></tr>`).join("")}</tbody></table></div>`:'<div class="empty">Aún no registraste exámenes externos. Empieza con el Practice Exam 1 de Tutorials Dojo en Review Mode.</div>'}</div>`;
  }
  if (progTab === "bitacora"){
    const log = S.errlog.slice().sort((a,b)=>(b.created||0)-(a.created||0));
    return head + `<div class="g2" style="align-items:start"><div class="card stack"><h3>Nueva regla</h3><p class="note">Convierte cada error en una regla corta. Aparecerá en el razonamiento de las preguntas de ese tema y en Repaso.</p>
      <form id="logform" class="stack"><div class="fgrid"><label class="f">Tema<select id="lg-t">${TOPICS.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join("")}</select></label><label class="f">Fuente<input type="text" id="lg-src" placeholder="TD PE1 #34"></label></div>
      <label class="f">Regla aprendida<textarea id="lg-rule" placeholder="IP estáticas + UDP global → Global Accelerator, no CloudFront."></textarea></label><div class="row"><button class="btn primary" type="submit">Agregar a la bitácora</button></div></form></div>
      <div class="card stack"><h3>Tus reglas (${log.length})</h3>${log.length?log.map(e=>`<div class="review" style="padding-top:10px"><div class="row between"><span class="row" style="gap:6px"><span class="dot" style="background:${dcol(TMAP[e.t]?.d||1)}"></span><b style="font-size:.88rem">${esc(TMAP[e.t]?.name||e.t)}</b>${e.src?`<span class="pill">${esc(e.src)}</span>`:''}</span><button class="btn ghost small" data-dellog="${e.id}">Borrar</button></div><div>${esc(e.rule)}</div></div>`).join(""):'<div class="empty">Tu bitácora está vacía.</div>'}</div></div>`;
  }
  return head + `<div class="kpis">${[[L,"Nivel · "+titleOf(L)],[P.xp.toLocaleString("es-PE"),"XP total"],[streak(),"Días de racha"],[t.n,"Preguntas respondidas"],[t.n?pct(t.c/t.n):"–","Precisión"],[P.best.combo,"Mejor combo"],[P.best.time,"Récord contrarreloj"],[P.best.surv,"Récord supervivencia"]].map(([v,l])=>`<div class="kpi"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>
  <div class="g2"><div class="card stack"><div class="row between"><h3>Preparación por dominio</h3><div class="row"><span class="pill acc">${pct(readiness())}</span><button class="btn small" data-go="mapa">Por tema →</button></div></div>
      ${[1,2,3,4].map(d => { const v = domainMastery(d); return `<div class="dbar"><span><span class="dot" style="background:${dcol(d)}"></span> ${DOMAINS[d].short} <span class="muted">${DOMAINS[d].w}%</span></span><div class="bar"><i style="width:${v==null?0:Math.round(v*100)}%;background:${dcol(d)}"></i><span class="tgt"></span></div><b class="num">${pct(v)}</b></div>`; }).join("")}
      <p class="note">Indicador propio: combina tus aciertos recientes por tema con tus resultados de Tutorials Dojo y pondera cada dominio por su peso. No es el puntaje oficial (100-1000, aprueba con 720). Banco cubierto: ${pct(coverage())}.</p></div>
    <div class="card stack"><h3>Evolución</h3>${S.sessions.length||S.external.length?trendChart():'<div class="empty">Juega algunas partidas para ver tu curva.</div>'}</div></div>
  ${confCard()}`;
}
function confCard(){
  const list = confList().slice(0, 8);
  return `<div class="card stack"><div class="row between"><h3>Tus confusiones</h3>${list.length?`<button class="btn small primary" data-mode="duel">${ic("shuffle")} Jugar duelos</button>`:""}</div>
    ${list.length ? `<p class="note">Cada vez que eliges un servicio cuando la respuesta era otro, el motor lo anota y arma duelos con el requisito que los separa. Una confusión desaparece cuando ganas sus duelos.</p>
      <div class="g2">${list.map(x => `<div class="gapcard" style="grid-template-columns:1fr auto"><div><b>${esc(solName(x.f,x.t))}</b> <span class="muted">vs</span> <b>${esc(solName(x.f,x.b))}</b><div class="muted" style="font-size:.82rem">${esc(E.FMAP[x.f].name)} · ${x.n} ${x.n===1?"error":"errores"}${x.w?` · ${x.w} duelos ganados`:""}</div></div><button class="btn small" data-act="duelone" data-k="${esc(x.k)}">Duelo</button></div>`).join("")}</div>`
    : `<div class="empty">Todavía no hay confusiones registradas. Aparecerán cuando falles preguntas.</div>`}</div>`;
}
function vSims(){
  const list = sims();
  if (!list.length) return `<div class="card stack" style="justify-items:center;text-align:center"><h3>Aún no hiciste un simulacro semanal</h3><p class="note">Haz uno por semana en condiciones reales: 65 preguntas, 130 minutos, sin pausas. Fechas sugeridas: 4, 11 y 17 de octubre, y el simulacro final del 20.</p><button class="btn primary big" data-mode="exam">${ic("crown")} Empezar simulacro</button></div>`;
  const W = 640, H = 230, L = 40, R = 16, T = 14, B = 34, bw = Math.min(56, (W-L-R)/list.length - 14);
  const Y = v => T + (1 - (v-100)/900) * (H-T-B), X = i => L + (i+0.5) * (W-L-R)/list.length;
  const ext = w => { const e = S.external.filter(x => x.score!=="" && x.score!=null && simWeek(new Date(x.date+"T12:00").getTime()) === w); return e.length ? Math.round(e.reduce((a,x)=>a+ +x.score,0)/e.length) : null; };
  const fmtT = sec => Math.floor(sec/60) + ":" + String(sec%60).padStart(2,"0");
  return `<div class="card stack"><div class="row between"><h3>Puntaje estimado por simulacro</h3><button class="btn small primary" data-mode="exam">${ic("crown")} Nuevo simulacro</button></div>
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Puntaje de cada simulacro frente al corte de 720">
      ${[100,400,720,1000].map(v=>`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v===720?'var(--good)':'var(--line)'}" ${v===720?'stroke-dasharray="5 4" stroke-width="2"':''}/><text x="${L-6}" y="${Y(v)+4}" text-anchor="end">${v}</text>`).join("")}
      ${list.map((x,i)=>`<rect x="${X(i)-bw/2}" y="${Y(x.sim.scaled)}" width="${bw}" height="${Y(100)-Y(x.sim.scaled)}" rx="6" fill="${x.sim.pass?'var(--good)':'var(--bad)'}"><title>${x.sim.scaled}</title></rect><text x="${X(i)}" y="${Y(x.sim.scaled)-6}" text-anchor="middle" style="fill:var(--ink);font-weight:800">${x.sim.scaled}</text><text x="${X(i)}" y="${H-12}" text-anchor="middle">S${x.sim.week} · ${new Date(x.end).getDate()} oct</text>`).join("")}
    </svg><p class="note">Barras verdes: 720 o más (zona de aprobación estimada). AWS no publica la conversión exacta; se asume 72% de las puntuables ≈ 720.</p></div>
  <div class="card stack"><h3>Comparación semanal</h3><div class="tbl"><table><thead><tr><th>Semana</th><th>Fecha</th><th>Puntaje</th><th>Cambio</th>${[1,2,3,4].map(d=>`<th>D${d}</th>`).join("")}<th>Tiempo/preg.</th><th>TD esa semana</th></tr></thead><tbody>
    ${list.map((x,i)=>{ const p = i ? list[i-1].sim : null; const ch = p ? x.sim.scaled - p.scaled : null; return `<tr><td class="num">${x.sim.week}</td><td>${new Date(x.end).toLocaleDateString("es-PE",{day:"numeric",month:"short"})}</td><td class="num"><b style="color:${x.sim.pass?'var(--good)':'var(--bad)'}">${x.sim.scaled}</b></td><td>${ch==null?"–":`<span class="pill ${ch>=0?'good':'bad'}">${ch>=0?'▲':'▼'} ${Math.abs(ch)}</span>`}</td>${[1,2,3,4].map(d=>{const v=x.sim.byD[d];return `<td class="num">${v?pct(v[0]/v[1]):"–"}</td>`;}).join("")}<td class="num">${fmtT(x.sim.avgSec)}</td><td class="num">${ext(x.sim.week)!=null?ext(x.sim.week)+"%":"–"}</td></tr>`; }).join("")}
  </tbody></table></div></div>`;
}

/* Recursos */
function vRecursos(){
  const link = (u, t) => `<a href="${esc(u)}" data-ext="${esc(u)}">${esc(t)}</a>`;
  const light = document.documentElement.dataset.theme === "light";
  return `<h1>Recursos y ajustes</h1>
  <div class="g2"><div class="card stack"><h3>Datos del examen</h3><ul style="margin:0;padding-left:1.1rem;display:grid;gap:6px">
    <li><b>65 preguntas</b> (50 puntúan y 15 no, sin identificarse), de opción múltiple o respuesta múltiple.</li>
    <li><b>130 minutos</b>. Escala de 100 a 1000; apruebas con <b>720</b>. No hay mínimo por dominio.</li>
    <li>Las preguntas sin responder cuentan como incorrectas y no hay penalización por adivinar: <b>responde todas</b>.</li>
    <li>Pesos: Seguridad 30% · Resiliencia 26% · Alto rendimiento 24% · Costos 20%.</li>
    <li>Disponible en <b>español (Latinoamérica)</b>. Si lo das en inglés y no es tu lengua materna, pide la acomodación ESL +30 minutos.</li>
    <li>Tu voucher vence el <b>23 de octubre de 2026</b>.</li></ul></div>
  <div class="card stack"><h3>Fuentes confiables</h3><ul style="margin:0;padding-left:1.1rem;display:grid;gap:6px">
    <li>${link("https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html","Guía oficial del examen SAA-C03")}: dominios, task statements y servicios incluidos.</li>
    <li>${link("https://skillbuilder.aws/category/exam-prep/solutions-architect-associate-SAA-C03","AWS Skill Builder · Exam Prep")}: Domain Review y Practice Question Set gratis en español.</li>
    <li>${link("https://portal.tutorialsdojo.com/courses/aws-certified-solutions-architect-associate-practice-exams/","Tutorials Dojo · Practice Exams")}: Review Mode para aprender, Timed Mode para simular.</li>
    <li>${link("https://tutorialsdojo.com/aws-cheat-sheets/","Tutorials Dojo · Cheat Sheets")}: comparaciones rápidas entre servicios.</li>
    <li>${link("https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html","AWS Well-Architected Framework")}: la lógica detrás de casi todas las preguntas.</li>
    <li>Evita los "dumps" con preguntas filtradas: violan el acuerdo de certificación de AWS y pueden costarte la certificación.</li></ul></div></div>
  <div class="g2"><div class="card stack"><h3>Cómo leer una pregunta</h3><ol style="margin:0;padding-left:1.2rem;display:grid;gap:6px">
    <li>Busca el requisito decisivo: <b>menor costo</b>, <b>menor esfuerzo operativo</b>, <b>mayor disponibilidad</b>, <b>menor latencia</b> o <b>más seguro</b>.</li>
    <li>Descarta lo que no cumple un requisito técnico (Lambda para procesos de 40 minutos, por ejemplo).</li>
    <li>Entre dos opciones válidas, gana la más administrada si piden poco esfuerzo operativo.</li>
    <li>"Elige 2": cada opción correcta suele resolver una parte distinta del problema.</li>
    <li>Marca para revisar y avanza: no más de 2 minutos por pregunta.</li></ol></div>
  <div class="card stack"><h3>Ajustes</h3>
    <label class="switch"><input type="checkbox" id="set-sound" ${P.sound?"checked":""}> Efectos de sonido</label>
    <div class="row"><span>Meta diaria</span><div class="seg">${[20,30,50,80].map(n=>`<button data-goal="${n}" aria-pressed="${P.goal===n}">${n}</button>`).join("")}</div></div>
    <div class="row"><span>Tema</span><div class="seg"><button data-theme="dark" aria-pressed="${!light}">Nocturno</button><button data-theme="light" aria-pressed="${light}">Día</button></div></div>
    <label class="switch"><input type="checkbox" id="set-gloss" ${P.gloss!==false?"checked":""}> Glosario al pasar el mouse sobre los términos</label>
    <label class="switch"><input type="checkbox" id="set-glosssim" ${P.glossSim!==false?"checked":""}> Glosario también en los simulacros <span class="muted" style="font-weight:600">(desactívalo para practicar como en el examen real)</span></label>
    <div class="row"><button class="btn" data-act="onbagain">${ic("help")} Ver la introducción otra vez</button></div>
    <h3 style="margin-top:8px">Tus datos</h3><p class="note">${D?"Tu progreso se guarda en un archivo de este equipo. Exporta una copia de vez en cuando o para llevarla a otra PC.":"Versión de navegador: el progreso se guarda solo en este navegador."}</p>
    <div class="row"><span class="pill">${S.sessions.length} partidas</span><span class="pill">${Object.keys(S.qstate).length} preguntas vistas</span><span class="pill">${S.genq.length} generadas guardadas</span></div>
    ${D?`<div class="row"><button class="btn" data-act="export">Exportar progreso…</button><button class="btn" data-act="import">Importar progreso…</button></div><div class="faint" style="font-size:.75rem" id="datapath"></div>`:""}</div></div>`;
}

/* Arena de juego */
function hudHTML(){
  const n = Q.items.length;
  let prog;
  if (Q.endless) prog = `<div class="row" style="flex:1;gap:10px"><span class="pill good">${icFill("check","i")} ${Q.items.filter(i=>i.ok).length} aciertos</span><span class="pill">${Q.items.filter(i=>i.done).length} respondidas</span></div>`;
  else if (n <= 40) prog = `<div class="segs">${Q.items.map((x,i)=>`<i class="${Q.exam ? (x.picked.length?'ans':'') : (x.done ? (x.ok?'ok':'no') : '')} ${i===Q.i?'cur':''}"></i>`).join("")}</div>`;
  else { const a = Q.items.filter(x => Q.exam ? x.picked.length : x.done).length; prog = `<div class="segs fill"><i style="width:${a/n*100}%"></i></div>`; }
  return `<div class="hud"><button class="iconbtn" data-act="quit" title="Salir">${ic("x")}</button>
    ${prog}
    ${!Q.exam ? `<div class="combo ${Q.combo>=3?'hot':''}" title="Combo">${icFill("flame","i")} ${Q.combo>1?"x"+Q.combo:"–"}</div>` : ""}
    ${Q.maxLives ? `<div class="hearts" title="Vidas">${Array.from({length:Q.maxLives},(_,i)=>icFill("heart", i<Q.lives?"":"off")).join("")}</div>` : ""}
    ${Q.deadline ? `<span class="timer" id="qtimer">–</span>` : ""}
    ${Q.exam ? `<button class="btn small" data-act="navpanel">${ic("list")} Panel</button>` : `<span class="xpgain num">+${Q.xp} XP</span>`}
    ${!Q.endless ? `<span class="muted num">${Q.i+1}/${n}</span>` : ""}</div>`;
}
function vArena(){
  const it = Q.items[Q.i], q = it.q, T = TMAP[q.t], multi = q.a.length > 1;
  const showFb = it.done && !Q.exam, timeMode = Q.mode === "time", seen = new Set(), qhtml = glx(q.q, seen);
  const opts = it.order.map((oi, k) => {
    const sel = it.picked.includes(oi); let cls = sel ? "sel" : "";
    if (showFb) cls = q.a.includes(oi) ? "right" : (sel ? "wrong" : "dim");
    return `<label class="opt ${cls}"><input type="${multi?'checkbox':'radio'}" name="opt" value="${oi}" ${sel?'checked':''} ${showFb?'disabled':''}><span class="k">${"ABCDE"[k]}</span><span>${glx(q.o[oi], seen)}</span></label>`;
  }).join("");
  const termsBtn = glossOn() && G.termsIn(q.q, ...q.o).length ? `<button class="btn small" data-act="terms" title="Qué significa cada término">${ic("book")} Términos <kbd>G</kbd></button>` : "";
  const actions = Q.exam
    ? `<div class="row">${Q.i>0?`<button class="btn" data-act="prev">← Anterior</button>`:''}<button class="btn" data-act="flag">${ic("flag")} ${it.flag?'Quitar marca':'Marcar'} <kbd>F</kbd></button>${termsBtn}</div><div class="row">${Q.i<Q.items.length-1?`<button class="btn primary" data-act="next">Siguiente →</button>`:`<button class="btn primary" data-act="review">Ir a la revisión →</button>`}</div>`
    : (!it.done ? `<span class="row">${termsBtn}<span class="muted">${multi?"Elige las respuestas y comprueba.":timeMode?"Toca una opción: se responde al instante.":"Elige una opción y comprueba con Enter."}</span></span>${timeMode&&!multi?"":`<button class="btn primary big" data-act="confirm" ${it.picked.length?'':'disabled'}>Comprobar</button>`}` : "");
  const sheet = showFb && !timeMode ? `<div class="sheet ${it.ok?'ok':'no'}"><div class="in"><div class="badgeic">${ic(it.ok?"check":"x")}</div>
      <div class="stack" style="gap:4px"><h3>${it.ok ? (Q.combo>=3?`¡Combo x${Q.combo}! +${it.xp} XP`:`¡Correcto! +${it.xp} XP`) : (Q.mode==="surv" && Q.lives<=0 ? "Sin vidas: fin de la partida" : "Incorrecto")}</h3>${it.ok ? `<div class="exp">${glx(q.e, new Set())}</div>` : `<div class="exp big">${compareHTML(it)}</div>`}
        <div class="row"><button class="btn small" data-act="why">${ic("eye")} Razonamiento <kbd>R</kbd></button><button class="btn small" data-act="variant">${ic("shuffle")} Variante <kbd>V</kbd></button>${!it.ok?`<button class="btn small" data-act="tolog">Anotar regla</button>`:''}</div></div>
      <button class="btn big ${it.ok?'good':'bad'}" data-act="next">${Q.mode==="surv"&&Q.lives<=0?"Ver resultado":"Continuar"} <kbd>Enter</kbd></button></div></div>` : "";
  return `${hudHTML()}<div class="arena ${it.done&&timeMode?(it.ok?'flash-ok':'flash-no'):''} ${showFb&&!timeMode&&!it.ok?'tall':''}">
    <div class="qmeta"><span class="pill" style="color:${dcol(T.d)}"><span class="dot" style="background:${dcol(T.d)}"></span>${esc(T.name)}</span>${q.src==='gen'?`<span class="pill acc">${ic("spark")} Generada · ${esc(q.gen.levelName||"")}</span>`:''}${q.gen&&q.gen.include&&!Q.exam?`<span class="pill" style="color:var(--d3)" title="Pregunta armada a partir de una confusión tuya">${ic("shuffle")} Duelo</span>`:''}${multi?'<span class="pill gold">Elige 2</span>':''}</div>
    <div class="qtext">${qhtml}</div>
    <div class="opts" id="opts">${opts}</div>
    <div class="qactions">${actions}</div>
  </div>${sheet}`;
}
// lección 1 de cada tema: antes de preguntar, enseña lo esencial
function vIntro(){
  const t = TMAP[Q.intro], fams = E.FAMILIES.filter(f => f.t === t.id), need = Math.ceil(Q.items.length * 0.6), ks = new Set();
  return `<div class="hud"><button class="iconbtn" data-act="quit" title="Salir">${ic("x")}</button><b style="flex:1">${esc(Q.label)}</b><span class="muted">Paso 1: lee · Paso 2: responde</span></div>
  <div class="arena"><div class="card stack ficha intro" style="--c:${dcol(t.d)}">
    <div class="eyebrow">Lección 1 de 2 · Aprender · Mundo ${t.d} · ${esc(DOMAINS[t.d].short)}</div>
    <h1>${esc(t.name)}</h1>
    <p class="note">Lee estas ideas clave con calma (2-3 minutos). Después vienen ${Q.items.length} preguntas básicas sobre ellas: con ${need} correctas completas la lección.</p>
    <h3>Lo que tienes que saber</h3><ul>${t.keys.map(k=>`<li>${glx(k, ks)}</li>`).join("")}</ul>
    ${fams.map(f => `<div class="rule"><b>Regla para el examen · ${esc(f.name)}</b><div>${glx(f.rule, ks)}</div></div>`).join("")}
    <div class="trap"><b>Trampas típicas</b><ul>${t.traps.slice(0,3).map(k=>`<li>${glx(k, ks)}</li>`).join("")}</ul></div>
    <div class="row between"><button class="btn ghost" data-topicx="${t.id}">Ver la ficha completa</button><button class="btn primary big" data-act="introgo">Empezar las preguntas <kbd>Enter</kbd></button></div>
  </div></div>`;
}
const backBtn = () => Q.pathOut ? "" : `<button class="btn primary big" data-act="quit">${Q.from === "ruta" ? "Volver a la ruta" : "Volver"}</button>`;
// al terminar un paso de la ruta: qué pasó y qué sigue
function pathBanner(){
  const o = Q.pathOut; if (!o) return "";
  const n = PMAP[o.id], nx = currentNode();
  const nextTxt = nx ? `Siguiente: <b>${esc(nx.title)}</b> <span class="muted">(${esc(nodeSub(nx))})</span>` : "¡Completaste toda la ruta!";
  if (o.passed) return `<div class="pathres ok"><div class="pic">${o.unlocked ? ic("crown") : ic("check")}</div>
    <div class="stack" style="gap:4px"><div class="eyebrow">${o.unlocked ? `¡Mundo ${o.unlocked} desbloqueado!` : o.first ? "Paso completado" : "Repaso hecho"}${o.bonus ? ` · +${o.bonus} XP de bonus` : ""}</div>
      <h2>${esc(n.title)}${n.kind === "topic" ? ` · ${o.round === 1 ? "Aprender" : "Dominar"}` : ""}</h2><div>${nextTxt}</div></div>
    <button class="btn primary big" data-act="pathnext">Continuar ${ic("route")}</button></div>`;
  const why = !o.complete ? "Saliste antes de terminar, así que este paso todavía no cuenta." : `Necesitas ${pct(o.need)} y sacaste ${pct(o.ratio)}. Revisa los errores de abajo y vuelve a intentarlo: las preguntas cambian en cada intento.`;
  return `<div class="pathres no"><div class="pic">${ic("redo")}</div>
    <div class="stack" style="gap:4px"><div class="eyebrow">Casi lo logras</div><h2>${esc(n.title)}</h2><div>${why}</div></div>
    <div class="stack" style="gap:8px"><button class="btn primary big" data-act="pathretry">${ic("redo")} Reintentar</button><button class="btn" data-act="pathnext">Volver a la ruta</button></div></div>`;
}
function vReview(){
  const its = Q.items.map((x, i) => ({ x, i })), ans = its.filter(o => o.x.picked.length).length, fl = its.filter(o => o.x.flag).length;
  const shown = its.filter(o => Q.filter === "sin" ? !o.x.picked.length : Q.filter === "marcadas" ? o.x.flag : true);
  return `${hudHTML()}<div class="arena"><div class="card stack">
    <div class="row between"><div><div class="eyebrow">Antes de entregar</div><h2>Revisión del examen</h2></div><div class="row"><span class="pill acc">${ans}/${Q.items.length} respondidas</span><span class="pill bad">${Q.items.length-ans} sin responder</span><span class="pill gold">${fl} marcadas</span></div></div>
    <p class="note">Igual que en el examen real: revisa las preguntas marcadas y las que quedaron sin responder. Las preguntas sin responder cuentan como incorrectas.</p>
    <div class="seg">${[["todas","Todas"],["sin","Sin responder"],["marcadas","Marcadas"]].map(([k,l])=>`<button data-rfilter="${k}" aria-pressed="${Q.filter===k}">${l}</button>`).join("")}</div>
    <div class="navgrid" style="grid-template-columns:repeat(auto-fill,minmax(3.2rem,1fr))">${shown.map(o=>`<button data-jump="${o.i}" class="${o.x.picked.length?'ans':''} ${o.x.flag?'flag':''}" title="${o.x.picked.length?'Respondida':'Sin responder'}${o.x.flag?' · marcada':''}">${o.i+1}</button>`).join("") || '<span class="muted">No hay preguntas en este filtro.</span>'}</div>
    <div class="row between"><button class="btn" data-jump="${Q.items.length-1}">← Volver a la última pregunta</button><button class="btn primary big" data-act="finish">Entregar examen</button></div>
  </div></div>`;
}
function vSimResult(){
  const r = Q.result, s = r.sim, prev = sims().filter(x => x.id !== r.id).pop(), ps = prev && prev.sim;
  const fmtT = sec => Math.floor(sec/60) + ":" + String(sec%60).padStart(2,"0");
  const delta = (a, b) => b == null ? "" : `<span class="pill ${a>=b?'good':'bad'}">${a>=b?'▲':'▼'} ${Math.abs(a-b)}</span>`;
  const recs = Object.entries(s.wrongT).map(([t, n]) => ({ t, v: n * DOMAINS[TMAP[t].d].w })).sort((a,b) => b.v - a.v).slice(0,3);
  const wrong = Q.items.filter(i => i.done && !i.ok);
  return `<div class="hud"><button class="iconbtn" data-act="quit" title="Salir">${ic("x")}</button><b style="flex:1">${esc(Q.label)}</b></div>
  <div class="arena">${pathBanner()}<div class="card result">
    <div class="eyebrow">Puntaje estimado · semana ${s.week}</div>
    <div class="score num" style="color:${s.pass?'var(--good)':'var(--bad)'}">${s.scaled}<span class="muted" style="font-size:1.4rem"> / 1000</span></div>
    <h2>${s.pass ? "Aprobado (estimado)" : `Todavía no: te faltan ${720 - s.scaled} puntos para 720`}</h2>
    <div class="row" style="justify-content:center">${ps ? `${delta(s.scaled, ps.scaled)} <span class="muted">frente a tu simulacro anterior (${ps.scaled})</span>` : '<span class="muted">Es tu primer simulacro: el próximo se comparará con este.</span>'}</div>
    <p class="note" style="text-align:center">AWS no publica cómo convierte los aciertos a la escala 100-1000: este puntaje asume que 72% de las 50 preguntas puntuables equivale a 720.</p>
    <div class="kpis"><div class="kpi"><b>${s.cs}/${s.ns}</b><span>puntuables correctas</span></div><div class="kpi"><b>${fmtT(s.avgSec)}</b><span>por pregunta (meta ≤ 2:00)</span></div><div class="kpi"><b>${s.flaggedOk}/${s.flagged}</b><span>marcadas acertadas</span></div><div class="kpi"><b>${s.blank}</b><span>sin responder</span></div></div>
  </div>
  <div class="card stack"><h3>Resultado por dominio</h3><table><thead><tr><th>Dominio</th><th>Correctas</th><th>%</th><th>Estado</th><th>Cambio</th></tr></thead><tbody>
    ${[1,2,3,4].map(d => { const [c,n] = s.byD[d] || [0,0], pc = n ? c/n : 0, pp = ps && ps.byD[d] ? ps.byD[d][0]/ps.byD[d][1] : null;
      return `<tr><td><span class="dot" style="background:${dcol(d)}"></span> ${DOMAINS[d].short} <span class="muted">${DOMAINS[d].w}%</span></td><td class="num">${c}/${n}</td><td class="num">${pct(pc)}</td><td>${pc >= 0.7 ? '<span class="pill good">Cumple</span>' : '<span class="pill bad">Necesita mejorar</span>'}</td><td>${pp == null ? "–" : delta(Math.round(pc*100), Math.round(pp*100))}</td></tr>`; }).join("")}
  </tbody></table><p class="note">Las 15 preguntas no puntuables quedaron fuera del puntaje, como en el examen real (acertaste ${s.unscoredOk} de ellas).</p></div>
  ${recs.length ? `<div class="card stack"><h3>Qué estudiar esta semana</h3>${recs.map(x => `<div class="gapcard"><div class="tico" style="background:${dcol(TMAP[x.t].d)}">D${TMAP[x.t].d}</div><div><b>${esc(TMAP[x.t].name)}</b><div class="muted" style="font-size:.85rem">${s.wrongT[x.t]} errores puntuables en este simulacro</div></div><button class="btn small" data-act="topics" data-topics="${x.t}" data-n="10">${icFill("play","i")} Practicar</button></div>`).join("")}</div>` : ""}
  <div class="row" style="justify-content:center">${backBtn()}${wrong.length?`<button class="btn" data-act="redo">${ic("redo")} Repetir las ${wrong.length} falladas</button><button class="btn" data-act="variants">${ic("shuffle")} Variantes nuevas</button>`:''}</div>
  ${wrong.length?`<div class="card stack"><h3>Revisión de errores</h3>${wrong.map(it=>{const q=it.q, idx=Q.items.indexOf(it);return `<div class="review"><div class="row"><span class="pill" style="color:${dcol(TMAP[q.t].d)}">${esc(TMAP[q.t].name)}</span>${it.unscored?'<span class="pill">No puntuable</span>':''}${it.blank?'<span class="pill bad">Sin responder</span>':''}</div>
    <div><b>${glx(q.q, new Set())}</b></div>${compareHTML(it, true)}
    <div class="row"><button class="btn small" data-act="whyr" data-i="${idx}">${ic("eye")} Razonamiento</button><button class="btn small" data-act="tolog" data-i="${idx}">Anotar regla</button></div></div>`}).join("")}</div>`:''}</div>`;
}
function drawerHTML(){
  if (Q.drawer === "nav") return `<div class="drawer stack"><div class="row between"><h3>Panel de preguntas</h3><button class="iconbtn" data-act="closedrawer">${ic("x")}</button></div>
    <div class="row"><span class="pill acc">Respondidas</span><span class="pill gold">Marcadas</span></div>
    <div class="navgrid">${Q.items.map((x,i)=>`<button data-jump="${i}" class="${x.picked.length?'ans':''} ${x.flag?'flag':''} ${i===Q.i?'cur':''}">${i+1}</button>`).join("")}</div>
    <p class="note">${Q.items.filter(x=>!x.picked.length).length} sin responder · ${Q.items.filter(x=>x.flag).length} marcadas.</p><button class="btn primary" data-act="review">Revisar y entregar</button></div>`;
  const it = Q.drawerItem != null ? Q.items[Q.drawerItem] : Q.items[Q.i];
  if (Q.drawer === "terms"){
    const q = it.q, ts = G.termsIn(q.q, ...it.order.map(i => q.o[i]), ...(it.done && !Q.exam ? [q.e] : []));
    return `<div class="drawer stack"><div class="row between"><h3>Términos de esta pregunta</h3><button class="iconbtn" data-act="closedrawer" title="Cerrar (Esc)">${ic("x")}</button></div>
      <p class="note">En el orden en que aparecen en el enunciado y las opciones. Tip: pasa el mouse sobre cualquier palabra con línea punteada.</p>
      ${ts.length ? ts.map(e => `<div class="card flat">${glEntryHTML(e)}</div>`).join("") : '<div class="empty">Esta pregunta no tiene términos del glosario.</div>'}</div>`;
  }
  return `<div class="drawer stack"><div class="row between"><h3>Razonamiento paso a paso</h3><button class="iconbtn" data-act="closedrawer" title="Cerrar (Esc)">${ic("x")}</button></div>${reasonHTML(it)}</div>`;
}
function vResult(){
  const r = Q.result, ratio = r.c / r.n, wrong = Q.items.filter(i => i.done && !i.ok);
  const stars = ratio >= 0.9 ? 3 : ratio >= 0.72 ? 2 : ratio >= 0.5 ? 1 : 0;
  const endless = Q.mode === "time" || Q.mode === "surv";
  const msg = endless ? (Q.record ? "¡Nuevo récord!" : `Récord actual: ${Q.mode==="time"?P.best.time:P.best.surv}`) : stars === 3 ? "¡Partida perfecta!" : stars === 2 ? (Q.exam ? "¡Jefe derrotado! Zona de aprobación" : "¡Muy bien!") : stars === 1 ? "Buen intento: repasa los errores" : "A practicar estos temas";
  return `<div class="hud"><button class="iconbtn" data-act="quit" title="Salir">${ic("x")}</button><b style="flex:1">${esc(Q.label)}</b></div>
  <div class="arena">${pathBanner()}<div class="card result">
    ${endless ? `<div class="bigstars" style="color:${Q.mode==="time"?"var(--cyan)":"var(--pink)"}">${icFill(Q.mode==="time"?"bolt":"heart")}</div>` : `<div class="bigstars">${Array.from({length:3},(_,i)=>icFill("star", i<stars?"":"off")).join("")}</div>`}
    <div class="score num">${endless ? r.c : Math.round(ratio*100)+"%"}</div><h2>${msg}</h2>
    <div class="kpis"><div class="kpi"><b>${r.c}/${r.n}</b><span>correctas</span></div><div class="kpi"><b>+${r.xp||0}</b><span>XP ganada</span></div><div class="kpi"><b>${r.combo||0}</b><span>mejor combo</span></div><div class="kpi"><b>${Math.max(1, Math.round((r.end-r.start)/60000))}</b><span>minutos</span></div></div>
    <div class="row" style="justify-content:center">${Object.entries(r.byD).map(([d,[c,n]])=>`<span class="pill"><span class="dot" style="background:${dcol(d)}"></span>${DOMAINS[d].short} ${c}/${n}</span>`).join("")}</div>
    <div class="row" style="justify-content:center">${backBtn()}${wrong.length?`<button class="btn" data-act="redo">${ic("redo")} ${wrong.length===1?"Repetir la fallada":`Repetir las ${wrong.length} falladas`}</button><button class="btn" data-act="variants">${ic("shuffle")} Variantes nuevas</button>`:''}</div>
  </div>
  ${wrong.length?`<div class="card stack"><h3>Revisión de errores</h3>${wrong.map(it=>{const q=it.q, idx=Q.items.indexOf(it);return `<div class="review"><div class="row"><span class="pill" style="color:${dcol(TMAP[q.t].d)}">${esc(TMAP[q.t].name)}</span>${q.src==='gen'?'<span class="pill acc">Generada</span>':''}</div>
    <div><b>${glx(q.q, new Set())}</b></div>${compareHTML(it, true)}
    <div class="row"><button class="btn small" data-act="whyr" data-i="${idx}">${ic("eye")} Razonamiento</button><button class="btn small" data-act="tolog" data-i="${idx}">Anotar regla</button><button class="btn small ghost" data-topicx="${q.t}">Ficha del tema</button></div></div>`}).join("")}</div>`:''}</div>`;
}

/* ───────── eventos ───────── */
function bind(){
  $$("[data-v]", $("#tabs")).forEach(el => el.onclick = () => go(el.dataset.v));
  $$("[data-top]").forEach(el => el.onclick = () => topAct(el.dataset.top));
  $$("#main [data-task]").forEach(el => el.onchange = () => { S.plan.done[el.dataset.task] = el.checked; el.closest(".task").classList.toggle("done", el.checked); savePlan(); });
  $$("#main [data-go]").forEach(el => el.onclick = () => { if (el.dataset.ptab) progTab = el.dataset.ptab; go(el.dataset.go); });
  $$("#main [data-mode]").forEach(el => el.onclick = () => startMode(el.dataset.mode));
  $$("#main [data-topic]").forEach(el => el.onclick = () => go("mapa", el.dataset.topic));
  $$("#main [data-topicx]").forEach(el => el.onclick = () => { Q = null; go("mapa", el.dataset.topicx); });
  $$("#main [data-pnode]").forEach(el => el.onclick = () => { pathOpen = pathOpen === el.dataset.pnode ? null : el.dataset.pnode; render(); });
  $$("#main [data-day]").forEach(el => el.onclick = () => { planDay = el.dataset.day; render(); });
  $$("#main [data-ptab]").forEach(el => { if (!el.dataset.go) el.onclick = () => { progTab = el.dataset.ptab; render(); }; });
  $$("#main [data-deck]").forEach(el => el.onclick = () => { deck = makeDeck(el.dataset.deck); render(); });
  $$("#main [data-rtab]").forEach(el => el.onclick = () => { repTab = el.dataset.rtab; render(); $("#mainscroll").scrollTo({top:0}); });
  $$("#main [data-glcat]").forEach(el => el.onclick = () => { glCat = el.dataset.glcat; render(); });
  $$("#main [data-gljump]").forEach(el => el.onclick = () => openGloss(el.dataset.gljump));
  const gq = $("#glq"); if (gq){ gq.oninput = () => { glQ = gq.value; filterGloss(); }; filterGloss(); }
  const sg = $("#set-gloss"); if (sg) sg.onchange = () => { P.gloss = sg.checked; saveP(); render(); };
  const sgs = $("#set-glosssim"); if (sgs) sgs.onchange = () => { P.glossSim = sgs.checked; saveP(); };
  if (glFocus && !Q){ const el = $("#g-" + glFocus); glFocus = null; if (el){ el.scrollIntoView({ block:"center" }); el.classList.add("hl"); } }
  const dt = $("#decktopic"); if (dt) dt.onchange = () => { if (dt.value){ deck = makeDeck("tema", dt.value); render(); } };
  $$("#main [data-goal]").forEach(el => el.onclick = () => { P.goal = +el.dataset.goal; saveP(); render(); });
  $$("#main [data-theme]").forEach(el => el.onclick = () => setTheme(el.dataset.theme));
  const ss = $("#set-sound"); if (ss) ss.onchange = () => { P.sound = ss.checked; saveP(); renderTop(); bind(); };
  $$("#main [data-weak]").forEach(el => el.onclick = () => { const t = el.dataset.weak; regWeak.has(t) ? regWeak.delete(t) : regWeak.add(t); el.setAttribute("aria-pressed", regWeak.has(t)); });
  $$("[data-jump]").forEach(el => el.onclick = () => { Q.drawer = null; setIdx(+el.dataset.jump); });
  $$("[data-rfilter]").forEach(el => el.onclick = () => { Q.filter = el.dataset.rfilter; render(); });
  $$("[data-ext]").forEach(el => el.onclick = e => { e.preventDefault(); D ? D.openExternal(el.dataset.ext) : window.open(el.dataset.ext, "_blank", "noopener"); });
  $$("#main [data-delext]").forEach(el => el.onclick = async () => { const id = el.dataset.delext; if (el.dataset.armed){ S.external = S.external.filter(e=>e.id!==id); render(); await Store.del("external/"+id); } else { el.dataset.armed = 1; el.textContent = "¿Confirmar?"; } });
  $$("#main [data-dellog]").forEach(el => el.onclick = async () => { const id = el.dataset.dellog; if (el.dataset.armed){ S.errlog = S.errlog.filter(e=>e.id!==id); render(); await Store.del("errlog/"+id); } else { el.dataset.armed = 1; el.textContent = "¿Confirmar?"; } });
  $$("#opts input").forEach(el => el.onchange = () => {
    const it = Q.items[Q.i], v = +el.value;
    if (el.type === "radio") it.picked = [v]; else it.picked = el.checked ? [...new Set([...it.picked, v])] : it.picked.filter(x=>x!==v);
    if (Q.mode === "time" && el.type === "radio") return confirmItem();
    $$("#opts .opt").forEach(o => o.classList.toggle("sel", o.querySelector("input").checked));
    const c = $('[data-act="confirm"]'); if (c) c.disabled = !it.picked.length;
  });
  const ef = $("#extform"); if (ef) ef.onsubmit = async e => { e.preventDefault();
    const val = id => $(id).value.trim();
    const rec = { id: uid(), created: Date.now(), src: val("#ex-src"), name: val("#ex-name"), date: val("#ex-date") || todayKey(), score: val("#ex-score"), domains: {1:val("#ex-d1"),2:val("#ex-d2"),3:val("#ex-d3"),4:val("#ex-d4")}, weak: [...regWeak], notes: val("#ex-notes") };
    if (!rec.score && ![1,2,3,4].some(d=>rec.domains[d]) && !rec.weak.length){ toast("Agrega al menos un puntaje o un tema fallado.", { c:"var(--bad)", icon:"x" }); return; }
    S.external.push(rec); regWeak = new Set(); render(); toast("Resultado guardado", { sub:"Tu mapa se actualizó.", c:"var(--good)", icon:"check" }); await Store.set("external/"+rec.id, rec); };
  const lf = $("#logform"); if (lf) lf.onsubmit = async e => { e.preventDefault();
    const rule = $("#lg-rule").value.trim(); if (!rule){ toast("Escribe la regla aprendida.", { c:"var(--bad)", icon:"x" }); return; }
    const rec = { id: uid(), created: Date.now(), t: $("#lg-t").value, src: $("#lg-src").value.trim(), rule };
    S.errlog.push(rec); render(); toast("Regla agregada a la bitácora", { c:"var(--good)", icon:"check" }); await Store.set("errlog/"+rec.id, rec); };
  $$("[data-act]").forEach(el => { el.onclick = ev => act(el.dataset.act, el, ev); if (el.dataset.act==="flip") el.onkeydown = e => { if (e.key==="Enter"){ e.preventDefault(); act("flip"); } }; });
  const dp = $("#datapath"); if (dp && D) D.dataPath().then(p => dp.textContent = p);
}
function startMode(k){
  const seed = () => { const used = new Set(), qs = []; for (let i=0;i<3;i++){ const q = nextEndless(used); if (q){ qs.push(q); used.add(q.id); } } return qs; };
  switch(k){
    case "quick": return startQuiz({ label:"Partida rápida", mode:"quick", qs: quickSet(10) });
    case "time": return startQuiz({ label:"Contrarreloj", mode:"time", qs: seed(), minutes:3, endless:true });
    case "surv": return startQuiz({ label:"Supervivencia", mode:"surv", qs: seed(), lives:3, endless:true });
    case "srs": { const d = dueList(); return startQuiz({ label:"Repaso de errores", mode:"srs", qs: shuffle(d.length ? d : dueList(true)).slice(0,20) }); }
    case "exam": return startQuiz({ label:"Simulacro semanal · semana " + simWeek(Date.now()), mode:"exam", qs: simSet(), exam:true, minutes:130, sim:true });
    case "duel": return startQuiz({ label:"Duelos de confusiones", mode:"duel", qs: duelSet(8) });
    case "diag": return startQuiz({ label:"Diagnóstico", mode:"diag", qs: diagnosticSet() });
  }
}
function act(a, el){
  switch(a){
    case "diag": return startMode("diag");
    case "exam": return startMode("exam");
    case "topics": { const ids = el.dataset.topics.split(","); return startQuiz({ label: ids.length===1 ? TMAP[ids[0]].name : "Temas del día", mode:"topic", qs: topicSet(ids, +el.dataset.n || 10) }); }
    case "genfam": { const F = E.FAMILIES.find(f=>f.id===el.dataset.f); return startQuiz({ label:"Decisión · "+F.name, mode:"gen", qs: E.generateSet(8, { fam: F.id, level: levelForFam(F.id), multi: 0.1 }) }); }
    case "duelone": { const [f,t,b] = el.dataset.k.split("|"); const qs = []; const seen = new Set(); for (let i=0;i<6;i++){ const q = E.duel(f, i%3===2 ? b : t, i%3===2 ? t : b, { level: levelForFam(f), exclude: seen }); if (q){ qs.push(q); seen.add(q.id); } } return startQuiz({ label:"Duelo · "+solName(f,t)+" vs "+solName(f,b), mode:"duel", qs }); }
    case "terms": Q.drawerItem = null; Q.drawer = Q.drawer === "terms" ? null : "terms"; return render();
    case "glcards": deck = makeDeck("terminos"); repTab = "flash"; render(); return $("#mainscroll").scrollTo({top:0});
    case "pathgo": return startNode(el.dataset.node);
    case "pathskip": P.path.skip[el.dataset.node] = true; saveP(); pathOpen = null; render(); toast("Diagnóstico saltado", { sub:"Puedes hacerlo cuando quieras desde el campamento base o desde Jugar.", icon:"route" }); return focusCurrent(true);
    case "pathnext": { const nx = currentNode(); Q = null; view = "ruta"; pathOpen = nx ? nx.id : null; render(); return focusCurrent(true); }
    case "pathretry": { const id = Q.pathOut.id; Q = null; view = "ruta"; return startNode(id); }
    case "introgo": Q.intro = null; Q.t0 = Date.now(); render(); $("#mainscroll").scrollTo({top:0}); return;
    case "onbagain": return showOnb();
    case "confirm": return confirmItem();
    case "next": return next();
    case "prev": if (Q.i > 0) setIdx(Q.i - 1); return;
    case "review": stamp(); Q.drawer = null; Q.review = true; return render();
    case "flag": Q.items[Q.i].flag = !Q.items[Q.i].flag; return render();
    case "navpanel": Q.drawer = Q.drawer === "nav" ? null : "nav"; return render();
    case "why": Q.drawerItem = null; Q.drawer = Q.drawer === "why" ? null : "why"; return render();
    case "whyr": Q.drawerItem = +el.dataset.i; Q.drawer = "why"; return render();
    case "closedrawer": Q.drawer = null; return render();
    case "variant": {
      const it = Q.items[Q.i], v = E.variantOf(it.q, { level: levelFor(it.q.t), levelFn: levelForFam, exclude: Q.used });
      if (!v){ toast("Este tema todavía no tiene variantes en el motor.", { c:"var(--bad)", icon:"x" }); return; }
      Q.used.add(v.id); Q.items.splice(Q.i+1, 0, newItem(v)); toast("Variante agregada como siguiente pregunta", { c:"var(--primary)", icon:"shuffle" }); return render();
    }
    case "variants": {
      const seen = new Set(), qs = [];
      for (const it of Q.items.filter(i => i.done && !i.ok)){ const v = E.variantOf(it.q, { level: levelFor(it.q.t), levelFn: levelForFam, exclude: seen }); if (v){ qs.push(v); seen.add(v.id); } }
      Q = null; return startQuiz({ label:"Variantes de tus errores", mode:"gen", qs });
    }
    case "redo": { const qs = Q.items.filter(i=>i.done&&!i.ok).map(i=>i.q); Q = null; return startQuiz({ label:"Repetir falladas", mode:"redo", qs }); }
    case "finish": {
      if (Q.exam && !el.dataset.armed){ const left = Q.items.filter(i=>!i.picked.length).length; el.dataset.armed = 1; el.textContent = left ? `Quedan ${left} sin responder. ¿Entregar?` : "¿Confirmar entrega?"; return; }
      return finishQuiz();
    }
    case "quit": {
      if (Q.result){ view = Q.from || "ruta"; Q = null; render(); if (view === "ruta") focusCurrent(false); return; }
      const answered = Q.items.filter(i => i.done).length;
      if (Q.exam && !el.dataset.armed){ el.dataset.armed = 1; toast("¿Abandonar el simulacro?", { sub:"Haz clic otra vez en ✕ para salir sin entregar.", c:"var(--bad)", icon:"x" }); return; }
      if (Q.exam || !answered){ if (Q.timer) clearInterval(Q.timer); Q = null; return render(); }
      return finishQuiz();
    }
    case "tolog": { const q = el.dataset.i != null ? Q.items[+el.dataset.i].q : Q.items[Q.i].q; if (Q.timer) clearInterval(Q.timer); Q = null; progTab = "bitacora"; view = "progreso"; render(); $("#lg-t").value = q.t; $("#lg-src").value = (q.src==="gen" ? "Generada · " : "Banco · ") + q.id; $("#lg-rule").focus(); return; }
    case "mapback": topic = null; return render();
    case "fam": return go("decisiones", el.dataset.f);
    case "famback": fam = null; return render();
    case "deck": deck = makeDeck("tema", el.dataset.t); return go("repaso");
    case "deckagain": deck = makeDeck(deck.src, deck.tid); return render();
    case "flip": deck.flip = !deck.flip; return render();
    case "cardyes": deck.known++; deck.i++; deck.flip = false; sound("tick"); return render();
    case "cardno": deck.i++; deck.flip = false; return render();
    case "export": return D.exportData().then(r => { if (r.ok) toast("Progreso exportado", { c:"var(--good)", icon:"check" }); });
    case "import": return D.importData().then(r => { if (r.ok) location.reload(); else if (r.error) toast(r.error, { c:"var(--bad)", icon:"x" }); });
  }
}
function setTheme(t){
  if (t === "light") document.documentElement.dataset.theme = "light"; else delete document.documentElement.dataset.theme;
  try { t === "light" ? localStorage.setItem("saa-theme","light") : localStorage.removeItem("saa-theme"); } catch(e){}
  render();
}
function topAct(k){
  if (k === "theme") return setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
  if (k === "sound"){ P.sound = !P.sound; saveP(); renderTop(); bind(); if (P.sound) sound("tick"); return; }
  if (k === "help") return showShortcuts();
}
function showShortcuts(){
  const md = $("#modal");
  md.innerHTML = `<div class="card stack" role="dialog" aria-label="Atajos de teclado"><div class="row between"><h3>Atajos de teclado</h3><button class="iconbtn" id="mdclose">${ic("x")}</button></div>
    <div class="keys"><kbd>Ctrl</kbd><span>+ 1…7 cambia de sección</span><kbd>1-5</kbd><span>Elegir opción</span><kbd>Enter</kbd><span>Comprobar o continuar</span><kbd>R</kbd><span>Razonamiento paso a paso</span><kbd>V</kbd><span>Agregar una variante</span><kbd>F</kbd><span>Marcar pregunta (simulacro)</span><kbd>← →</kbd><span>Moverte entre preguntas (simulacro)</span><kbd>Esc</kbd><span>Cerrar el panel lateral</span><kbd>Espacio</kbd><span>Voltear flashcard</span><kbd>Ctrl+E</kbd><span>Exportar progreso</span></div><button class="btn" id="mdonb" style="justify-self:start">${ic("route")} Ver la introducción otra vez</button></div>`;
  md.hidden = false; $("#mdclose").onclick = () => md.hidden = true; $("#mdonb").onclick = () => showOnb(); md.onclick = e => { if (e.target === md) md.hidden = true; };
}

/* ───────── tooltip del glosario ───────── */
let tipT = null, tipPinned = false, tipEl = null;
function openGloss(id){ hideTip(); if (Q) return; repTab = "glosario"; glQ = ""; glCat = ""; glFocus = id; go("repaso"); }
function hideTip(){ clearTimeout(tipT); tipPinned = false; tipEl = null; const t = $("#gltip"); if (t) t.hidden = true; }
function showTip(el, pin){
  const e = G.BY_ID[el.dataset.g], t = $("#gltip"); if (!e || !t || !el.isConnected) return;
  t.innerHTML = glEntryHTML(e, { tip:true, pin }); t.hidden = false; t.classList.toggle("pinned", pin);
  tipPinned = pin; tipEl = el;
  const r = el.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight;
  t.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width/2 - w/2)) + "px";
  t.style.top = (r.bottom + 8 + h > innerHeight - 12 ? Math.max(12, r.top - h - 8) : r.bottom + 8) + "px";
  P.glSeen[e.id] = (P.glSeen[e.id] || 0) + 1; saveP();
}
document.addEventListener("mouseover", e => {
  const g = e.target.closest && e.target.closest(".gl[data-g]"); if (!g || tipPinned || g === tipEl) return;
  clearTimeout(tipT); tipT = setTimeout(() => showTip(g, false), 160);
});
document.addEventListener("mouseout", e => {
  const g = e.target.closest && e.target.closest(".gl[data-g]"); if (!g || tipPinned) return;
  if (e.relatedTarget && g.contains(e.relatedTarget)) return;
  clearTimeout(tipT); const t = $("#gltip"); if (t) t.hidden = true; tipEl = null;
});
// clic en un término: fija la definición sin activar la opción, la tarjeta o el botón que lo contiene
document.addEventListener("click", e => {
  const go2 = e.target.closest("[data-glgo]"); if (go2){ e.preventDefault(); e.stopPropagation(); return openGloss(go2.dataset.glgo); }
  const g = e.target.closest(".gl[data-g]");
  if (g){ e.preventDefault(); e.stopPropagation(); clearTimeout(tipT); if (tipPinned && tipEl === g) hideTip(); else showTip(g, true); return; }
  if (tipPinned && !e.target.closest("#gltip")) hideTip();
}, true);
document.addEventListener("scroll", () => { if (!$("#gltip").hidden) hideTip(); }, true);

/* ───────── guion de inicio (primera vez) ───────── */
const ONB_LEVELS = [
  ["cero","Empiezo de cero","Nunca usé AWS o solo lo conozco de nombre.","spark"],
  ["basico","Conozco lo básico","Uso EC2 o S3, pero no domino la arquitectura.","cards"],
  ["avanzado","Ya estudié bastante","Hice cursos o exámenes de práctica.","crown"]
];
const ONB_GOALS = [[20,"Casual"],[30,"Regular"],[50,"Serio"],[80,"Intenso"]];
const ONB_N = 5;
function showOnb(){ if (Q && !Q.result) return; $("#modal").hidden = true; onb = { step:0, level: P.onb && P.onb.level || null, goal: P.goal }; renderOnb(); }
function closeOnb(){
  P.onb = { at: Date.now(), level: onb.level }; P.goal = onb.goal; saveP();
  onb = null; $("#onbhost").innerHTML = ""; render();
}
const guide = (title, html) => `<div class="guide"><div class="gem xl"><svg viewBox="0 0 24 24"><path d="M4 18l5-6 4 3 7-9"/></svg></div><div class="say"><h2>${title}</h2><div>${html}</div></div></div>`;
function renderOnb(){
  const host = $("#onbhost"); if (!onb) { host.innerHTML = ""; return; }
  const s = onb.step, days = daysLeft(), first = PMAP["t:"+ORDER[1][0]];
  let body = "", next = `<button class="btn primary big" data-onb="next" data-primary>Continuar</button>`;
  if (s === 0){
    body = guide("¡Hola! Soy tu guía para el SAA-C03.", `<p>Faltan <b>${days} días</b> para tu examen: el <b>viernes 23 de octubre</b>. Lo vamos a recorrer como un juego: estudias un tema, lo practicas y vences al jefe de cada mundo hasta llegar al examen.</p><p>Te tomará un minuto configurarlo.</p>`)
      + `<div class="facts"><div><b class="num">65</b><span>preguntas</span></div><div><b class="num">130</b><span>minutos</span></div><div><b class="num">720</b><span>para aprobar (de 1000)</span></div><div><b class="num">4</b><span>dominios = 4 mundos</span></div></div>`;
    next = `<button class="btn primary big" data-onb="next" data-primary>¡Empecemos!</button>`;
  } else if (s === 1){
    body = guide("¿Cuánto sabes de AWS?", "<p>Así sé por dónde conviene que empieces.</p>")
      + `<div class="choices">${ONB_LEVELS.map(([k,n,d,i]) => `<button class="choice" data-onb="lvl:${k}" aria-pressed="${onb.level===k}"><span class="cic">${ic(i)}</span><span><b>${n}</b><small>${d}</small></span></button>`).join("")}</div>`;
    next = `<button class="btn primary big" data-onb="next" data-primary ${onb.level?"":"disabled"}>Continuar</button>`;
  } else if (s === 2){
    const rec = days <= 25 ? 50 : 30;
    body = guide("Elige tu meta diaria", `<p>Es cuántas preguntas quieres responder cada día. Con ${days} días por delante te recomiendo <b>${rec}</b>. Puedes cambiarla luego en Recursos.</p>`)
      + `<div class="choices goals">${ONB_GOALS.map(([n,l]) => `<button class="choice" data-onb="goal:${n}" aria-pressed="${onb.goal===n}"><span class="cic num">${n}</span><span><b>${l}${n===rec?' <span class="pill acc">Recomendada</span>':''}</b><small>unos ${Math.round(n*1.5)} minutos al día · ${(n*days).toLocaleString("es-PE")} preguntas antes del examen</small></span></button>`).join("")}</div>`;
  } else if (s === 3){
    body = guide("Así funciona tu ruta", "<p>Un camino con 6 mundos que se abren en orden. Siempre verás cuál es tu siguiente paso.</p>")
      + `<div class="worldchips">${WORLDS.map(W => `<span style="--c:${W.c}">${esc(W.name)}</span>`).join(ic("play","i arrow"))}</div>
      <div class="howto">
        <div><span class="nico" style="--c:var(--d1)">${icFill("star")}</span><span><b>2 lecciones por tema</b><small>«Aprender»: lees lo esencial y respondes 6 preguntas básicas. «Dominar»: 8 preguntas a tu nivel.</small></span></div>
        <div><span class="nico" style="--c:var(--d2)">${ic("chest")}</span><span><b>Cofre de repaso</b><small>A mitad de cada mundo: tus errores vuelven para que no se te olviden.</small></span></div>
        <div><span class="nico" style="--c:var(--d3)">${ic("crown")}</span><span><b>Jefe del mundo</b><small>12 preguntas; con 72% abres el siguiente mundo. Si ya dominas un mundo, enfréntalo antes y sáltalo.</small></span></div>
        <div><span class="nico" style="--c:var(--gold)">${ic("flag")}</span><span><b>Recta final</b><small>Simulacros de 65 preguntas con puntaje 100-1000, cierre de brechas y duelos.</small></span></div>
      </div>
      <p class="note">¿Una palabra que no conoces, como «AZ» o «NAT gateway»? Las que tienen <span class="gl">línea punteada</span> muestran su significado al pasar el mouse, y en Repaso → Glosario están todas.</p>
      <p class="note">La ruta sigue el plan de 23 días: los temas de hoy llevan la etiqueta <span class="hoy">Hoy</span> y te aviso si vas atrasado.</p>`;
  } else {
    const diagFirst = onb.level && onb.level !== "cero";
    const lessonBtn = (cls, extra="") => `<button class="btn ${cls} big" data-onb="lesson" ${extra}>${icFill("star","i")} Empezar la lección 1: ${esc(shortName(first))}</button>`;
    const diagBtn = (cls, extra="") => `<button class="btn ${cls} big" data-onb="diag" ${extra}>${ic("target")} Hacer el diagnóstico (${TOPICS.length + 12} preguntas)</button>`;
    body = guide("¡Todo listo! Tu primer paso:", diagFirst
      ? `<p>Como ya tienes base, empieza con el <b>diagnóstico</b>: una pregunta de cada tema para ver dónde estás fuerte y dónde no. Toma unos 60 minutos y no importa el puntaje.</p><p>Después, la ruta te lleva al Mundo 1. Si un mundo ya lo dominas, vence a su jefe y sáltalo.</p>`
      : `<p>Empieza por el <b>Mundo 1 · Seguridad</b> (el 30% del examen) con la lección <b>${esc(first.title)}</b>: primero lees lo esencial y luego respondes 6 preguntas fáciles.</p><p>El diagnóstico queda para más adelante, cuando tengas algo de base.</p>`)
      + `<div class="stack firststep">${diagFirst ? diagBtn("primary", "data-primary") + lessonBtn("") : lessonBtn("primary", "data-primary") + diagBtn("")}<button class="btn ghost" data-onb="ruta">Solo quiero ver la ruta</button></div>`;
    next = "";
  }
  host.innerHTML = `<div class="onb" role="dialog" aria-modal="true" aria-label="Introducción">
    <div class="onbtop">${s > 0 ? `<button class="iconbtn" data-onb="back" title="Atrás">←</button>` : `<span style="width:36px"></span>`}
      <div class="bar"><i style="width:${(s+1)/ONB_N*100}%;background:linear-gradient(90deg,var(--primary),var(--pink))"></i></div>
      <button class="btn ghost" data-onb="skip">Saltar introducción</button></div>
    <div class="onbbody"><div class="onbin ${onb.shown === s ? "" : "anim"}">${body}</div></div>
    ${next ? `<div class="onbfoot"><span class="muted num">Paso ${s+1} de ${ONB_N}</span>${next}</div>` : ""}
  </div>`;
  onb.shown = s;
  $$("[data-onb]", host).forEach(el => el.onclick = () => onbAct(el.dataset.onb));
  const pr = $("[data-primary]", host); if (pr) pr.focus();
}
function onbAct(a){
  if (a === "next"){ onb.step = Math.min(ONB_N - 1, onb.step + 1); return renderOnb(); }
  if (a === "back"){ onb.step = Math.max(0, onb.step - 1); return renderOnb(); }
  if (a.startsWith("lvl:")){ onb.level = a.slice(4); return renderOnb(); }
  if (a.startsWith("goal:")){ onb.goal = +a.slice(5); return renderOnb(); }
  closeOnb(); view = "ruta";
  if (a === "lesson"){ if (!isDone(PMAP.diag)) P.path.skip.diag = true; saveP(); return startNode(PMAP["t:"+ORDER[1][0]].id); }
  if (a === "diag") return startNode("diag");
  const nx = currentNode(); pathOpen = nx ? nx.id : null; render(); focusCurrent(true);
}

/* ───────── teclado ───────── */
document.addEventListener("keydown", e => {
  if (onb){ if (e.key === "Enter" && e.target.tagName !== "BUTTON"){ const b = $("#onbhost [data-primary]"); if (b && !b.disabled){ e.preventDefault(); b.click(); } } return; }
  if (e.key === "Escape" && !$("#gltip").hidden){ hideTip(); return; }
  if (e.key === "Escape"){ if (!$("#modal").hidden){ $("#modal").hidden = true; return; } if (Q && Q.drawer){ Q.drawer = null; render(); return; } if (!Q && pathOpen){ pathOpen = null; render(); return; } }
  if (Q && Q.intro && !Q.result){ if (e.key === "Enter" && e.target.tagName !== "BUTTON"){ e.preventDefault(); act("introgo"); } return; }
  if (e.key === "F1"){ e.preventDefault(); showShortcuts(); return; }
  if (!D && (e.ctrlKey || e.metaKey) && /^[1-7]$/.test(e.key)){ e.preventDefault(); go(VIEWS[+e.key-1][0]); return; }
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.target.type !== "radio" && e.target.type !== "checkbox";
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!Q && view === "repaso" && deck && deck.i < deck.cards.length){
    if (e.key === " "){ e.preventDefault(); act("flip"); }
    else if (deck.flip && e.key === "1") act("cardno"); else if (deck.flip && e.key === "2") act("cardyes");
    return;
  }
  if (!Q || Q.result || Q.review) return;
  const it = Q.items[Q.i];
  if (/^[1-5]$/.test(e.key)){ const inp = $$("#opts input")[+e.key-1]; if (inp && !inp.disabled){ inp.checked = inp.type==="checkbox" ? !inp.checked : true; inp.dispatchEvent(new Event("change")); } }
  else if (e.key === "Enter"){ if (e.target.tagName === "BUTTON") return; e.preventDefault(); if (!Q.exam && !it.done){ if (it.picked.length) confirmItem(); } else next(); }
  else if (Q.exam && !Q.review && e.key === "ArrowRight"){ if (Q.i < Q.items.length-1) setIdx(Q.i + 1); }
  else if (Q.exam && !Q.review && e.key === "ArrowLeft"){ if (Q.i > 0) setIdx(Q.i - 1); }
  else if ((e.key === "g" || e.key === "G") && glossOn()) act("terms");
  else if ((e.key === "f" || e.key === "F") && Q.exam) act("flag");
  else if ((e.key === "r" || e.key === "R") && it.done && !Q.exam) act("why");
  else if ((e.key === "v" || e.key === "V") && it.done && !Q.exam) act("variant");
});

/* ───────── arranque ───────── */
if (D) D.onMenu(a => { if (a.startsWith("go:")) go(a.slice(3)); else if (a === "theme") topAct("theme"); else if (a === "shortcuts") showShortcuts(); else if (a === "exported") toast("Progreso exportado", { c:"var(--good)", icon:"check" }); });
const h0 = (location.hash||"").slice(1);
if (VIEWS.some(v => v[0] === h0)) view = h0;
document.addEventListener("click", e => { if (pathOpen && !Q && !onb && view === "ruta" && document.body.contains(e.target) && !e.target.closest(".pop,.pnode")){ pathOpen = null; render(); } });
render();
load().then(() => { render(); focusCurrent(false); checkBadges(); if (!P.onb) showOnb(); }).catch(err => { console.error(err); toast("No se pudo cargar tu progreso.", { c:"var(--bad)", icon:"x" }); render(); });
})();
