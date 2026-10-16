// Implementación del puerto IncidenciasRepo sobre la colección `incidencias_campus`.
import { ErrorApp } from "../../application/errores.js";

// Mensaje genérico: nunca se expone el detalle de Atlas al cliente.
const ERROR_GENERICO = "Error interno del servidor";

export class IncidenciasRepoMongo {
  /** @param {import("mongodb").Collection} coleccion */
  constructor(coleccion) {
    this.coleccion = coleccion;
  }

  /** Inserta el documento y lo devuelve con su `_id`. */
  async insertar(doc) {
    try {
      const { insertedId } = await this.coleccion.insertOne(doc);
      return { ...doc, _id: insertedId };
    } catch (e) {
      // 121 = el documento no pasó el $jsonSchema (bug nuestro, no del usuario).
      // 11000 = `codigo` duplicado (índice único). Ambos son errores internos.
      if (e?.code === 121 || e?.code === 11000) {
        console.error(`IncidenciasRepo: insertOne falló (código Mongo ${e.code})`);
        throw new ErrorApp("ERROR_INTERNO", ERROR_GENERICO);
      }
      throw e;
    }
  }
}
