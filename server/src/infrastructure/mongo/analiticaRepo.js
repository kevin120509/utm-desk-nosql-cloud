// Analítica sobre `incidencias_campus` (RF-10, CU-06): los dos pipelines del plan §7.
// Solo lectura: nunca modifica documentos.

// Redondeo a 2 decimales (el $avg de Mongo devuelve decimales largos).
const redondear = (n) => Math.round((n ?? 0) * 100) / 100;

export class AnaliticaRepoMongo {
  /** @param {import("mongodb").Collection} coleccion */
  constructor(coleccion) {
    this.coleccion = coleccion;
  }

  /**
   * Pipeline 1: eficiencia por edificio (solo resueltas y cerradas).
   * @returns {Promise<{edificio: string, promedio_horas_resolucion: number, total_horas_trabajo: number, total_incidencias: number}[]>}
   */
  async eficienciaPorEdificio() {
    const filas = await this.coleccion
      .aggregate([
        { $match: { estado: { $in: ["resuelta", "cerrada"] }, fecha_resolucion: { $exists: true } } },
        {
          $addFields: {
            horas_transcurridas: {
              $dateDiff: { startDate: "$fecha_creacion", endDate: "$fecha_resolucion", unit: "hour" },
            },
          },
        },
        {
          $group: {
            _id: "$ubicacion.edificio",
            promedio_horas_resolucion: { $avg: "$horas_transcurridas" },
            total_horas_trabajo: { $sum: "$horas_invertidas" },
            total_incidencias: { $sum: 1 },
          },
        },
        // Descendente por promedio; el _id desempata para que el orden sea estable.
        { $sort: { promedio_horas_resolucion: -1, _id: 1 } },
      ])
      .toArray();
    return filas.map((f) => ({
      edificio: f._id,
      promedio_horas_resolucion: redondear(f.promedio_horas_resolucion),
      total_horas_trabajo: redondear(f.total_horas_trabajo),
      total_incidencias: f.total_incidencias,
    }));
  }

  /**
   * Pipeline 2: las 10 etiquetas más usadas y los edificios donde aparecen.
   * @returns {Promise<{tag: string, total: number, edificios: string[]}[]>}
   */
  async topTags() {
    const filas = await this.coleccion
      .aggregate([
        { $unwind: "$tags" },
        { $group: { _id: "$tags", total: { $sum: 1 }, edificios: { $addToSet: "$ubicacion.edificio" } } },
        { $sort: { total: -1, _id: 1 } },
        { $limit: 10 },
      ])
      .toArray();
    // $addToSet no garantiza orden: se ordena para respuesta determinista.
    return filas.map((f) => ({ tag: f._id, total: f.total, edificios: [...f.edificios].sort() }));
  }
}
