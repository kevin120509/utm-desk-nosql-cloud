// Verifica en solo lectura que los datos de Atlas cumplen lo que exige el enunciado.
// Uso: npm run db:verify
import "dotenv/config";
import { obtenerBaseDeDatos, cerrarCliente } from "../src/infrastructure/mongo/cliente.js";
import { verificarConjunto, imprimirVerificacion } from "./seed/verificar.js";

try {
  const db = await obtenerBaseDeDatos();
  const docs = await db.collection("incidencias_campus").find({}).toArray();
  console.log(`Base: ${db.databaseName} — ${docs.length} incidencias`);
  if (docs.length === 0) {
    console.log("La colección está vacía: corre `npm run db:seed -- --yes` primero.");
    process.exitCode = 1;
  } else {
    process.exitCode = imprimirVerificacion(verificarConjunto(docs)) ? 0 : 1;
  }
} catch (e) {
  console.error(`db:verify falló: ${e.message}`);
  process.exitCode = 1;
} finally {
  await cerrarCliente();
}
