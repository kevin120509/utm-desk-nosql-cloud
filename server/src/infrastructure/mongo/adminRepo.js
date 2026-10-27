// Consultas globales de solo lectura para el panel del superAdmin.
export class AdminRepoMongo {
  /** @param {import("mongodb").Db} db */
  constructor(db) {
    this.db = db;
  }

  async ping() {
    const t0 = Date.now();
    await this.db.command({ ping: 1 });
    return Date.now() - t0;
  }

  async resumen() {
    const usuarios = this.db.collection("usuarios");
    const incidencias = this.db.collection("incidencias_campus");
    const [porRol, porEstado, porCategoria, totalUsuarios, suspendidos] = await Promise.all([
      usuarios.aggregate([{ $group: { _id: "$rol", total: { $sum: 1 } } }]).toArray(),
      incidencias.aggregate([{ $group: { _id: "$estado", total: { $sum: 1 } } }]).toArray(),
      incidencias.aggregate([{ $group: { _id: "$categoria", total: { $sum: 1 } } }]).toArray(),
      usuarios.countDocuments({}),
      usuarios.countDocuments({ activo: false }),
    ]);
    const mapa = (filas) => Object.fromEntries(filas.map((f) => [f._id, f.total]));
    return {
      usuarios: { total: totalUsuarios, suspendidos, porRol: mapa(porRol) },
      incidencias: {
        total: porEstado.reduce((n, f) => n + f.total, 0),
        porEstado: mapa(porEstado),
        porCategoria: mapa(porCategoria),
      },
    };
  }
}
