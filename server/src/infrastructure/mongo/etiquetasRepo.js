// Etiquetas de una incidencia sobre `incidencias_campus` (RF-08, CU-04).
// $addToSet agrega sin duplicar y $pull quita: ambos son operadores atómicos.

export class EtiquetasRepoMongo {
  /** @param {import("mongodb").Collection} coleccion */
  constructor(coleccion) {
    this.coleccion = coleccion;
  }

  /**
   * Agrega la etiqueta si no existe (si ya estaba, el arreglo queda igual).
   * @returns {Promise<string[] | null>} tags resultantes, o null si la incidencia no existe.
   */
  async agregar(codigo, tag, ahora) {
    const doc = await this.coleccion.findOneAndUpdate(
      { codigo },
      { $addToSet: { tags: tag }, $set: { fecha_actualizacion: ahora } },
      { returnDocument: "after", projection: { tags: 1 } },
    );
    return doc ? doc.tags : null;
  }

  /**
   * Quita la etiqueta (si no estaba, no pasa nada).
   * @returns {Promise<string[] | null>} tags resultantes, o null si la incidencia no existe.
   */
  async quitar(codigo, tag, ahora) {
    const doc = await this.coleccion.findOneAndUpdate(
      { codigo },
      { $pull: { tags: tag }, $set: { fecha_actualizacion: ahora } },
      { returnDocument: "after", projection: { tags: 1 } },
    );
    return doc ? doc.tags : null;
  }
}
