// Evidencia de R04 en solo lectura: índices, validador y planes de ejecución (explain) en Atlas.
// Uso: node scripts/db-explain.js   (no imprime secretos ni modifica datos)
import "dotenv/config";
import { obtenerBaseDeDatos, cerrarCliente } from "../src/infrastructure/mongo/cliente.js";

// Recorre el plan y junta los nombres de etapa (IXSCAN, TEXT_MATCH, COLLSCAN…).
function etapas(plan, acc = []) {
  if (!plan || typeof plan !== "object") return acc;
  if (plan.stage) acc.push(plan.stage + (plan.indexName ? `(${plan.indexName})` : ""));
  for (const clave of ["inputStage", "inputStages", "queryPlan"]) {
    const v = plan[clave];
    if (Array.isArray(v)) v.forEach((x) => etapas(x, acc));
    else if (v) etapas(v, acc);
  }
  return acc;
}

try {
  const db = await obtenerBaseDeDatos();
  const col = db.collection("incidencias_campus");

  console.log(`## Índices de incidencias_campus`);
  for (const i of await col.indexes()) {
    const extra = [i.unique && "único", i.expireAfterSeconds !== undefined && `TTL ${i.expireAfterSeconds}s`, i.default_language && `idioma ${i.default_language}`]
      .filter(Boolean)
      .join(", ");
    console.log(`- ${i.name}: ${JSON.stringify(i.key ?? i.weights)}${extra ? ` (${extra})` : ""}`);
  }

  const info = (await db.listCollections({ name: "incidencias_campus" }).toArray())[0];
  const v = info?.options;
  console.log(`\n## Validador`);
  console.log(`- validationLevel: ${v?.validationLevel}, validationAction: ${v?.validationAction}`);
  console.log(`- bsonType raíz: ${v?.validator?.$jsonSchema?.bsonType}, requeridos: ${v?.validator?.$jsonSchema?.required?.join(", ")}`);

  const consultas = [
    ["Listado filtrado (categoría + estado + edificio)", { categoria: "infraestructura", estado: "abierta", "ubicacion.edificio": "Edificio A" }, null],
    ["Búsqueda de texto «filtración»", { $text: { $search: "filtración" } }, null],
    ["Código único", { codigo: "INC-2026-0001" }, null],
    ["Mis incidencias (reportante)", { "reportante.usuario_id": (await col.findOne({}))?.reportante?.usuario_id }, { fecha_creacion: -1 }],
  ];
  console.log(`\n## Planes de ejecución (explain executionStats)`);
  for (const [titulo, filtro, orden] of consultas) {
    let cursor = col.find(filtro);
    if (orden) cursor = cursor.sort(orden);
    const e = await cursor.explain("executionStats");
    const ganador = e.queryPlanner.winningPlan;
    const s = e.executionStats;
    console.log(`- ${titulo}: ${etapas(ganador).join(" → ")} · examinados ${s.totalDocsExamined} docs / ${s.totalKeysExamined} claves · devueltos ${s.nReturned}`);
  }
} catch (e) {
  console.error(`db-explain falló: ${e.message}`);
  process.exitCode = 1;
} finally {
  await cerrarCliente();
}
