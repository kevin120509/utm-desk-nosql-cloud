// Carga los datos de demostración (RF-14): 7 usuarios y 24 incidencias con evidencias reales
// en el bucket. Es IDEMPOTENTE: borra lo anterior y vuelve a cargar.
//
//   npm run db:seed -- --dry-run   Genera y verifica en memoria; NO toca Atlas ni Supabase.
//   npm run db:seed -- --yes       Borra usuarios, incidencias y contadores de la base y recarga.
//
// Sin --yes (ni --dry-run) no hace nada: el seed borra datos y hay que confirmarlo.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { obtenerBaseDeDatos, cerrarCliente } from "../src/infrastructure/mongo/cliente.js";
import { configurarBaseDeDatos } from "../src/infrastructure/mongo/configurarBaseDeDatos.js";
import { AlmacenSupabase } from "../src/infrastructure/almacen/almacenSupabase.js";
import { USUARIOS_DEMO, construirDatos, evidenciasFalsas } from "./seed/datos.js";
import { crearMuestras } from "./seed/archivosMuestra.js";
import { verificarConjunto, imprimirVerificacion } from "./seed/verificar.js";

const args = new Set(process.argv.slice(2));
const simulacion = args.has("--dry-run");
const confirmado = args.has("--yes");
const muestras = crearMuestras();

function resumen(incidencias) {
  const contar = (f) => {
    const r = {};
    for (const d of incidencias) r[f(d)] = (r[f(d)] ?? 0) + 1;
    return JSON.stringify(r);
  };
  console.log(`  Incidencias: ${incidencias.length}`);
  console.log(`  Por categoría: ${contar((d) => d.categoria)}`);
  console.log(`  Por estado: ${contar((d) => d.estado)}`);
  console.log(`  Por prioridad: ${contar((d) => d.prioridad)}`);
}

// --------------------------------------------------------------------------------------
// Simulación: todo en memoria, sin red.
// --------------------------------------------------------------------------------------
if (simulacion) {
  const ahora = new Date();
  const usuarios = Object.fromEntries(USUARIOS_DEMO.map((u) => [u.clave, { ...u, _id: new ObjectId() }]));
  const { incidencias, planEvidencias, contadores } = construirDatos({ ahora, usuarios });
  evidenciasFalsas(incidencias, planEvidencias, muestras);
  console.log("SIMULACIÓN (--dry-run): no se escribió nada en Atlas ni en Supabase.");
  resumen(incidencias);
  console.log(`  Contadores a crear: ${contadores.length}`);
  console.log("Verificación contra el enunciado:");
  const ok = imprimirVerificacion(verificarConjunto(incidencias, { ahora }));
  process.exit(ok ? 0 : 1);
}

if (!confirmado) {
  console.error("db:seed BORRA usuarios, incidencias y contadores de la base y los vuelve a cargar.");
  console.error("Usa --dry-run para probar sin escribir, o --yes para ejecutarlo de verdad.");
  process.exit(1);
}

// --------------------------------------------------------------------------------------
// Ejecución real
// --------------------------------------------------------------------------------------
function exigirEntorno() {
  const faltan = ["MONGODB_URI", "MONGODB_DB", "SEED_DEFAULT_PASSWORD", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter(
    (n) => !process.env[n],
  );
  if (faltan.length) throw new Error(`Faltan variables en server/.env: ${faltan.join(", ")}`);
  if (process.env.SEED_DEFAULT_PASSWORD.startsWith("cambia-esto")) {
    throw new Error("SEED_DEFAULT_PASSWORD sigue con el valor de ejemplo; cámbialo en server/.env");
  }
}

try {
  exigirEntorno();
  const ahora = new Date();
  const db = await obtenerBaseDeDatos();
  console.log(`Base: ${db.databaseName}`);

  const almacen = new AlmacenSupabase({
    url: process.env.SUPABASE_URL,
    claveSecreta: process.env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: process.env.SUPABASE_BUCKET || "evidencias",
  });
  const ttl = Number(process.env.SIGNED_URL_TTL_SECONDS) || 3600;

  // 1. Colecciones, validador e índices (idempotente).
  await configurarBaseDeDatos(db);

  // 2. Limpieza: primero los archivos del bucket de la carga anterior, luego las colecciones.
  const colInc = db.collection("incidencias_campus");
  const anteriores = await colInc.find({}, { projection: { "evidencias_adjuntas.storage_path": 1 } }).toArray();
  const rutasViejas = anteriores.flatMap((d) => (d.evidencias_adjuntas ?? []).map((e) => e.storage_path));
  for (let i = 0; i < rutasViejas.length; i += 100) {
    await almacen.eliminarArchivos(rutasViejas.slice(i, i + 100)).catch((e) => console.warn(`  aviso: ${e.message}`));
  }
  const borradas = await colInc.deleteMany({});
  await db.collection("usuarios").deleteMany({});
  await db.collection("contadores").deleteMany({});
  console.log(`Limpieza: ${borradas.deletedCount} incidencias y ${rutasViejas.length} archivos anteriores`);

  // 3. Usuarios (contraseña de SEED_DEFAULT_PASSWORD con bcrypt).
  const hash = await bcrypt.hash(process.env.SEED_DEFAULT_PASSWORD, 10);
  const docsUsuarios = USUARIOS_DEMO.map(({ clave, ...u }) => ({ ...u, password_hash: hash, activo: true }));
  const { insertedIds } = await db.collection("usuarios").insertMany(docsUsuarios);
  const usuarios = Object.fromEntries(USUARIOS_DEMO.map((u, i) => [u.clave, { ...u, _id: insertedIds[i] }]));
  console.log(`Usuarios: ${docsUsuarios.length} (${docsUsuarios.map((u) => u.rol).join(", ")})`);

  // 4. Incidencias y archivos: cada evidencia es un archivo PROPIO en el bucket
  //    (si compartieran archivo, borrar una incidencia dejaría rotas a las demás).
  const { incidencias, planEvidencias, contadores } = construirDatos({ ahora, usuarios });
  let subidos = 0;
  for (const doc of incidencias) {
    const plan = planEvidencias.get(doc.codigo) ?? [];
    for (const [i, [muestra, nombre]] of plan.entries()) {
      const { buffer, tipoMime } = muestras[muestra];
      const ruta = `${doc.codigo}/${randomUUID()}-${nombre}`;
      await almacen.subir({ ruta, buffer, tipoMime });
      const { url, expira } = await almacen.urlFirmada(ruta, ttl);
      doc.evidencias_adjuntas.push({
        nombre_archivo: nombre,
        tipo_mime: tipoMime,
        peso_kb: Math.max(0.01, Math.round((buffer.length / 1024) * 100) / 100),
        storage_path: ruta,
        url_storage: url,
        url_expira: expira,
        fecha_carga: new Date(doc.fecha_creacion.getTime() + (i + 1) * 30 * 60_000),
      });
      subidos++;
    }
  }
  console.log(`Archivos subidos al bucket: ${subidos}`);

  // 5. Inserción (aquí el $jsonSchema de Atlas valida cada documento) y contadores.
  await colInc.insertMany(incidencias);
  await db.collection("contadores").insertMany(contadores);
  console.log(`Incidencias insertadas: ${incidencias.length}; contadores: ${contadores.length}`);

  // 6. Verificación sobre lo que quedó en Atlas.
  const guardadas = await colInc.find({}).toArray();
  console.log("Verificación contra el enunciado (leyendo Atlas):");
  resumen(guardadas);
  const ok = imprimirVerificacion(verificarConjunto(guardadas, { ahora: new Date() }));
  console.log(ok ? "Seed completo." : "Seed cargado, pero hay verificaciones en FALLA.");
  process.exitCode = ok ? 0 : 1;
} catch (e) {
  console.error(`db:seed falló: ${e.message}`);
  process.exitCode = 1;
} finally {
  await cerrarCliente();
}
