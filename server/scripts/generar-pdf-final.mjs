// Genera el PDF final (D06, APA 7.ª ed.) a partir de las capturas y los entregables del repositorio.
// Uso: node scripts/generar-pdf-final.mjs   → entregables/UTM-Desk-NoSQL-Cloud_Final.pdf
// Imprime con Chrome headless por CDP (sin dependencias). No lee secretos.
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "../..");
const ENT = join(RAIZ, "entregables");
const CAP = join(RAIZ, "docs", "capturas");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const docs = JSON.parse(readFileSync(join(ENT, "incidencias_campus.json"), "utf8"));
const atlas = readFileSync(join(RAIZ, "docs", "verificacion-atlas.md"), "utf8");

// Un documento de ejemplo por categoría, sin ruido (ids cortos, historial resumido a 2 entradas).
function ejemplo(cat) {
  const d = structuredClone(docs.find((x) => x.categoria === cat && x.estado === "resuelta") ?? docs.find((x) => x.categoria === cat));
  d.historial_seguimiento = d.historial_seguimiento.slice(0, 1);
  d.evidencias_adjuntas = d.evidencias_adjuntas.slice(0, 1).map((e) => ({ ...e, url_storage: "https://…/firmada", storage_path: e.storage_path }));
  return JSON.stringify(d, null, 2);
}

let nFig = 0;
const fig = (archivo, titulo, ancho = "5.4in") => {
  const ruta = join(CAP, archivo);
  if (!existsSync(ruta)) return "";
  nFig += 1;
  const b64 = readFileSync(ruta).toString("base64");
  return `<figure><p class="fig-num"><b>Figura ${nFig}</b></p><p class="fig-tit"><i>${esc(titulo)}</i></p><img style="max-width:${ancho};max-height:7.4in" src="data:image/png;base64,${b64}" alt="${esc(titulo)}"><p class="fig-nota"><i>Nota.</i> Captura propia del sistema local conectado a MongoDB Atlas y Supabase, con datos ficticios.</p></figure>`;
};
let nTab = 0;
const tabla = (titulo, cabeza, filas) => {
  nTab += 1;
  return `<div class="tabla"><p class="fig-num"><b>Tabla ${nTab}</b></p><p class="fig-tit"><i>${esc(titulo)}</i></p><table><thead><tr>${cabeza.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${filas
    .map((f) => `<tr>${f.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
};

const integrantes = ["Arroyo León Luis Diego", "Can Domínguez Víctor Emmanuel", "Montalvo Canché Emir Emanuel", "Vargas Guzmán Kevin Aarón"];

const explain = atlas
  .split("\n")
  .filter((l) => l.startsWith("- ") && l.includes("→"))
  .map((l) => l.slice(2).split(": ", 2));

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>UTM Desk NoSQL Cloud</title><style>
@page{size:Letter;margin:1in}
body{font-family:"Times New Roman",Times,serif;font-size:12pt;line-height:2;color:#000;margin:0}
p{margin:0;text-indent:.5in;text-align:left}
h1,h2,h3{font-size:12pt;margin:0;line-height:2;page-break-after:avoid}
h1{text-align:center;font-weight:bold}
h2{text-align:left;font-weight:bold}
h3{text-align:left;font-weight:bold;font-style:italic}
.portada{text-align:center;page-break-after:always;padding-top:1.6in}
.portada p{text-indent:0;text-align:center}
.portada .titulo{font-weight:bold;margin-bottom:.5in}
.pend{background:#fff3b0}
.nuevo{page-break-before:always}
ul,ol{margin:0 0 0 .5in;padding-left:.3in}
li{line-height:2}
table{border-collapse:collapse;width:100%;font-size:10pt;line-height:1.25;margin-bottom:.15in}
thead th{border-top:1px solid #000;border-bottom:1px solid #000;text-align:left;padding:3px 5px}
tbody tr:last-child td{border-bottom:1px solid #000}
td{padding:3px 5px;vertical-align:top}
.tabla{break-inside:avoid;page-break-inside:avoid;margin-top:.1in}
.tabla p,.fig-num,.fig-tit{text-indent:0;line-height:1.4}
figure{margin:.2in 0;page-break-inside:avoid;text-align:left}
figure img{display:block;border:1px solid #bbb}
.fig-nota{text-indent:0;font-size:10pt;line-height:1.3;margin-top:.05in}
pre{font-family:Consolas,"Courier New",monospace;font-size:7.6pt;line-height:1.2;background:#f6f6f6;border:1px solid #ccc;padding:6px;white-space:pre-wrap;word-break:break-word;margin:.05in 0 .15in}
code{font-family:Consolas,"Courier New",monospace;font-size:10pt}
.ref p{padding-left:.5in;text-indent:-.5in}
</style></head><body>

<section class="portada">
<p><b>Universidad Tecnológica Metropolitana</b></p>
<p>Bases de Datos en la Nube · Unidad II</p>
<p style="margin-top:.6in" class="titulo"><b>UTM Desk NoSQL Cloud: gestión de incidencias del campus con MongoDB Atlas</b></p>
<p style="margin-top:.4in">${integrantes.join("<br>")}</p>
<p style="margin-top:.4in"><span class="pend">[Carrera, grupo y cuatrimestre: completar]</span></p>
<p><span class="pend">[Nombre del docente: completar]</span></p>
<p style="margin-top:.3in">16 de octubre de 2026</p>
</section>

<h1>UTM Desk NoSQL Cloud: gestión de incidencias del campus con MongoDB Atlas</h1>

<h2>Problemática</h2>
<p>El campus recibe incidencias de tres fuentes con datos muy distintos: cómputo y redes, infraestructura física y sistemas académicos. Las hojas de cálculo y los correos dispersan la trazabilidad, no conservan la bitácora de cada intervención y no permiten medir el tiempo de resolución ni detectar fallas que se repiten en un mismo espacio. UTM Desk centraliza esas incidencias en una base documental en la nube, guarda las evidencias fuera de la base y ofrece búsqueda textual y analítica por edificio.</p>
<p>El objetivo medible fue demostrar en vivo el ciclo completo de una incidencia: alta, evidencia, seguimiento, etiquetas, búsqueda, analítica y depuración automática, sobre infraestructura desplegada en la nube y no sobre una laptop.</p>

<h2>Justificación</h2>
<p>Las tres categorías comparten campos universales (título, descripción, prioridad, ubicación, bitácora), pero cada una necesita atributos propios. En un modelo relacional esto exige una tabla por categoría o columnas casi siempre vacías, y consultar un expediente completo requiere varios <i>joins</i>. En un modelo documental, cada incidencia es un solo documento con un campo <code>detalle_especifico</code> polimórfico y con la bitácora, las etiquetas y las evidencias embebidas, de modo que el expediente se lee en una sola operación (MongoDB, Inc., s. f.-a).</p>
<p>Los archivos no se guardan en la base: MongoDB conserva solo los metadatos y la ruta del objeto en un depósito privado de Supabase Storage (Supabase, s. f.), lo que mantiene la base muy por debajo del límite de 512 MB del nivel gratuito de Atlas.</p>

<h2>Requisitos</h2>
<h3>Requisitos funcionales</h3>
${tabla(
  "Requisitos funcionales y su ruta de la API",
  ["Requisito", "Descripción", "Ruta"],
  [
    ["RF-01/02", "Registrar incidencia con validación en dos capas", "<code>POST /api/incidencias</code>"],
    ["RF-03", "Consecutivo diario atómico en la colección <code>contadores</code>", "(interno al alta)"],
    ["RF-04", "Cargar evidencia (JPEG, PNG o PDF, máximo 4 MB)", "<code>POST /api/incidencias/:codigo/evidencias</code>"],
    ["RF-05/06", "Consultar expediente y listar con filtros y paginación", "<code>GET /api/incidencias[/:codigo]</code>"],
    ["RF-07", "Cambiar estado, horas y bitácora sin condición de carrera", "<code>PATCH /api/incidencias/:codigo/estado</code>"],
    ["RF-08", "Etiquetas sin duplicados", "<code>POST|DELETE …/tags</code>"],
    ["RF-09", "Búsqueda textual en español ordenada por relevancia", "<code>GET /api/incidencias/buscar?q=</code>"],
    ["RF-10", "Analítica por edificio y etiquetas más frecuentes", "<code>GET /api/analitica/edificios|tags</code>"],
    ["RF-11", "Depuración automática a los 60 días de la resolución", "índice TTL"],
    ["RF-12", "Editar campos universales y borrar (coordinador)", "<code>PATCH|DELETE /api/incidencias/:codigo</code>"],
    ["RF-13", "Sesión con JWT y permisos por rol", "<code>POST /api/auth/login</code>"],
    ["RF-14/15", "Datos de demostración, exportables e interfaz web", "scripts y web"],
  ],
)}
<h3>Requisitos no funcionales</h3>
<p>Rendimiento (listados y búsqueda con índice), almacenamiento dentro de 512 MB, seguridad (contraseñas con bcrypt, JWT, <i>helmet</i>, CORS restringido, límite de peticiones, validación de entrada y depósito privado), integridad (validación en dos capas y cambios de estado atómicos), disponibilidad en nube, usabilidad en español y móvil, mantenibilidad (arquitectura limpia y pruebas automáticas) y entrega en formato APA 7.ª edición.</p>
<h3>Roles</h3>
${tabla(
  "Roles y permisos",
  ["Rol", "Puede"],
  [
    ["Reportante", "Crear incidencias, ver las suyas y subir evidencia a las suyas"],
    ["Técnico", "Ver todas, cambiar estado, horas y bitácora, etiquetas y evidencias"],
    ["Coordinador", "Todo lo del técnico, cerrar, editar campos universales, borrar y consultar analítica"],
    ["Directivo", "Solo lectura, búsqueda y analítica"],
  ],
)}

<h2 class="nuevo">Tecnologías y arquitectura</h2>
${tabla(
  "Tecnologías elegidas y razón",
  ["Capa", "Tecnología", "Razón"],
  [
    ["Base de datos", "MongoDB Atlas (M0)", "Modelo documental polimórfico, <code>$jsonSchema</code>, índices de texto en español y TTL (MongoDB, Inc., s. f.-b, s. f.-c)"],
    ["Archivos", "Supabase Storage (privado)", "Binarios fuera de la base y URL firmadas temporales"],
    ["API", "Node.js, Express 5, controlador nativo de MongoDB", "Contrato REST simple y control directo de las operaciones atómicas"],
    ["Validación", "Zod", "Esquemas por categoría y rechazo de campos extra y operadores NoSQL (Colin McDonnell, s. f.)"],
    ["Interfaz", "React, Vite, Tailwind CSS, Recharts", "Formulario dinámico, diseño responsivo y gráficas (Meta Platforms, s. f.)"],
    ["Pruebas", "Vitest, Supertest, Newman", "Pruebas de integración contra Atlas real y banco de pruebas Postman"],
    ["Nube", "Vercel (API y web)", "La demostración no depende de la laptop (Vercel, s. f.)"],
  ],
)}
<p>El servidor sigue una arquitectura limpia con cuatro capas: <code>domain</code> (enumeraciones, transiciones de estado y esquemas), <code>application</code> (casos de uso), <code>infrastructure</code> (repositorios de Mongo, almacén de Supabase, seguridad) e <code>interface</code> (rutas y <i>middlewares</i> de Express). Una raíz de composición conecta los puertos con sus adaptadores, lo que permite probar los casos de uso con dobles y desplegar la misma aplicación como función sin servidor.</p>
<p>Decisión acordada con el docente: el consecutivo diario se mantiene en MongoDB (colección <code>contadores</code>, operación <code>$inc</code> con <code>upsert</code>) y no en Redis, con lo que se evita una dependencia y una cuenta adicionales.</p>

<h2>Modelo de datos</h2>
<p>La colección <code>incidencias_campus</code> tiene un validador <code>$jsonSchema</code> estricto (<code>validationLevel: strict</code>, <code>validationAction: error</code>) con una rama <code>oneOf</code> por categoría para <code>detalle_especifico</code>; <code>fecha_resolucion</code> solo existe en incidencias resueltas o cerradas. Zod aplica la misma regla antes de llegar a la base, de modo que Mongo actúa como segunda línea de defensa.</p>
${tabla(
  "Índices de la colección incidencias_campus",
  ["Índice", "Clave", "Uso"],
  [
    ["<code>idx_cat_estado_edificio</code>", "categoría, estado, edificio", "Listados filtrados"],
    ["<code>idx_ttl_resolucion</code>", "fecha_resolucion (TTL de 60 días)", "Depuración automática"],
    ["<code>idx_texto_es</code>", "título (peso 10), descripción (peso 5), idioma español", "Búsqueda por relevancia"],
    ["<code>idx_codigo</code>", "código (único)", "Consulta de expediente"],
    ["<code>idx_reportante</code>", "reportante, fecha de creación descendente", "Mis incidencias"],
  ],
)}
<p>Las tres categorías, con ejemplos reales del conjunto de datos, se muestran a continuación (bitácora abreviada a su primera entrada y una evidencia).</p>
<h3>Ejemplo de cómputo y redes</h3><pre>${esc(ejemplo("computo_redes"))}</pre>
<h3>Ejemplo de infraestructura</h3><pre>${esc(ejemplo("infraestructura"))}</pre>
<h3>Ejemplo de sistemas académicos</h3><pre>${esc(ejemplo("academico"))}</pre>
<p>La base de demostración contiene 24 incidencias sintéticas distribuidas en cinco edificios o zonas, las cuatro prioridades y los cinco estados, 12 con fecha de resolución, 18 con evidencias y 26 etiquetas distintas. El script <code>db:verify</code> comprueba estas condiciones de forma automática.</p>

<h2 class="nuevo">Implementación de los casos de uso</h2>
${tabla(
  "Operaciones de MongoDB por caso de uso",
  ["Caso de uso", "Operación"],
  [
    ["CU-01 Alta", "<code>findOneAndUpdate</code> con <code>$inc</code> y <code>upsert</code> en <code>contadores</code>, luego <code>insertOne</code> validado por Zod y por <code>$jsonSchema</code>"],
    ["CU-02 Evidencia", "Tipo real por firma de bytes, subida al depósito, un <code>$push</code> en <code>evidencias_adjuntas</code>; URL firmada regenerada en cada lectura"],
    ["CU-03 Estado", "Un solo <code>updateOne</code> con filtro <code>{ codigo, estado: estadoLeido }</code>, <code>$set</code>, <code>$push</code> a la bitácora e <code>$inc</code> de horas; 409 si otra persona cambió el estado"],
    ["CU-04 Etiquetas", "<code>$addToSet</code> (normalizada a minúsculas) y <code>$pull</code>"],
    ["CU-05 Búsqueda", "<code>$text</code> con <code>score</code> proyectado con <code>$meta</code> y orden por relevancia"],
    ["CU-06 Analítica", "Pipeline 1: <code>$match</code>, <code>$addFields</code> con <code>$dateDiff</code>, <code>$group</code>, <code>$sort</code>. Pipeline 2: <code>$unwind</code>, <code>$group</code>, <code>$sort</code>, <code>$limit</code> 10"],
    ["CU-07 Depuración", "Índice TTL sobre <code>fecha_resolucion</code> con <code>expireAfterSeconds: 5184000</code>"],
  ],
)}
<p>La prueba de concurrencia lanza dos cambios de estado simultáneos contra Atlas: uno recibe 200 y el otro 409, y las horas y la bitácora quedan correctas. La demostración del TTL siembra un documento resuelto hace 61 días y otro hace 59; el primero desaparece en unos diez segundos y el segundo permanece.</p>

<h2 class="nuevo">Interfaz de usuario</h2>
<p>La interfaz está en español, usa el verde institucional con contraste verificado, objetivos táctiles de 44 px y foco visible, y funciona en móvil sin desplazamiento horizontal de la página. A continuación se presentan las pantallas principales.</p>
${fig("ui-01-login.png", "Pantalla de inicio de sesión", "5.4in")}
${fig("ui-02-lista-coordinador.png", "Lista de incidencias con filtros y paginación (rol coordinador)", "5.4in")}
${fig("ui-03-nueva-incidencia.png", "Formulario de nueva incidencia con bloque dinámico por categoría (rol reportante)", "5.4in")}
${fig("ui-04-detalle-staff.png", "Expediente con bitácora, evidencias, etiquetas y acciones de personal (rol coordinador)", "4.9in")}
${fig("ui-05-busqueda.png", "Resultados de búsqueda ordenados por relevancia", "5.4in")}
${fig("ui-06-analitica.png", "Analítica de eficiencia por edificio y fallas recurrentes (rol directivo)", "5.0in")}
${fig("ui-07-movil-lista.png", "Lista de incidencias en un teléfono", "3.0in")}
${fig("ui-08-movil-detalle.png", "Expediente en un teléfono", "3.0in")}

<h2 class="nuevo">Banco de pruebas</h2>
<p>La colección de Postman se ejecuta con Newman y cubre 63 peticiones agrupadas por caso de uso, con 125 aserciones. La última corrida contra la API local terminó con 125 de 125 aserciones correctas y 0 fallos; la misma colección también se ejecutó contra la API desplegada en Vercel con el mismo resultado. Además, 351 pruebas de Vitest se ejecutan contra Atlas y Supabase reales, usando colecciones temporales.</p>
${tabla(
  "Códigos de estado cubiertos por la colección",
  ["Código", "Situación probada"],
  [
    ["200 / 201", "Lectura, actualización, borrado y alta correctos"],
    ["400", "Campo faltante, enumeración inválida, <code>detalle_especifico</code> de otra categoría, horas fuera de rango, archivo no permitido o vacío"],
    ["401", "Sin token, token inválido o credenciales incorrectas"],
    ["403", "Rol sin permiso o reportante que consulta una incidencia ajena"],
    ["404", "Incidencia inexistente o ya depurada"],
    ["409", "Cambio de estado concurrente (probado de forma determinista en las pruebas de integración)"],
  ],
)}

<h2>Despliegue y seguridad</h2>
<p>La API y la web están desplegadas en Vercel como dos proyectos independientes que se conectan a MongoDB Atlas y a Supabase mediante variables de entorno marcadas como sensibles. Atlas usa un usuario de base de datos con permiso <code>readWrite</code> únicamente sobre la base <code>utmdesk</code>. La revisión de seguridad documentó 20 controles verificados, entre ellos contraseñas con bcrypt, JWT de 8 horas, roles validados en el servidor, límite de intentos de inicio de sesión, rechazo de operadores NoSQL por validación estricta, <i>helmet</i>, CORS restringido, depósito privado y secretos fuera del repositorio (OWASP Foundation, s. f.). Riesgos aceptados: el límite de peticiones es por instancia en el entorno sin servidor y la sesión se guarda en <code>localStorage</code>.</p>

<h2>Verificación en Atlas</h2>
<p>Con una consulta <code>explain("executionStats")</code> se comprobó que los listados, la búsqueda, el código y las incidencias del reportante usan índice:</p>
${tabla("Planes de ejecución observados en Atlas", ["Consulta", "Plan y documentos examinados"], explain.map(([a, b]) => [esc(a), esc(b)]))}

<h2 class="nuevo">Conclusiones individuales</h2>
${integrantes
  .map(
    (n) =>
      `<h3>${esc(n)}</h3><p><span class="pend">[Conclusión individual: redactar en primera persona, de 120 a 200 palabras, sobre el caso de uso defendido, lo aprendido de modelado documental y una dificultad resuelta.]</span></p>`,
  )
  .join("")}

<h1 class="nuevo">Referencias</h1>
<div class="ref">
<p>American Psychological Association. (2020). <i>Publication manual of the American Psychological Association</i> (7.ª ed.). https://doi.org/10.1037/0000165-000</p>
<p>Colin McDonnell. (s. f.). <i>Zod: TypeScript-first schema validation</i>. https://zod.dev</p>
<p>Meta Platforms. (s. f.). <i>React</i>. https://react.dev</p>
<p>MongoDB, Inc. (s. f.-a). <i>MongoDB manual</i>. https://www.mongodb.com/docs/manual/</p>
<p>MongoDB, Inc. (s. f.-b). <i>Schema validation</i>. https://www.mongodb.com/docs/manual/core/schema-validation/</p>
<p>MongoDB, Inc. (s. f.-c). <i>TTL indexes</i>. https://www.mongodb.com/docs/manual/core/index-ttl/</p>
<p>OWASP Foundation. (s. f.). <i>OWASP Top Ten</i>. https://owasp.org/www-project-top-ten/</p>
<p>Postman, Inc. (s. f.). <i>Newman: Command-line integration</i>. https://learning.postman.com/docs/collections/using-newman-cli/command-line-integration-with-newman/</p>
<p>Supabase. (s. f.). <i>Storage</i>. https://supabase.com/docs/guides/storage</p>
<p>Vercel. (s. f.). <i>Vercel documentation</i>. https://vercel.com/docs</p>
</div>
</body></html>`;

const rutaHtml = join(ENT, "UTM-Desk-NoSQL-Cloud_Final.html");
writeFileSync(rutaHtml, html);

// --- Imprimir a PDF con Chrome headless (CDP) ---
const perfil = mkdtempSync(join(tmpdir(), "utm-pdf-"));
const chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", ["--headless=new", "--remote-debugging-port=9334", `--user-data-dir=${perfil}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, n = 0;
const pend = new Map();
const cdp = (method, params = {}) => new Promise((ok) => { const i = ++n; pend.set(i, ok); ws.send(JSON.stringify({ id: i, method, params })); });
try {
  for (let i = 0; i < 40 && !ws; i++) {
    try {
      const pag = (await (await fetch("http://127.0.0.1:9334/json")).json()).find((t) => t.type === "page");
      if (pag) {
        ws = new WebSocket(pag.webSocketDebuggerUrl);
        await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });
        ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
      }
    } catch { await esperar(250); }
  }
  await cdp("Page.enable");
  await cdp("Page.navigate", { url: "file:///" + rutaHtml.replace(/\\/g, "/") });
  await esperar(2500);
  const r = await cdp("Page.printToPDF", {
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `<div style="font:12px 'Times New Roman';width:100%;text-align:right;padding-right:1in"><span class="pageNumber"></span></div>`,
    footerTemplate: "<div></div>",
    paperWidth: 8.5,
    paperHeight: 11,
    marginTop: 1,
    marginBottom: 1,
    marginLeft: 1,
    marginRight: 1,
    preferCSSPageSize: false,
  });
  if (!r.result?.data) throw new Error("printToPDF falló: " + JSON.stringify(r.error ?? r));
  writeFileSync(join(ENT, "UTM-Desk-NoSQL-Cloud_Final.pdf"), Buffer.from(r.result.data, "base64"));
  console.log("PDF listo: entregables/UTM-Desk-NoSQL-Cloud_Final.pdf");
} finally {
  try { ws?.close(); } catch { /* ya cerrado */ }
  chrome.kill();
}
