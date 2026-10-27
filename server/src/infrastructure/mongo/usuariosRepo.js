// Implementación del puerto UsuariosRepo sobre la colección `usuarios`.
import { ObjectId } from "mongodb";

export class UsuariosRepoMongo {
  /** @param {import("mongodb").Collection} coleccion */
  constructor(coleccion) {
    this.coleccion = coleccion;
  }

  buscarPorCorreo(correo) {
    return this.coleccion.findOne({ correo });
  }

  async buscarPorId(id) {
    // Un id que no es ObjectId válido simplemente no existe.
    if (!ObjectId.isValid(id)) return null;
    return this.coleccion.findOne({ _id: new ObjectId(id) });
  }

  /** Lista paginada para el panel de administración (sin password_hash). */
  async listar({ q, rol, activo, pagina = 1, limite = 20 }) {
    const filtro = {};
    if (rol) filtro.rol = rol;
    if (activo !== undefined) filtro.activo = activo ? { $ne: false } : false;
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filtro.$or = [{ nombre: rx }, { correo: rx }];
    }
    const [datos, total] = await Promise.all([
      this.coleccion
        .find(filtro, { projection: { password_hash: 0 } })
        .sort({ nombre: 1 })
        .skip((pagina - 1) * limite)
        .limit(limite)
        .toArray(),
      this.coleccion.countDocuments(filtro),
    ]);
    return { datos, total };
  }

  /** Inserta un usuario nuevo. El índice único de correo evita duplicados (lanza CORREO_DUPLICADO). */
  async insertar(doc) {
    try {
      const { insertedId } = await this.coleccion.insertOne(doc);
      return { ...doc, _id: insertedId };
    } catch (e) {
      if (e?.code === 11000) {
        const dup = new Error("Correo duplicado");
        dup.codigo = "CORREO_DUPLICADO";
        throw dup;
      }
      throw e;
    }
  }

  /** Aplica { $set, $unset } sobre un usuario. true si existe. */
  async actualizar(id, cambios) {
    if (!ObjectId.isValid(id)) return false;
    const { matchedCount } = await this.coleccion.updateOne({ _id: new ObjectId(id) }, cambios);
    return matchedCount === 1;
  }

  /** Cuántos superAdmin activos hay (para no dejar el sistema sin administrador). */
  contarSuperAdminsActivos() {
    return this.coleccion.countDocuments({ rol: "superAdmin", activo: { $ne: false } });
  }
}
