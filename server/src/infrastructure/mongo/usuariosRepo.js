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
}
