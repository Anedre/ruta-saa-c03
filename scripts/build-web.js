// Arma la versión web en www/ (la que publica Amplify y la que empaqueta Capacitor para Android):
// copia src/, trae las fuentes desde node_modules y genera el service worker con la lista de archivos.
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const ROOT = path.join(__dirname, ".."), SRC = path.join(ROOT, "src"), OUT = path.join(ROOT, "www");
const pkg = require(path.join(ROOT, "package.json"));

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SRC, OUT, { recursive: true, filter: p => !/sw\.template\.js$/.test(p) });

// fuentes: solo los .woff2 que usan las hojas de estilo
const FONTS = [
  ["@fontsource-variable/outfit", "index.css", "outfit"],
  ["@fontsource-variable/nunito", "index.css", "nunito"],
  ["@fontsource/ibm-plex-mono", "500.css", "plex-mono"]
];
for (const [pkgName, css, dir] of FONTS) {
  const from = path.join(ROOT, "node_modules", pkgName), to = path.join(OUT, "fonts", dir);
  fs.mkdirSync(path.join(to, "files"), { recursive: true });
  const text = fs.readFileSync(path.join(from, css), "utf8").replace(/,\s*url\([^)]*\.woff\)\s*format\(['"]woff['"]\)/g, "");
  fs.writeFileSync(path.join(to, css), text);
  for (const m of text.matchAll(/url\(\.\/files\/([^)]+\.woff2)\)/g)) fs.copyFileSync(path.join(from, "files", m[1]), path.join(to, "files", m[1]));
}
let html = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
for (const [pkgName, css, dir] of FONTS) html = html.replace(`../node_modules/${pkgName}/${css}`, `fonts/${dir}/${css}`);
if (html.includes("node_modules")) throw new Error("index.html todavía apunta a node_modules");
fs.writeFileSync(path.join(OUT, "index.html"), html);

// service worker: precarga todos los archivos; la versión cambia con su contenido
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else files.push(path.relative(OUT, p).split(path.sep).join("/")); } })(OUT);
const hash = crypto.createHash("sha256"); for (const f of files.sort()) hash.update(f).update(fs.readFileSync(path.join(OUT, f)));
const version = pkg.version + "-" + hash.digest("hex").slice(0, 10);
const sw = fs.readFileSync(path.join(SRC, "sw.template.js"), "utf8").replace("__VERSION__", version).replace("__FILES__", JSON.stringify(["./", ...files.filter(f => f !== "sw.js")]));
fs.writeFileSync(path.join(OUT, "sw.js"), sw);
fs.writeFileSync(path.join(OUT, "version.json"), JSON.stringify({ version: pkg.version, build: version }));
console.log(`www/ listo: ${files.length} archivos · versión ${version}`);
