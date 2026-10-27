// Métricas del módulo admin: agregaciones sobre `incidencias_campus` (solo lectura).
const HORA_MS = 3600000;

// Agrupa por un campo y cuenta; el resultado va ordenado de mayor a menor.
const contarPor = (campo, limite) => [
  { $group: { _id: campo, total: { $sum: 1 } } },
  { $sort: { total: -1, _id: 1 } },
  ...(limite ? [{ $limit: limite }] : []),
  { $project: { _id: 0, valor: "$_id", total: 1 } },
];

export class MetricasAdminRepoMongo {
  /** @param {import("mongodb").Collection} coleccion */
  constructor(coleccion) {
    this.coleccion = coleccion;
  }

  async obtener() {
    const [categorias, estados, prioridades, edificios, tecnicos, recurrentes, resolucion] = await Promise.all([
      this.coleccion.aggregate([{ $match: {} }, ...contarPor("$categoria")]).toArray(),
      this.coleccion.aggregate([{ $match: {} }, ...contarPor("$estado")]).toArray(),
      this.coleccion.aggregate([{ $match: {} }, ...contarPor("$prioridad")]).toArray(),
      this.coleccion.aggregate([{ $match: {} }, ...contarPor("$ubicacion.edificio")]).toArray(),
      // Técnicos con más incidencias asignadas (asignado_a solo existe cuando actuó un técnico).
      this.coleccion
        .aggregate([
          { $match: { asignado_a: { $exists: true } } },
          ...contarPor("$asignado_a.nombre", 10),
        ])
        .toArray(),
      // Fallas crónicas: espacios (edificio + espacio) con más de una incidencia.
      this.coleccion
        .aggregate([
          {
            $group: {
              _id: { edificio: "$ubicacion.edificio", espacio: "$ubicacion.espacio" },
              total: { $sum: 1 },
            },
          },
          { $match: { total: { $gte: 2 } } },
          { $sort: { total: -1, "_id.edificio": 1, "_id.espacio": 1 } },
          { $limit: 10 },
          { $project: { _id: 0, edificio: "$_id.edificio", espacio: "$_id.espacio", total: 1 } },
        ])
        .toArray(),
      // Tiempo medio de resolución: solo incidencias con fecha_resolucion (resueltas o cerradas).
      this.coleccion
        .aggregate([
          { $match: { fecha_resolucion: { $exists: true } } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              promedioMs: { $avg: { $subtract: ["$fecha_resolucion", "$fecha_creacion"] } },
            },
          },
          { $project: { _id: 0, total: 1, promedioMs: 1 } },
        ])
        .toArray(),
    ]);

    const res = resolucion[0];
    return {
      por_categoria: categorias,
      por_estado: estados,
      por_prioridad: prioridades,
      por_edificio: edificios,
      tecnicos_con_mas_incidencias: tecnicos,
      recurrentes,
      tiempo_resolucion: {
        resueltas: res?.total ?? 0,
        promedio_horas: res ? Math.round((res.promedioMs / HORA_MS) * 100) / 100 : 0,
      },
    };
  }
}
