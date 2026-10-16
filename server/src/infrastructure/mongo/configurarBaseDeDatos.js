// Crea/actualiza colecciones, validador e índices. Es idempotente: se puede correr N veces.
import { validadorIncidencias } from "./validador.js";
import { indicesIncidencias, indicesUsuarios } from "./indices.js";

async function existe(db, nombre) {
  return (await db.listCollections({ name: nombre }, { nameOnly: true }).toArray()).length > 0;
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
  { coleccionIncidencias = "incidencias_campus", coleccionUsuarios = "usuarios" } = {},
) {
  const resumen = { colecciones: [], indices: {} };

  // incidencias: con validador estricto
  if (await existe(db, coleccionIncidencias)) {
    await db.command({
      collMod: coleccionIncidencias,
      validator: validadorIncidencias,
      validationLevel: "strict",
      validationAction: "error",
    });
    resumen.colecciones.push({ nombre: coleccionIncidencias, accion: "validador actualizado" });
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

  await crearIndices(db.collection(coleccionIncidencias), indicesIncidencias);
  resumen.indices[coleccionIncidencias] = indicesIncidencias.map((i) => i.name);
  await crearIndices(db.collection(coleccionUsuarios), indicesUsuarios);
  resumen.indices[coleccionUsuarios] = indicesUsuarios.map((i) => i.name);

  return resumen;
}
