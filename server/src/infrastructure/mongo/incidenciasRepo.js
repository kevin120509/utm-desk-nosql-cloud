// Implementación del puerto IncidenciasRepo sobre la colección `incidencias_campus`.
import { ObjectId } from "mongodb";
import { ErrorApp } from "../../application/errores.js";
import { regexSeguro } from "./regex.js";

// Mensaje genérico: nunca se expone el detalle de Atlas al cliente.
const ERROR_GENERICO = "Error interno del servidor";

// En el listado no se envía lo pesado (bitácora, evidencias, detalle): eso va en el expediente.
const PROYECCION_LISTA = { historial_seguimiento: 0, evidencias_adjuntas: 0, detalle_especifico: 0 };

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

  /**
   * Lista paginada, más reciente primero. Los filtros exactos (categoria, estado,
   * ubicacion.edificio) aprovechan el índice compuesto `idx_cat_estado_edificio`.
   * @param {{filtros?: {categoria?: string, estado?: string, prioridad?: string, edificio?: string},
   *          propietarioId?: string, pagina: number, limite: number}} opciones
   * @returns {Promise<{datos: object[], total: number}>}
   */
  async listar({ filtros = {}, propietarioId, pagina, limite }) {
    const { categoria, estado, prioridad, edificio } = filtros;
    const filtro = {};
    if (categoria) filtro.categoria = categoria;
    if (estado) filtro.estado = estado;
    if (prioridad) filtro.prioridad = prioridad;
    if (edificio) filtro["ubicacion.edificio"] = edificio;
    if (propietarioId) filtro["reportante.usuario_id"] = new ObjectId(propietarioId);

    const [datos, total] = await Promise.all([
      this.coleccion
        .find(filtro, { projection: PROYECCION_LISTA })
        // _id como desempate para que la paginación sea estable.
        .sort({ fecha_creacion: -1, _id: -1 })
        .skip((pagina - 1) * limite)
        .limit(limite)
        .toArray(),
      this.coleccion.countDocuments(filtro),
    ]);
    return { datos, total };
  }

  /**
   * Búsqueda textual (RF-09) con el índice `idx_texto_es` (español, raíces; título pesa más).
   * Devuelve los documentos con `score`, de mayor a menor relevancia.
   * @param {{q: string, propietarioId?: string, limite: number}} opciones
   * @returns {Promise<object[]>}
   */
  async buscarTexto({ q, propietarioId, limite }) {
    const filtro = { $text: { $search: q } };
    if (propietarioId) filtro["reportante.usuario_id"] = new ObjectId(propietarioId);
    return this.coleccion
      .find(filtro, { projection: { score: { $meta: "textScore" }, ...PROYECCION_LISTA } })
      .sort({ score: { $meta: "textScore" } })
      .limit(limite)
      .toArray();
  }

  /** Expediente completo por código público, o null si no existe. */
  async buscarPorCodigo(codigo) {
    return this.coleccion.findOne({ codigo });
  }

  /**
   * Cambio de estado atómico (RF-07): UN solo updateOne con el estado leído en el filtro.
   * Si otra persona cambió el estado antes, nada coincide (matchedCount 0) y no se modifica nada.
   * @param {{codigo: string, estadoLeido: string,
   *          cambios: {$set: object, $push: object, $inc: object}}} datos
   * @returns {Promise<boolean>} true si se aplicó; false si hubo conflicto.
   */
  async actualizarEstado({ codigo, estadoLeido, cambios }) {
    const { matchedCount } = await this.coleccion.updateOne({ codigo, estado: estadoLeido }, cambios);
    return matchedCount === 1;
  }

  /**
   * Edición de campos universales (RF-12): UN solo updateOne por código.
   * @param {{codigo: string, cambios: {$set: object}}} datos
   * @returns {Promise<boolean>} false si no existe.
   */
  async editar({ codigo, cambios }) {
    const { matchedCount } = await this.coleccion.updateOne({ codigo }, cambios);
    return matchedCount === 1;
  }

  /**
   * Agrega una evidencia al expediente (RF-04): UN updateOne con $push.
   * @returns {Promise<boolean>} false si la incidencia no existe.
   */
  async agregarEvidencia(codigo, evidencia, ahora) {
    const { matchedCount } = await this.coleccion.updateOne(
      { codigo },
      { $push: { evidencias_adjuntas: evidencia }, $set: { fecha_actualizacion: ahora } },
    );
    return matchedCount === 1;
  }

  /** Elimina el documento por código. true si se borró uno. */
  async eliminar(codigo) {
    const { deletedCount } = await this.coleccion.deleteOne({ codigo });
    return deletedCount === 1;
  }

  /**
   * Listado del módulo admin: los mismos filtros que `listar` (sin limitar por propietario)
   * y búsqueda por texto libre en código, título o descripción (regex escapada, sin índice).
   * @param {{filtros?: object, q?: string, pagina: number, limite: number}} opciones
   * @returns {Promise<{datos: object[], total: number}>}
   */
  async listarAdmin({ filtros = {}, q, pagina, limite }) {
    const { categoria, estado, prioridad, edificio } = filtros;
    const filtro = {};
    if (categoria) filtro.categoria = categoria;
    if (estado) filtro.estado = estado;
    if (prioridad) filtro.prioridad = prioridad;
    if (edificio) filtro["ubicacion.edificio"] = edificio;
    if (q) {
      const rx = regexSeguro(q);
      filtro.$or = [{ codigo: rx }, { titulo: rx }, { descripcion: rx }];
    }
    const [datos, total] = await Promise.all([
      this.coleccion
        .find(filtro, { projection: PROYECCION_LISTA })
        .sort({ fecha_creacion: -1, _id: -1 })
        .skip((pagina - 1) * limite)
        .limit(limite)
        .toArray(),
      this.coleccion.countDocuments(filtro),
    ]);
    return { datos, total };
  }

  /** Edificios que aparecen en alguna incidencia (catálogo derivado de los datos). */
  async edificiosDistintos() {
    const valores = await this.coleccion.distinct("ubicacion.edificio");
    return valores.sort((a, b) => a.localeCompare(b, "es"));
  }
}
