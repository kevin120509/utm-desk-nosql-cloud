// Bitácora administrativa y de seguridad. Es de SOLO AGREGAR: el repositorio no expone
// ninguna operación para modificar ni borrar eventos (nadie puede borrar la bitácora).
export class BitacoraRepoMongo {
  /** @param {import("mongodb").Collection} coleccion */
  constructor(coleccion) {
    this.coleccion = coleccion;
  }

  /** @param {{tipo: "admin"|"seguridad", accion: string, actor?: object, objetivo?: object, detalle?: object, ip?: string, fecha: Date}} evento */
  async registrar(evento) {
    await this.coleccion.insertOne(evento);
  }

  async listar({ tipo, accion, pagina = 1, limite = 30 }) {
    const filtro = {};
    if (tipo) filtro.tipo = tipo;
    if (accion) filtro.accion = accion;
    const [datos, total] = await Promise.all([
      this.coleccion.find(filtro).sort({ fecha: -1 }).skip((pagina - 1) * limite).limit(limite).toArray(),
      this.coleccion.countDocuments(filtro),
    ]);
    return { datos, total };
  }
}
