// Migra Atlas al renombre de categorías:
//   infraestructura -> infraestructura_fisica
//   academico       -> servicios_academicos
//
// Pasos (en este orden, para que el validador nunca rechace un documento a medio migrar):
//   1. Validador de transición: acepta claves viejas Y nuevas.
//   2. Incidencias: renombra `categoria` (no toca detalle_especifico: su forma no cambia).
//   3. Contadores diarios: copia cada contador viejo a su clave nueva con $max (así el
//      consecutivo del día no se reinicia). Los documentos viejos se conservan.
//   4. Catálogos: renombra la `clave` de las categorías si la colección ya tiene datos.
//   5. Validador final: solo las claves nuevas (el mismo que usa `db:setup`).
//   6. Verificación: no debe quedar ninguna incidencia ni catálogo con clave vieja.
// Es idempotente: correrlo dos veces no cambia nada la segunda.
//
// Uso:
//   npm run db:migrar-categorias              Simulación: solo cuenta, no escribe nada.
//   npm run db:migrar-categorias -- --yes     Aplica la migración.
//
// `collMod` necesita un usuario con permiso dbAdmin. Si existe MONGODB_URI_ADMIN se usa esa
// conexión; si no, MONGODB_URI (que con el usuario de mínimo privilegio fallará en el paso 1,
// ANTES de modificar datos).
import "dotenv/config";
import { MongoClient } from "mongodb";
import { validadorIncidencias } from "../src/infrastructure/mongo/validador.js";

export const MAPA = { infraestructura: "infraestructura_fisica", academico: "servicios_academicos" };

/** Validador de transición: el final, pero cada clave nueva también acepta su nombre viejo. */
export function validadorTransicion() {
  const v = structuredClone(validadorIncidencias);
  const props = v.$jsonSchema.properties;
  props.categoria.enum = [...new Set([...props.categoria.enum, ...Object.keys(MAPA)])];
  const viejoDe = Object.fromEntries(Object.entries(MAPA).map(([viejo, nuevo]) => [nuevo, viejo]));
  for (const rama of buscarOneOf(v)) {
    for (const opcion of rama) {
      const e = opcion?.properties?.categoria?.enum;
      if (Array.isArray(e) && e.length === 1 && viejoDe[e[0]]) e.push(viejoDe[e[0]]);
    }
  }
  return v;
}

function buscarOneOf(nodo, encontrados = []) {
  if (Array.isArray(nodo)) nodo.forEach((n) => buscarOneOf(n, encontrados));
  else if (nodo && typeof nodo === "object") {
    for (const [k, valor] of Object.entries(nodo)) {
      if (k === "oneOf" && Array.isArray(valor)) encontrados.push(valor);
      buscarOneOf(valor, encontrados);
    }
  }
  return encontrados;
}

async function conteos(db) {
  const inc = db.collection("incidencias_campus");
  const porCategoria = Object.fromEntries(
    (await inc.aggregate([{ $group: { _id: "$categoria", n: { $sum: 1 } } }]).toArray()).map((f) => [f._id, f.n]),
  );
  const catalogosViejos = await db.collection("catalogos").countDocuments({ tipo: "categoria", clave: { $in: Object.keys(MAPA) } });
  const contadoresViejos = await db
    .collection("contadores")
    .countDocuments({ _id: { $regex: `^contador:incidencias:\\d{4}-\\d{2}-\\d{2}:(${Object.keys(MAPA).join("|")})$` } });
  return { porCategoria, catalogosViejos, contadoresViejos };
}

async function collMod(db, validator) {
  await db.command({ collMod: "incidencias_campus", validator, validationLevel: "strict", validationAction: "error" });
}

async function main() {
  const aplicar = process.argv.includes("--yes");
  const uri = process.env.MONGODB_URI_ADMIN || process.env.MONGODB_URI;
  if (!uri || !process.env.MONGODB_DB) throw new Error("Faltan MONGODB_URI (o MONGODB_URI_ADMIN) y MONGODB_DB");
  const cliente = new MongoClient(uri);
  await cliente.connect();
  try {
    const db = cliente.db(process.env.MONGODB_DB);
    const antes = await conteos(db);
    console.log("Antes:", JSON.stringify(antes));
    if (!aplicar) {
      console.log("SIMULACIÓN: no se modificó nada. Agrega --yes para aplicar.");
      return;
    }

    // 1. Transición. Si el usuario no puede hacer collMod, se detiene aquí sin tocar datos.
    try {
      await collMod(db, validadorTransicion());
    } catch (e) {
      // Atlas responde Unauthorized (13) o AtlasError (8000) cuando el usuario no tiene dbAdmin.
      if (e.code === 13 || e.codeName === "Unauthorized" || e.code === 8000 || e.codeName === "AtlasError") {
        throw new Error("El usuario no puede ejecutar collMod. Define MONGODB_URI_ADMIN con un usuario dbAdmin. No se modificó ningún dato.");
      }
      throw e;
    }
    console.log("1. Validador de transición aplicado.");

    // 2. Incidencias.
    for (const [viejo, nuevo] of Object.entries(MAPA)) {
      const { modifiedCount } = await db.collection("incidencias_campus").updateMany({ categoria: viejo }, { $set: { categoria: nuevo } });
      console.log(`2. "${viejo}" -> "${nuevo}": ${modifiedCount} incidencia(s).`);
    }

    // 3. Contadores diarios.
    const contadores = db.collection("contadores");
    const viejos = await contadores
      .find({ _id: { $regex: `^contador:incidencias:\\d{4}-\\d{2}-\\d{2}:(${Object.keys(MAPA).join("|")})$` } })
      .toArray();
    for (const c of viejos) {
      const [, , fecha, cat] = c._id.split(":");
      await contadores.updateOne({ _id: `contador:incidencias:${fecha}:${MAPA[cat]}` }, { $max: { valor: c.valor } }, { upsert: true });
    }
    console.log(`3. ${viejos.length} contador(es) diario(s) copiados a su clave nueva.`);

    // 4. Catálogos (solo si ya se sembraron).
    for (const [viejo, nuevo] of Object.entries(MAPA)) {
      const yaExiste = await db.collection("catalogos").countDocuments({ tipo: "categoria", clave: nuevo });
      // Si ya existe la clave nueva, la vieja queda desactivada con otra clave (no se borra nada).
      const cambio = yaExiste ? { clave: `${viejo}_migrada`, activo: false } : { clave: nuevo };
      await db.collection("catalogos").updateMany({ tipo: "categoria", clave: viejo }, { $set: cambio });
    }
    console.log("4. Catálogos revisados.");

    // 5. Validador final.
    await collMod(db, validadorIncidencias);
    console.log("5. Validador final aplicado (solo claves nuevas).");

    // 6. Verificación.
    const despues = await conteos(db);
    console.log("Después:", JSON.stringify(despues));
    const n = (conteo, k) => conteo.porCategoria[k] ?? 0;
    const total = (conteo) => Object.values(conteo.porCategoria).reduce((a, b) => a + b, 0);
    const quedanViejas = Object.keys(MAPA).some((k) => n(despues, k) > 0) || despues.catalogosViejos > 0;
    // Cada categoría nueva debe tener exactamente lo que tenía la vieja más lo que ya tenía la nueva.
    const conteoIncorrecto = Object.entries(MAPA).some(([viejo, nuevo]) => n(despues, nuevo) !== n(antes, viejo) + n(antes, nuevo));
    if (quedanViejas || conteoIncorrecto || total(despues) !== total(antes)) {
      throw new Error("La verificación falló: revisa los conteos de arriba.");
    }
    console.log("6. Verificación correcta.");
  } finally {
    await cliente.close();
  }
}

// Solo se ejecuta al llamarlo como script (las pruebas importan las funciones).
if (process.argv[1]?.endsWith("migrar-categorias.js")) {
  main().catch((e) => {
    console.error(`db:migrar-categorias falló: ${e.message}`);
    process.exitCode = 1;
  });
}
