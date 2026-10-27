// Catálogos administrables (categorías y edificios con sus espacios) en la colección `catalogos`.
// No hay operación de borrado: lo que ya no se usa se desactiva (las incidencias viejas lo conservan).
import { ObjectId } from "mongodb";

export class CatalogosRepoMongo {
  /** @param {import("mongodb").Collection} coleccion */
  constructor(coleccion) {
    this.coleccion = coleccion;
  }

  contar() {
    return this.coleccion.countDocuments({});
  }

  listar() {
    return this.coleccion.find({}).sort({ tipo: 1, nombre: 1 }).toArray();
  }

  async sembrar(docs) {
    if (docs.length) await this.coleccion.insertMany(docs);
  }

  buscarCategoria(clave) {
    return this.coleccion.findOne({ tipo: "categoria", clave });
  }

  async buscarEdificio(id) {
    if (!ObjectId.isValid(id)) return null;
    return this.coleccion.findOne({ _id: new ObjectId(id), tipo: "edificio" });
  }

  buscarEdificioPorNombre(nombre) {
    return this.coleccion.findOne({ tipo: "edificio", nombre }, { collation: { locale: "es", strength: 2 } });
  }

  async insertarEdificio(doc) {
    const { insertedId } = await this.coleccion.insertOne(doc);
    return { ...doc, _id: insertedId };
  }

  /** Actualiza un documento por _id con un update de Mongo ({ $set, $push, ... }). */
  async actualizar(id, cambios) {
    if (!ObjectId.isValid(id)) return false;
    const { matchedCount } = await this.coleccion.updateOne({ _id: new ObjectId(id) }, cambios);
    return matchedCount === 1;
  }

  async actualizarCategoria(clave, $set) {
    const { matchedCount } = await this.coleccion.updateOne({ tipo: "categoria", clave }, { $set });
    return matchedCount === 1;
  }
}
