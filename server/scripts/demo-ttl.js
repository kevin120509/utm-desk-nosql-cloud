// Demostración en vivo del TTL (CU-07 / RF-11) sin esperar 60 días.
//
//   npm run demo:ttl                Inserta una incidencia resuelta hace 61 días y otra hace 59,
//                                   espera a que Atlas depure la de 61 y comprueba que la de 59 queda.
//   npm run demo:ttl -- --conservar Deja la de 59 días al terminar (por defecto se borra).
//
// Atlas revisa los índices TTL aproximadamente cada 60 segundos, por eso puede tardar ~1-2 minutos.
// Solo toca los dos códigos reservados de la demostración (consecutivos 9061 y 9059).
import "dotenv/config";
import { obtenerBaseDeDatos, cerrarCliente } from "../src/infrastructure/mongo/cliente.js";
import { construirDocumentosTtl } from "./seed/ttl.js";

const conservar = process.argv.includes("--conservar");
const LIMITE_MS = 180_000;
const CADA_MS = 10_000;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const db = await obtenerBaseDeDatos();
  const col = db.collection("incidencias_campus");
  const { viejo, reciente } = construirDocumentosTtl(new Date());

  // Limpia restos de una corrida anterior y confirma que el índice TTL existe.
  await col.deleteMany({ codigo: { $in: [viejo.codigo, reciente.codigo] } });
  const ttl = (await col.indexes()).find((i) => i.name === "idx_ttl_resolucion");
  if (!ttl || ttl.expireAfterSeconds !== 5_184_000) {
    throw new Error("Falta el índice idx_ttl_resolucion de 60 días: corre `npm run db:setup`");
  }
  console.log(`Índice TTL: ${ttl.name} (expireAfterSeconds ${ttl.expireAfterSeconds} = 60 días)`);

  await col.insertMany([viejo, reciente]);
  console.log(`Insertadas:`);
  console.log(`  ${viejo.codigo}  fecha_resolucion ${viejo.fecha_resolucion.toISOString()}  (hace 61 días)`);
  console.log(`  ${reciente.codigo}  fecha_resolucion ${reciente.fecha_resolucion.toISOString()}  (hace 59 días)`);
  console.log("Esperando el barrido del TTL de Atlas (se revisa cada ~60 s)…");

  const inicio = Date.now();
  let depurado = false;
  while (Date.now() - inicio < LIMITE_MS) {
    await pausa(CADA_MS);
    const sigue = await col.countDocuments({ codigo: viejo.codigo });
    const seg = Math.round((Date.now() - inicio) / 1000);
    console.log(`  ${String(seg).padStart(3)} s: ${viejo.codigo} ${sigue ? "todavía existe" : "YA NO EXISTE"}`);
    if (!sigue) {
      depurado = true;
      break;
    }
  }

  const sigueReciente = (await col.countDocuments({ codigo: reciente.codigo })) === 1;
  console.log(`${depurado ? "OK  " : "FALLA"} el de 61 días ${depurado ? "fue depurado automáticamente" : "NO se depuró en 3 minutos"}`);
  console.log(`${sigueReciente ? "OK  " : "FALLA"} el de 59 días ${sigueReciente ? "permanece" : "desapareció (no debería)"}`);

  if (!conservar) {
    await col.deleteMany({ codigo: { $in: [viejo.codigo, reciente.codigo] } });
    console.log("Limpieza: documentos de la demostración eliminados.");
  } else {
    console.log(`Se conservó ${reciente.codigo} (bórralo con la API o con deleteOne cuando quieras).`);
  }
  process.exitCode = depurado && sigueReciente ? 0 : 1;
} catch (e) {
  console.error(`demo:ttl falló: ${e.message}`);
  process.exitCode = 1;
} finally {
  await cerrarCliente();
}
