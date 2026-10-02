// Proceso principal: ventana, menú y almacenamiento del progreso en un archivo JSON local.
const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require("electron");
const fs = require("fs");
const path = require("path");

const DATA_FILE = () => path.join(app.getPath("userData"), "progreso-saa.json");
const WIN_FILE = () => path.join(app.getPath("userData"), "ventana.json");
// La prueba de humo usa una carpeta temporal para no tocar el progreso real.
if (process.env.SAA_SMOKE) app.setPath("userData", path.join(require("os").tmpdir(), "ruta-saa-smoke"));
let docs = {};
let win = null;
let saveTimer = null;

function loadData() {
  try { docs = JSON.parse(fs.readFileSync(DATA_FILE(), "utf8")).docs || {}; }
  catch (e) {
    docs = {};
    if (e.code !== "ENOENT") { // archivo dañado: se conserva una copia antes de empezar de cero
      try { fs.copyFileSync(DATA_FILE(), DATA_FILE() + ".danado-" + Date.now()); } catch (_) {}
    }
  }
}
function writeNow() {
  clearTimeout(saveTimer); saveTimer = null;
  const tmp = DATA_FILE() + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify({ version: 1, saved: new Date().toISOString(), docs }));
  fs.renameSync(tmp, DATA_FILE());
}
function scheduleSave() { if (!saveTimer) saveTimer = setTimeout(writeNow, 400); }

ipcMain.handle("store:get", (_e, p) => docs[p] ?? null);
ipcMain.handle("store:set", (_e, p, data) => { docs[p] = data; scheduleSave(); return true; });
ipcMain.handle("store:del", (_e, p) => { delete docs[p]; scheduleSave(); return true; });
ipcMain.handle("store:list", (_e, coll) => {
  const pre = coll + "/";
  return Object.entries(docs).filter(([k]) => k.startsWith(pre)).map(([k, v]) => ({ ...v, id: k.slice(pre.length) }));
});
ipcMain.handle("store:path", () => DATA_FILE());
ipcMain.handle("store:export", () => exportData());
ipcMain.handle("store:import", () => importData());
ipcMain.handle("open-external", (_e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });
// la versión portable no puede actualizarse sola: la interfaz solo avisa que hay una nueva
const isPortable = !!process.env.PORTABLE_EXECUTABLE_DIR;
ipcMain.handle("app:info", () => ({ version: app.getVersion(), portable: isPortable, packaged: app.isPackaged }));

/* Actualizaciones automáticas (instalador NSIS): busca en GitHub Releases al abrir y cada 6 horas,
   descarga en segundo plano y se instala al cerrar la app (o al instante si el usuario lo pide). */
let updater = null;
function setupUpdates() {
  if (!app.isPackaged || isPortable || process.env.SAA_SMOKE) return;
  try { updater = require("electron-updater").autoUpdater; } catch (_) { return; }
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  const send = a => win && win.webContents.send("menu", a);
  updater.on("update-available", i => send("update:available:" + i.version));
  updater.on("update-downloaded", i => send("update:ready:" + i.version));
  updater.on("error", e => console.error("Actualizaciones:", e && e.message));
  const check = () => updater.checkForUpdates().catch(() => {});
  setTimeout(check, 5000);
  setInterval(check, 6 * 3600 * 1000);
}
ipcMain.handle("update:install", () => { if (updater) updater.quitAndInstall(false, true); });
ipcMain.handle("update:check", async () => {
  if (!updater) return { ok: false, reason: isPortable ? "portable" : "dev" };
  try { const r = await updater.checkForUpdates(); return { ok: true, version: r && r.updateInfo && r.updateInfo.version, current: app.getVersion() }; }
  catch (e) { return { ok: false, reason: e.message }; }
});

async function exportData() {
  const stamp = new Date().toISOString().slice(0, 10);
  const r = await dialog.showSaveDialog(win, { title: "Exportar progreso", defaultPath: `progreso-saa-c03-${stamp}.json`, filters: [{ name: "JSON", extensions: ["json"] }] });
  if (r.canceled || !r.filePath) return { ok: false };
  writeNow();
  fs.copyFileSync(DATA_FILE(), r.filePath);
  return { ok: true, file: r.filePath };
}
async function importData() {
  const r = await dialog.showOpenDialog(win, { title: "Importar progreso", properties: ["openFile"], filters: [{ name: "JSON", extensions: ["json"] }] });
  if (r.canceled || !r.filePaths[0]) return { ok: false };
  let incoming;
  try { incoming = JSON.parse(fs.readFileSync(r.filePaths[0], "utf8")); } catch (e) { return { ok: false, error: "El archivo no es un JSON válido." }; }
  if (!incoming || typeof incoming.docs !== "object") return { ok: false, error: "El archivo no parece una exportación de Ruta SAA-C03." };
  const n = Object.keys(incoming.docs).length;
  const c = await dialog.showMessageBox(win, { type: "warning", buttons: ["Reemplazar mi progreso", "Cancelar"], defaultId: 1, cancelId: 1, title: "Importar progreso",
    message: `¿Reemplazar tu progreso actual por el del archivo (${n} registros)?`, detail: "Antes de reemplazarlo se guarda una copia de seguridad de tu progreso actual en la carpeta de datos." });
  if (c.response !== 0) return { ok: false };
  writeNow();
  try { fs.copyFileSync(DATA_FILE(), DATA_FILE() + ".respaldo-" + Date.now()); } catch (_) {}
  docs = incoming.docs; writeNow();
  return { ok: true, n };
}

function readBounds() { try { return JSON.parse(fs.readFileSync(WIN_FILE(), "utf8")); } catch (_) { return null; } }
function saveBounds() { if (!win) return; try { fs.writeFileSync(WIN_FILE(), JSON.stringify({ ...win.getNormalBounds(), max: win.isMaximized() })); } catch (_) {} }

function createWindow() {
  const b = readBounds();
  win = new BrowserWindow({
    width: b?.width || 1440, height: b?.height || 920, x: b?.x, y: b?.y, minWidth: 1080, minHeight: 700,
    title: "Ruta SAA-C03", show: false, autoHideMenuBar: false,
    backgroundColor: "#13142B",
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false }
  });
  if (b?.max) win.maximize();
  win.once("ready-to-show", () => win.show());
  win.on("close", saveBounds);
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("file://")) { e.preventDefault(); if (/^https:\/\//.test(url)) shell.openExternal(url); } });
  win.loadFile(path.join(__dirname, "src", "index.html"));
  if (process.env.SAA_SMOKE) smokeTest();
}

// Capturas de pantalla para revisar el diseño (SAA_SHOTS=carpeta, solo junto con SAA_SMOKE).
async function captureScreens(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const js = code => win.webContents.executeJavaScript(`(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); ${code} })()`);
  const shot = async name => { await new Promise(r => setTimeout(r, 450)); const img = await win.webContents.capturePage(); fs.writeFileSync(path.join(dir, name + ".png"), img.toPNG()); };
  win.setSize(1440, 900);
  await js(`document.querySelector('[data-onb="skip"]')?.click(); await sleep(50);`);
  await js(`document.querySelector('[data-act="closedrawer"]')?.click(); await sleep(50); document.querySelector('[data-act="next"]')?.click(); await sleep(50);`);
  await shot("3-pregunta");
  await js(`document.querySelectorAll('#opts input')[1].click(); await sleep(20); document.querySelector('[data-act="confirm"]').click();`);
  await shot("4-resultado-pregunta");
  await js(`document.querySelector('[data-act="why"]').click();`);
  await shot("5-razonamiento");
  // respuesta incorrecta: comparación «elegiste / la correcta», tooltip del glosario y panel de términos
  await js(`document.querySelector('[data-act="closedrawer"]')?.click(); await sleep(30);
    for (let k = 0; k < 12 && !document.querySelector('.sheet.no'); k++) {
      if (document.querySelector('.sheet')) { document.querySelector('.sheet [data-act="next"]').click(); await sleep(60); }
      const o = document.querySelectorAll('#opts input'); if (!o.length) break; o[k % o.length].click(); await sleep(20);
      document.querySelector('[data-act="confirm"]')?.click(); await sleep(80); }`);
  await shot("5b-por-que-no");
  await js(`const g = document.querySelector('.qtext .gl'); g && g.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); await sleep(350);`);
  await shot("5c-glosario-tooltip");
  await js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' })); await sleep(100);`);
  await shot("5d-terminos-pregunta");
  await js(`document.querySelector('[data-act="closedrawer"]').click(); await sleep(30); document.querySelector('[data-act="quit"]').click(); await sleep(60);`);
  await shot("6-fin-partida");
  await js(`document.querySelector('[data-act="quit"]').click(); await sleep(60);`);
  await shot("1-jugar");
  for (const [v, n] of [["ruta", "2-ruta"], ["plan", "7-plan"], ["decisiones", "8-decisiones"], ["progreso", "9-progreso"]]) {
    await js(`document.querySelector('#tabs [data-v="${v}"]').click();`); await shot(n);
  }
  await js(`document.documentElement.dataset.theme = "light"; document.querySelector('#tabs [data-v="jugar"]').click();`);
  await shot("10-jugar-dia");
  await js(`delete document.documentElement.dataset.theme; document.querySelector('#tabs [data-v="jugar"]').click(); await sleep(30);
    document.querySelector('[data-mode="exam"]').click(); await sleep(300);
    for (let i = 0; i < 64; i++) { const o = document.querySelectorAll('#opts input'); if (i % 7) o[i % o.length].click(); if (i % 11 === 0) document.querySelector('[data-act="flag"]').click(); document.querySelector('[data-act="next"]').click(); await sleep(5); }
    document.querySelector('[data-act="review"]').click();`);
  await shot("11-revision-simulacro");
  await js(`const f = document.querySelector('.arena [data-act="finish"]'); f.click(); await sleep(20); document.querySelector('.arena [data-act="finish"]').click();`);
  await shot("12-resultado-simulacro");
  await js(`document.querySelector('[data-act="quit"]').click(); await sleep(50); document.querySelector('#tabs [data-v="progreso"]').click(); await sleep(30); document.querySelector('[data-ptab="simulacros"]').click();`);
  await shot("13-progreso-simulacros");
  await js(`document.querySelector('[data-ptab="resumen"]').click(); await sleep(30); document.querySelector('#mainscroll').scrollTo(0, 99999);`);
  await shot("14-confusiones");
  await js(`document.querySelector('#tabs [data-v="jugar"]').click(); await sleep(30); document.querySelector('[data-mode="duel"]').click(); await sleep(150); document.querySelector('#opts input').click(); await sleep(10); document.querySelector('[data-act="confirm"]').click(); await sleep(30); document.querySelector('[data-act="why"]').click();`);
  await shot("15-duelo-razonamiento");
  await js(`document.querySelector('[data-act="closedrawer"]')?.click(); await sleep(30); document.querySelector('[data-act="quit"]')?.click(); await sleep(60); document.querySelector('[data-act="quit"]')?.click(); await sleep(60);
    document.querySelector('#tabs [data-v="repaso"]').click(); await sleep(50); document.querySelector('[data-rtab="glosario"]').click(); await sleep(80);`);
  await shot("16-glosario");
}

// Prueba de humo (SAA_SMOKE=1): recorre las secciones, genera y responde una pregunta, y sale.
function smokeTest() {
  const errors = [];
  win.webContents.on("console-message", function (e, level, message) { const lvl = e.level ?? level, msg = e.message ?? message; if (lvl === "error" || lvl === 3) errors.push(msg); });
  win.webContents.once("did-finish-load", async () => {
    try {
      const r = await win.webContents.executeJavaScript(`(async () => {
        const sleep = ms => new Promise(r => setTimeout(r, ms)); const out = {};
        await sleep(300);
        for (const v of ["ruta","jugar","plan","decisiones","repaso","progreso","recursos"]) { document.querySelector('#tabs [data-v="'+v+'"]').click(); await sleep(30); out[v] = document.querySelector('#main').innerText.length; }
        document.querySelector('#tabs [data-v="jugar"]').click(); await sleep(30);
        document.querySelector('[data-mode="quick"]').click(); await sleep(80);
        out.playing = document.body.classList.contains('playing');
        document.querySelector('#opts input').click(); await sleep(20); document.querySelector('[data-act="confirm"]').click(); await sleep(80);
        out.sheet = document.querySelector('.sheet h3').textContent;
        document.querySelector('[data-act="why"]').click(); await sleep(50);
        out.drawer = !!document.querySelector('.drawer .reason');
        out.font = getComputedStyle(document.querySelector('.qtext')).fontFamily;
        out.fontsLoaded = [...new Set([...document.fonts].filter(f => f.status === "loaded").map(f => f.family))];
        return out; })()`);
      if (process.env.SAA_SHOTS) await captureScreens(process.env.SAA_SHOTS);
      await new Promise(r => setTimeout(r, 900));
      console.log("SMOKE", JSON.stringify({ ...r, errors, dataFile: DATA_FILE(), saved: fs.existsSync(DATA_FILE()) }));
    } catch (e) { console.log("SMOKE_FAIL", e.message, errors); }
    app.quit();
  });
}

function buildMenu() {
  const send = a => () => win && win.webContents.send("menu", a);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "Archivo", submenu: [
      { label: "Exportar progreso…", accelerator: "CmdOrCtrl+E", click: async () => { const r = await exportData(); if (r.ok) send("exported")(); } },
      { label: "Importar progreso…", accelerator: "CmdOrCtrl+I", click: async () => { const r = await importData(); if (r.ok) win.reload(); else if (r.error) dialog.showErrorBox("No se pudo importar", r.error); } },
      { label: "Abrir carpeta de datos", click: () => shell.showItemInFolder(DATA_FILE()) },
      { type: "separator" }, { label: "Salir", role: "quit" }] },
    { label: "Ir a", submenu: [
      ["Ruta", "ruta"], ["Jugar", "jugar"], ["Plan", "plan"], ["Decisiones", "decisiones"], ["Repaso", "repaso"], ["Progreso", "progreso"], ["Recursos", "recursos"]
    ].map(([label, v], i) => ({ label, accelerator: "CmdOrCtrl+" + (i + 1), click: send("go:" + v) })) },
    { label: "Ver", submenu: [
      { label: "Cambiar tema nocturno/día", accelerator: "CmdOrCtrl+Shift+L", click: send("theme") },
      { type: "separator" }, { label: "Acercar", role: "zoomIn" }, { label: "Alejar", role: "zoomOut" }, { label: "Tamaño normal", role: "resetZoom" },
      { type: "separator" }, { label: "Pantalla completa", role: "togglefullscreen" }, { label: "Recargar", role: "reload" }, { label: "Herramientas de desarrollo", role: "toggleDevTools" }] },
    { label: "Ayuda", submenu: [
      { label: "Atajos de teclado", accelerator: "F1", click: send("shortcuts") },
      { label: "Buscar actualizaciones", click: send("update:check") },
      { label: "Acerca de Ruta SAA-C03", click: () => dialog.showMessageBox(win, { title: "Ruta SAA-C03", message: "Ruta SAA-C03 " + app.getVersion(), detail: "Consola de preparación para AWS Certified Solutions Architect - Associate.\nTu progreso se guarda en:\n" + DATA_FILE() }) }] }
  ]));
}

app.whenReady().then(() => { loadData(); buildMenu(); createWindow(); setupUpdates(); });
app.on("before-quit", () => { if (saveTimer) writeNow(); });
app.on("window-all-closed", () => { if (saveTimer) writeNow(); app.quit(); });
