// Serializadores para los entregables: JSON extendido (como lo exporta Atlas / mongoexport)
// y literales de mongosh (ObjectId("..."), ISODate("...")). Sin dependencias.
import { ObjectId } from "mongodb";

const esObjectId = (v) => v instanceof ObjectId || v?._bsontype === "ObjectId";

/**
 * Quita el token de las URLs firmadas de las evidencias antes de exportar. La URL guardada
 * es solo una copia temporal (el servidor la regenera desde `storage_path` al leer): no debe
 * viajar en un entregable ni en el repositorio. No modifica los documentos originales.
 */
export function sinTokensEnUrls(incidencias) {
  return incidencias.map((doc) => ({
    ...doc,
    evidencias_adjuntas: (doc.evidencias_adjuntas ?? []).map((ev) => ({
      ...ev,
      url_storage: String(ev.url_storage).split("?")[0],
    })),
  }));
}

/**
 * Convierte un valor con ObjectId y Date en JSON "relajado" de MongoDB:
 *   ObjectId -> { "$oid": "..." }, Date -> { "$date": "2026-10-15T12:00:00.000Z" }.
 */
export function aJsonExtendido(valor) {
  if (esObjectId(valor)) return { $oid: valor.toString() };
  if (valor instanceof Date) return { $date: valor.toISOString() };
  if (Array.isArray(valor)) return valor.map(aJsonExtendido);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, aJsonExtendido(v)]));
  }
  return valor;
}

/**
 * Valor JavaScript -> texto de un literal de mongosh, con sangría.
 * ObjectId -> ObjectId("..."), Date -> ISODate("...").
 */
export function aLiteralMongosh(valor, nivel = 0) {
  const sangria = "  ".repeat(nivel);
  const interior = "  ".repeat(nivel + 1);
  if (esObjectId(valor)) return `ObjectId(${JSON.stringify(valor.toString())})`;
  if (valor instanceof Date) return `ISODate(${JSON.stringify(valor.toISOString())})`;
  if (Array.isArray(valor)) {
    if (valor.length === 0) return "[]";
    // Arreglos de valores simples en una sola línea; los de objetos, uno por línea.
    const simples = valor.every((x) => x === null || typeof x !== "object" || x instanceof Date || esObjectId(x));
    if (simples) return `[${valor.map((x) => aLiteralMongosh(x, nivel)).join(", ")}]`;
    return `[\n${valor.map((x) => interior + aLiteralMongosh(x, nivel + 1)).join(",\n")}\n${sangria}]`;
  }
  if (valor && typeof valor === "object") {
    const entradas = Object.entries(valor);
    if (entradas.length === 0) return "{}";
    const clave = (k) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : JSON.stringify(k));
    return `{\n${entradas.map(([k, v]) => `${interior}${clave(k)}: ${aLiteralMongosh(v, nivel + 1)}`).join(",\n")}\n${sangria}}`;
  }
  return JSON.stringify(valor);
}
