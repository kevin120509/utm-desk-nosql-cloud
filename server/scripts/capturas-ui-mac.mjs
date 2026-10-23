// Capturas nítidas de la UI local para el PDF final (D03). Usa Chrome headless por CDP, sin dependencias.
// Requiere API (4000) y web (5173) corriendo. Uso: node scripts/capturas-ui.mjs
// La contraseña de demo se lee de server/.env en tiempo de ejecución y nunca se imprime.
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "../..");
const SALIDA = join(RAIZ, "docs", "capturas");
mkdirSync(SALIDA, { recursive: true });

const env = Object.fromEntries(
  readFileSync(join(RAIZ, "server", ".env"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const CLAVE = env.SEED_DEFAULT_PASSWORD;
const CORREOS = {
  reportante: "ana.pech@utmetropolitana.edu.mx",
  tecnico: "luis.cauich@utmetropolitana.edu.mx",
  coordinador: "roberto.mena@utmetropolitana.edu.mx",
  directivo: "laura.cetina@utmetropolitana.edu.mx",
};
const WEB = "http://localhost:5173";

async function sesion(rol) {
  const r = await fetch("http://localhost:4000/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ correo: CORREOS[rol], password: CLAVE }),
  });
  if (!r.ok) throw new Error(`login ${rol}: ${r.status}`);
  const d = await r.json();
  return { token: d.token, usuario: d.usuario };
}

const perfil = mkdtempSync(join(tmpdir(), "utm-cap-"));
const chrome = spawn(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ["--headless=new", "--remote-debugging-port=9333", `--user-data-dir=${perfil}`, "--hide-scrollbars", "--no-first-run", "about:blank"],
  { stdio: "ignore" },
);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

let ws, id = 0;
const pendientes = new Map();
async function conectar() {
  for (let i = 0; i < 40; i++) {
    try {
      const lista = await (await fetch("http://127.0.0.1:9333/json")).json();
      const pag = lista.find((t) => t.type === "page");
      if (pag) {
        ws = new WebSocket(pag.webSocketDebuggerUrl);
        await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });
        ws.onmessage = (m) => {
          const d = JSON.parse(m.data);
          if (d.id && pendientes.has(d.id)) { pendientes.get(d.id)(d); pendientes.delete(d.id); }
        };
        return;
      }
    } catch { /* aún no arranca */ }
    await esperar(250);
  }
  throw new Error("Chrome no abrió el puerto de depuración");
}
const cdp = (method, params = {}) => new Promise((ok) => { const n = ++id; pendientes.set(n, ok); ws.send(JSON.stringify({ id: n, method, params })); });

async function tomar(nombre, ruta, rol, { ancho = 1280, alto = 800, movil = false, completa = true, pausa = 1800 } = {}) {
  await cdp("Emulation.setDeviceMetricsOverride", { width: ancho, height: alto, deviceScaleFactor: movil ? 2 : 1.5, mobile: movil });
  await cdp("Page.navigate", { url: `${WEB}/login` });
  await esperar(1200);
  const s = rol ? JSON.stringify(await sesion(rol)) : null;
  await cdp("Runtime.evaluate", { expression: s ? `localStorage.setItem("utm-desk-sesion", ${JSON.stringify(s)})` : `localStorage.removeItem("utm-desk-sesion")` });
  await cdp("Page.navigate", { url: `${WEB}${ruta}` });
  await esperar(pausa);
  const alt = (await cdp("Runtime.evaluate", { expression: "Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)" })).result.result.value;
  const clip = completa ? { x: 0, y: 0, width: ancho, height: Math.min(alt, 2400), scale: 1 } : undefined;
  const r = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: completa, ...(clip && { clip }) });
  writeFileSync(join(SALIDA, `${nombre}.png`), Buffer.from(r.result.data, "base64"));
  console.log("ok", nombre);
}

try {
  await conectar();
  await cdp("Page.enable");
  await tomar("ui-01-login", "/login", null, { completa: false, alto: 760 });
  await tomar("ui-02-lista-coordinador", "/incidencias", "coordinador");
  await tomar("ui-03-nueva-incidencia", "/incidencias/nueva", "reportante");
  await tomar("ui-04-detalle-staff", "/incidencias/INC-2026-0001", "coordinador");
  await tomar("ui-05-busqueda", "/incidencias?q=filtraci%C3%B3n", "coordinador");
  await tomar("ui-06-analitica", "/analitica", "directivo", { pausa: 3500 });
  await tomar("ui-07-movil-lista", "/incidencias", "reportante", { ancho: 390, alto: 844, movil: true });
  await tomar("ui-08-movil-detalle", "/incidencias/INC-2026-0024", "coordinador", { ancho: 390, alto: 844, movil: true });
  // Vistas por rol (comparativa)
  await tomar("ui-09-lista-reportante", "/incidencias", "reportante");
  await tomar("ui-10-detalle-reportante", "/incidencias/INC-2026-0019", "reportante");
  await tomar("ui-11-detalle-tecnico", "/incidencias/INC-2026-0022", "tecnico");
  await tomar("ui-12-detalle-coordinador", "/incidencias/INC-2026-0024", "coordinador");
  await tomar("ui-13-detalle-directivo", "/incidencias/INC-2026-0022", "directivo");
  await tomar("ui-14-lista-directivo", "/incidencias", "directivo");
} finally {
  try { ws?.close(); } catch { /* ya cerrado */ }
  chrome.kill();
}
