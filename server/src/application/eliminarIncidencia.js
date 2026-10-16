// Caso de uso: eliminar una incidencia y sus archivos del bucket (RF-12, solo coordinador).
import { PATRON_CODIGO } from "../domain/index.js";
import { ErrorApp } from "./errores.js";

/**
 * Orden: leer (404) -> borrar documento en Mongo -> borrar archivos en el almacén.
 * Si el almacén falla NO se revierte ni se responde error: queda registrado en el
 * log como archivo huérfano (mejor un archivo sobrante que una incidencia "zombi").
 * @param {{incidenciasRepo: import("./puertos/index.js").IncidenciasRepo,
 *          almacen: import("./puertos/index.js").Almacen}} deps
 * @returns {(sesion: {id: string, rol: string}, codigo: string) => Promise<{eliminada: true, codigo: string}>}
 */
export function eliminarIncidencia({ incidenciasRepo, almacen }) {
  return async function eliminar(_sesion, codigo) {
    if (!PATRON_CODIGO.test(String(codigo))) {
      throw new ErrorApp("NO_ENCONTRADO", "La incidencia no existe");
    }
    const doc = await incidenciasRepo.buscarPorCodigo(codigo);
    if (!doc) throw new ErrorApp("NO_ENCONTRADO", "La incidencia no existe");

    const borrado = await incidenciasRepo.eliminar(codigo);
    if (!borrado) throw new ErrorApp("NO_ENCONTRADO", "La incidencia no existe"); // borrada en paralelo

    const paths = (doc.evidencias_adjuntas ?? []).map((e) => e.storage_path);
    if (paths.length > 0) {
      try {
        await almacen.eliminarArchivos(paths);
      } catch (e) {
        console.error(`eliminarIncidencia: archivos huérfanos de ${codigo} (${paths.length}): ${e?.message}`);
      }
    }
    return { eliminada: true, codigo };
  };
}
