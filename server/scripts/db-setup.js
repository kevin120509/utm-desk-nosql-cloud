// Crea colecciones, validador $jsonSchema e índices en la base real. No inserta datos.
// Uso: npm run db:setup
import "dotenv/config";
import { obtenerBaseDeDatos, cerrarCliente } from "../src/infrastructure/mongo/cliente.js";
import { configurarBaseDeDatos } from "../src/infrastructure/mongo/configurarBaseDeDatos.js";

try {
  const db = await obtenerBaseDeDatos();
  const resumen = await configurarBaseDeDatos(db);
  console.log(`Base: ${db.databaseName}`);
  for (const c of resumen.colecciones) console.log(`Colección ${c.nombre}: ${c.accion}`);
  for (const [col, nombres] of Object.entries(resumen.indices)) {
    console.log(`Índices de ${col}: ${nombres.join(", ")}`);
  }
} catch (e) {
  console.error(`db:setup falló: ${e.message}`);
  process.exitCode = 1;
} finally {
  await cerrarCliente();
}
