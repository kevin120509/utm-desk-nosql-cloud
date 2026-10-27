// Bitácora administrativa: colección `bitacora_admin`. Solo se insertan registros (no se editan ni borran).
export class BitacoraAdminRepoMongo {
  /** @param {import("mongodb").Collection} coleccion */
  constructor(coleccion) {
    this.coleccion = coleccion;
  }

  async insertar(registro) {
    await this.coleccion.insertOne(registro);
  }

  /**
   * Registros más recientes primero.
   * @param {{modulo?: string, resultado?: string, pagina: number, limite: number}} opciones
   * @returns {Promise<{datos: object[], total: number}>}
   */
  async listar({ modulo, resultado, pagina, limite }) {
    const filtro = {};
    if (modulo) filtro.modulo = modulo; // igualdad exacta
    if (resultado) filtro.resultado = resultado;
    const [datos, total] = await Promise.all([
      this.coleccion
        .find(filtro)
        .sort({ fecha: -1, _id: -1 })
        .skip((pagina - 1) * limite)
        .limit(limite)
        .toArray(),
      this.coleccion.countDocuments(filtro),
    ]);
    return { datos, total };
  }
}
