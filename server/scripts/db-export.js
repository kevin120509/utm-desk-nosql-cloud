// Exporta los entregables de base de datos (solo lectura sobre Atlas):
//   entregables/incidencias_campus.json   Documentos en JSON extendido (como mongoexport).
//   entregables/script-maestro.js         Script de mongosh que reproduce colección, índices y datos.
// Uso: npm run db:export
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { obtenerBaseDeDatos, cerrarCliente } from "../src/infrastructure/mongo/cliente.js";
import { validadorIncidencias } from "../src/infrastructure/mongo/validador.js";
import { indicesIncidencias, indicesUsuarios } from "../src/infrastructure/mongo/indices.js";
import { aJsonExtendido, sinTokensEnUrls } from "./export/serializar.js";
import { generarScriptMaestro } from "./export/scriptMaestro.js";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const carpeta = resolve(raiz, "entregables");

try {
  const db = await obtenerBaseDeDatos();
  // Más antiguas primero: el JSON y el script quedan en orden cronológico.
  const leidas = await db.collection("incidencias_campus").find({}).sort({ fecha_creacion: 1, _id: 1 }).toArray();
  // Sin tokens de URLs firmadas: el entregable no debe llevar enlaces con acceso al bucket.
  const incidencias = sinTokensEnUrls(leidas);
  if (incidencias.length === 0) throw new Error("La colección está vacía: corre `npm run db:seed -- --yes` primero.");

  await mkdir(carpeta, { recursive: true });
  const rutaJson = resolve(carpeta, "incidencias_campus.json");
  await writeFile(rutaJson, JSON.stringify(incidencias.map(aJsonExtendido), null, 2) + "\n", "utf8");

  const script = generarScriptMaestro({
    incidencias,
    validador: validadorIncidencias,
    indicesIncidencias,
    indicesUsuarios,
    nombreBd: db.databaseName,
  });
  const rutaScript = resolve(carpeta, "script-maestro.js");
  await writeFile(rutaScript, script, "utf8");

  console.log(`Base: ${db.databaseName} — ${incidencias.length} incidencias`);
  console.log(`Escrito: ${rutaJson}`);
  console.log(`Escrito: ${rutaScript}`);
} catch (e) {
  console.error(`db:export falló: ${e.message}`);
  process.exitCode = 1;
} finally {
  await cerrarCliente();
}
