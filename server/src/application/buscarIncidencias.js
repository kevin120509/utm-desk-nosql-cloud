// Caso de uso de búsqueda textual (RF-09, CU-05).
import { consultaBusquedaSchema } from "../domain/consulta.js";

// Máximo de resultados por búsqueda (fijo, no lo elige el cliente).
const LIMITE_BUSQUEDA = 20;

/**
 * Busca por texto en título y descripción. Un reportante solo encuentra SUS incidencias:
 * el propietario sale de la sesión, nunca del cliente.
 * @param {{incidenciasRepo: import("./puertos/index.js").IncidenciasRepo}} deps
 * @returns {(sesion: {id: string, rol: string}, query: unknown) => Promise<{datos: object[]}>}
 */
export function buscarIncidencias({ incidenciasRepo }) {
  return async function buscar(sesion, query) {
    // ZodError (q vacío, > 100 o parámetros extra) -> la capa HTTP lo vuelve 400 VALIDACION.
    const { q } = consultaBusquedaSchema.parse(query ?? {});
    const propietarioId = sesion.rol === "reportante" ? sesion.id : undefined;
    const datos = await incidenciasRepo.buscarTexto({ q, propietarioId, limite: LIMITE_BUSQUEDA });
    return { datos };
  };
}
