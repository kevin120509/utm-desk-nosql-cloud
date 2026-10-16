// Casos de uso de lectura: listar con filtros y consultar un expediente (RF-05, RF-06).
import { consultaListaSchema, PATRON_CODIGO } from "../domain/consulta.js";
import { ErrorApp } from "./errores.js";

/**
 * Lista paginada. Un reportante solo recibe SUS incidencias: el filtro por
 * propietario lo pone el servidor a partir de la sesión, nunca viene del cliente.
 * @param {{incidenciasRepo: import("./puertos/index.js").IncidenciasRepo}} deps
 * @returns {(sesion: {id: string, rol: string}, query: unknown) => Promise<{datos: object[], total: number, pagina: number}>}
 */
export function listarIncidencias({ incidenciasRepo }) {
  return async function listar(sesion, query) {
    // Zod lanza ZodError si algo está mal (la capa HTTP lo vuelve 400 VALIDACION).
    const { pagina, limite, ...filtros } = consultaListaSchema.parse(query ?? {});
    const propietarioId = sesion.rol === "reportante" ? sesion.id : undefined;
    const { datos, total } = await incidenciasRepo.listar({ filtros, propietarioId, pagina, limite });
    return { datos, total, pagina };
  };
}

/**
 * Expediente completo en UNA lectura (el documento ya trae bitácora, tags y evidencias).
 * Nota: las URLs firmadas de evidencias se regeneran en B09 (Supabase); mientras tanto
 * se devuelve `url_storage` tal como está guardada.
 * @param {{incidenciasRepo: import("./puertos/index.js").IncidenciasRepo}} deps
 * @returns {(sesion: {id: string, rol: string}, codigo: string) => Promise<object>}
 */
export function obtenerIncidencia({ incidenciasRepo }) {
  return async function obtener(sesion, codigo) {
    // Un código con mala forma no puede existir: se responde 404 sin tocar la BD.
    if (!PATRON_CODIGO.test(String(codigo))) {
      throw new ErrorApp("NO_ENCONTRADO", "La incidencia no existe");
    }
    const doc = await incidenciasRepo.buscarPorCodigo(codigo);
    if (!doc) throw new ErrorApp("NO_ENCONTRADO", "La incidencia no existe");

    // Un reportante solo puede abrir las suyas (RF-05: 403 en otro caso).
    if (sesion.rol === "reportante" && String(doc.reportante.usuario_id) !== String(sesion.id)) {
      throw new ErrorApp("SIN_PERMISO", "No tienes permiso para ver esta incidencia");
    }
    return doc;
  };
}
