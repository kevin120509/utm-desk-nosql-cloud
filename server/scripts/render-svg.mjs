// Convierte un SVG en PNG con Chrome headless (CDP, sin dependencias).
// Uso: node scripts/render-svg.mjs <entrada.svg> <salida.png> [ancho] [alto]
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [entrada, salida, ancho = "1800", alto = "1240"] = process.argv.slice(2);
if (!entrada || !salida) throw new Error("Uso: node render-svg.mjs entrada.svg salida.png [ancho] [alto]");
const perfil = mkdtempSync(join(tmpdir(), "utm-svg-"));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--remote-debugging-port=9335", `--user-data-dir=${perfil}`, "--hide-scrollbars", "--no-first-run", "about:blank"], { stdio: "ignore" });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, n = 0;
const pend = new Map();
const cdp = (method, params = {}) => new Promise((ok) => { const i = ++n; pend.set(i, ok); ws.send(JSON.stringify({ id: i, method, params })); });
try {
  for (let i = 0; i < 40 && !ws; i++) {
    try {
      const pag = (await (await fetch("http://127.0.0.1:9335/json")).json()).find((t) => t.type === "page");
      if (pag) {
        ws = new WebSocket(pag.webSocketDebuggerUrl);
        await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });
        ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
      }
    } catch { await esperar(250); }
  }
  await cdp("Page.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: +ancho, height: +alto, deviceScaleFactor: 1.5, mobile: false });
  await cdp("Page.navigate", { url: pathToFileURL(resolve(entrada)).href });
  await esperar(1500);
  const r = await cdp("Page.captureScreenshot", { format: "png" });
  writeFileSync(salida, Buffer.from(r.result.data, "base64"));
  console.log("PNG listo:", salida);
} finally {
  try { ws?.close(); } catch { /* ya cerrado */ }
  chrome.kill();
}
