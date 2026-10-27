// Implementación del puerto UsuariosRepo sobre la colección `usuarios`.
import { ObjectId } from "mongodb";
import { regexSeguro } from "./regex.js";

// Nunca se devuelve el hash de la contraseña fuera de la capa de autenticación.
const SIN_HASH = { password_hash: 0 };

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

  /**
   * Listado administrativo paginado (sin hash). Activo = no tiene `activo: false`.
   * @param {{q?: string, rol?: string, activo?: boolean, pagina: number, limite: number}} opciones
   * @returns {Promise<{datos: object[], total: number}>}
   */
  async listar({ q, rol, activo, pagina, limite }) {
    const filtro = {};
    if (rol) filtro.rol = rol;
    if (activo === true) filtro.activo = { $ne: false };
    if (activo === false) filtro.activo = false;
    if (q) {
      const rx = regexSeguro(q);
      filtro.$or = [{ nombre: rx }, { correo: rx }];
    }
    const [datos, total] = await Promise.all([
      this.coleccion
        .find(filtro, { projection: SIN_HASH })
        .sort({ nombre: 1, _id: 1 })
        .skip((pagina - 1) * limite)
        .limit(limite)
        .toArray(),
      this.coleccion.countDocuments(filtro),
    ]);
    return { datos, total };
  }

  /** Lista de usuarios con un rol (sin hash), p. ej. técnicos para el catálogo. */
  listarPorRol(rol) {
    return this.coleccion.find({ rol }, { projection: SIN_HASH }).sort({ nombre: 1 }).toArray();
  }

  /** Cuántos superAdmin activos hay. Sirve para proteger al último. */
  contarSuperAdminActivos() {
    return this.coleccion.countDocuments({ rol: "superAdmin", activo: { $ne: false } });
  }

  /**
   * Aplica cambios ($set / $unset) a un usuario por su id.
   * @returns {Promise<boolean>} false si el usuario no existe.
   */
  async actualizar(id, cambios) {
    const { matchedCount } = await this.coleccion.updateOne({ _id: new ObjectId(id) }, cambios);
    return matchedCount === 1;
  }
}
