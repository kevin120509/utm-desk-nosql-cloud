// Crea/actualiza colecciones, validador e índices. Es idempotente: se puede correr N veces.
import { validadorIncidencias } from "./validador.js";
import { indicesIncidencias, indicesUsuarios, indicesBitacora } from "./indices.js";

async function existe(db, nombre) {
  return (await db.listCollections({ name: nombre }, { nameOnly: true }).toArray()).length > 0;
}

// Opciones de la colección (validador, nivel, acción) o null si no existe.
async function opcionesDe(db, nombre) {
  const [info] = await db.listCollections({ name: nombre }).toArray();
  return info ? (info.options ?? {}) : null;
}

// JSON con las claves ordenadas, para comparar dos validadores sin depender del orden.
function jsonEstable(valor) {
  const ordenar = (v) =>
    Array.isArray(v)
      ? v.map(ordenar)
      : v && typeof v === "object" && v.constructor === Object
        ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, ordenar(v[k])]))
        : v;
  return JSON.stringify(ordenar(valor ?? null));
}

async function crearIndices(coleccion, indices) {
  try {
    await coleccion.createIndexes(indices);
  } catch (e) {
    // 85 = IndexOptionsConflict, 86 = IndexKeySpecsConflict
    if (e.code === 85 || e.code === 86) {
      throw new Error(
        `Un índice de "${coleccion.collectionName}" ya existe con otra definición (${e.message}). ` +
          "No se borra automáticamente: elimínalo a mano si quieres recrearlo.",
      );
    }
    throw e;
  }
}

export async function configurarBaseDeDatos(
  db,
  { coleccionIncidencias = "incidencias_campus", coleccionUsuarios = "usuarios", coleccionBitacora = "bitacora" } = {},
) {
  const resumen = { colecciones: [], indices: {} };

  // incidencias: con validador estricto
  const actual = await opcionesDe(db, coleccionIncidencias);
  if (actual) {
    // Solo se llama a collMod si el validador cambió. El usuario de la aplicación tiene el
    // mínimo privilegio (readWrite) y NO puede hacer collMod: si el validador ya está al día,
    // el script debe poder correr igual (por ejemplo, desde `db:seed`).
    const alDia =
      actual.validationLevel === "strict" &&
      actual.validationAction === "error" &&
      jsonEstable(actual.validator) === jsonEstable(validadorIncidencias);
    if (alDia) {
      resumen.colecciones.push({ nombre: coleccionIncidencias, accion: "validador al día" });
    } else {
      try {
        await db.command({
          collMod: coleccionIncidencias,
          validator: validadorIncidencias,
          validationLevel: "strict",
          validationAction: "error",
        });
      } catch (e) {
        if (e.code === 13 || e.codeName === "Unauthorized") {
          throw new Error(
            `El validador de "${coleccionIncidencias}" cambió pero el usuario de la aplicación no puede ` +
              "ejecutar collMod (mínimo privilegio). Actualízalo con un usuario administrador de Atlas.",
          );
        }
        throw e;
      }
      resumen.colecciones.push({ nombre: coleccionIncidencias, accion: "validador actualizado" });
    }
  } else {
    await db.createCollection(coleccionIncidencias, {
      validator: validadorIncidencias,
      validationLevel: "strict",
      validationAction: "error",
    });
    resumen.colecciones.push({ nombre: coleccionIncidencias, accion: "creada" });
  }

  // usuarios: sin validador (lo valida Zod); solo se asegura que exista
  if (await existe(db, coleccionUsuarios)) {
    resumen.colecciones.push({ nombre: coleccionUsuarios, accion: "ya existía" });
  } else {
    await db.createCollection(coleccionUsuarios);
    resumen.colecciones.push({ nombre: coleccionUsuarios, accion: "creada" });
  }

  // bitacora: solo se agrega (sin validador); se asegura que exista
  if (await existe(db, coleccionBitacora)) {
    resumen.colecciones.push({ nombre: coleccionBitacora, accion: "ya existía" });
  } else {
    await db.createCollection(coleccionBitacora);
    resumen.colecciones.push({ nombre: coleccionBitacora, accion: "creada" });
  }

  await crearIndices(db.collection(coleccionIncidencias), indicesIncidencias);
  resumen.indices[coleccionIncidencias] = indicesIncidencias.map((i) => i.name);
  await crearIndices(db.collection(coleccionUsuarios), indicesUsuarios);
  resumen.indices[coleccionUsuarios] = indicesUsuarios.map((i) => i.name);
  await crearIndices(db.collection(coleccionBitacora), indicesBitacora);
  resumen.indices[coleccionBitacora] = indicesBitacora.map((i) => i.name);

  return resumen;
}
