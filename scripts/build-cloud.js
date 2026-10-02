// Empaqueta cloud/cloud.js (Amplify) en src/vendor/cloud.js para que la app lo cargue sin bundler.
// Usa amplify_outputs.json si existe (lo genera Amplify al desplegar el backend); si no, la app queda solo en local.
const fs = require("fs"), path = require("path"), esbuild = require("esbuild");
const ROOT = path.join(__dirname, "..");
const outputsFile = path.join(ROOT, "amplify_outputs.json");
const hasOutputs = fs.existsSync(outputsFile);

esbuild.build({
  entryPoints: [path.join(ROOT, "cloud", "cloud.js")],
  outfile: path.join(ROOT, "src", "vendor", "cloud.js"),
  bundle: true, format: "iife", platform: "browser", target: "es2020", minify: true, legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"', global: "globalThis" },
  plugins: [{
    name: "amplify-outputs",
    setup(b) {
      b.onResolve({ filter: /^amplify-outputs$/ }, () => ({ path: "amplify-outputs", namespace: "ao" }));
      b.onLoad({ filter: /.*/, namespace: "ao" }, () => ({ contents: hasOutputs ? fs.readFileSync(outputsFile, "utf8") : "null", loader: "json" }));
    }
  }]
}).then(() => {
const kb = Math.round(fs.statSync(path.join(ROOT, "src", "vendor", "cloud.js")).size / 1024);
console.log(`src/vendor/cloud.js listo (${kb} KB) · ${hasOutputs ? "conectado al backend" : "sin amplify_outputs.json: solo modo local"}`);
}).catch(e => { console.error(e.message); process.exit(1); });
