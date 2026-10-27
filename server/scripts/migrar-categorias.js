// Renombra las categorías de las incidencias existentes a los nombres nuevos:
//   infraestructura -> infraestructura_fisica
//   academico       -> servicios_academicos
// No borra nada ni toca detalle_especifico (su forma no depende del nombre de la categoría).
// Uso (simulación por defecto):  npm run db:migrar-categorias
// Aplicar de verdad:             npm run db:migrar-categorias -- --yes
// IMPORTANTE: el validador $jsonSchema ya acepta solo los nombres nuevos; ejecutar esto
// ANTES de usar la API nueva contra una base con datos del seed anterior.
import "dotenv/config";
import { obtenerBaseDeDatos, cerrarCliente } from "../src/infrastructure/mongo/cliente.js";

const MAPA = { infraestructura: "infraestructura_fisica", academico: "servicios_academicos" };
const aplicar = process.argv.includes("--yes");

try {
  const db = await obtenerBaseDeDatos();
  const coleccion = db.collection("incidencias_campus");
  for (const [viejo, nuevo] of Object.entries(MAPA)) {
    const pendientes = await coleccion.countDocuments({ categoria: viejo });
    if (!aplicar) {
      console.log(`SIMULACIÓN: ${pendientes} incidencia(s) pasarían de "${viejo}" a "${nuevo}".`);
      continue;
    }
    const { modifiedCount } = await coleccion.updateMany({ categoria: viejo }, { $set: { categoria: nuevo } });
    console.log(`"${viejo}" -> "${nuevo}": ${modifiedCount} incidencia(s) actualizadas.`);
  }
  if (!aplicar) console.log("Nada se modificó. Agrega --yes para aplicar.");
} catch (e) {
  console.error(`db:migrar-categorias falló: ${e.message}`);
  process.exitCode = 1;
} finally {
  await cerrarCliente();
}
