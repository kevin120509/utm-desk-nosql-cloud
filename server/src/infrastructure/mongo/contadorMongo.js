// Contador atómico en la colección `contadores` (sin Redis, decisión del docente).
// Implementa el puerto Contador. Cada contador es un documento { _id: <clave>, valor }.
// `$inc` + `upsert` en UNA sola operación garantiza que dos peticiones simultáneas
// nunca reciban el mismo número.
import { CATEGORIAS } from "../../domain/enumeraciones.js";

const ZONA_HORARIA = "America/Merida";

// Formateador en-CA produce "YYYY-MM-DD"; la zona fija el "día" aunque el servidor esté en UTC.
const formatoDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Clave del contador diario: contador:incidencias:YYYY-MM-DD:<categoria>. */
export function claveDiaria(categoria, fecha) {
  if (!CATEGORIAS.includes(categoria)) {
    throw new Error(`Categoría inválida para el contador: ${categoria}`);
  }
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
    throw new Error("Fecha inválida para el contador diario");
  }
  return `contador:incidencias:${formatoDia.format(fecha)}:${categoria}`;
}

/** Clave del contador anual: contador:incidencias:anual:<AAAA>. */
export function claveAnual(anio) {
  if (!Number.isInteger(anio) || anio < 1000 || anio > 9999) {
    throw new Error(`Año inválido para el contador anual: ${anio}`);
  }
  return `contador:incidencias:anual:${anio}`;
}

export class ContadorMongo {
  /** @param {import("mongodb").Collection} coleccion Colección `contadores`. */
  constructor(coleccion) {
    this.coleccion = coleccion;
  }

  async siguienteDiario(categoria, fecha) {
    return this.#incrementar(claveDiaria(categoria, fecha));
  }

  async siguienteAnual(anio) {
    return this.#incrementar(claveAnual(anio));
  }

  // Un único findOneAndUpdate: crea el documento en 1 si no existe, o suma 1.
  async #incrementar(clave) {
    const doc = await this.coleccion.findOneAndUpdate(
      { _id: clave },
      { $inc: { valor: 1 } },
      { upsert: true, returnDocument: "after" }
    );
    return doc.valor;
  }
}
