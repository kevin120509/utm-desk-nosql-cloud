// Caso de uso: vista de incidencias del módulo admin. Solo lectura: el historial operativo
// no se altera desde aquí y nunca se borra una incidencia (eso ya lo decide el coordinador).
import { adminIncidenciasQuerySchema } from "../domain/administracion.js";

/**
 * @param {{incidenciasRepo: object,
 *          expediente: (sesion: {id: string, rol: string}, codigo: string) => Promise<object>}} deps
 *   `expediente` es obtenerIncidencia ya construido (firma URLs de evidencias).
 */
export function administrarIncidencias({ incidenciasRepo, expediente }) {
  return {
    async listar(query) {
      const { pagina, limite, q, ...filtros } = adminIncidenciasQuerySchema.parse(query ?? {});
      const { datos, total } = await incidenciasRepo.listarAdmin({ filtros, q, pagina, limite });
      return { datos, total, pagina };
    },

    /** Documento completo más quién la creó y quién la modificó por última vez. */
    async obtener(actor, codigo) {
      const doc = await expediente({ id: actor.id, rol: "superAdmin" }, codigo);
      const historial = doc.historial_seguimiento ?? [];
      const ultimo = historial[historial.length - 1];
      const auditoria = {
        creado_por: {
          usuario_id: String(doc.reportante.usuario_id),
          nombre: doc.reportante.nombre,
          fecha: doc.fecha_creacion,
        },
      };
      // Solo hay "modificación" si el historial tiene una entrada con autor.
      if (ultimo?.autor) {
        auditoria.ultima_modificacion = { fecha: doc.fecha_actualizacion, autor: ultimo.autor };
      }
      return { ...doc, auditoria };
    },
  };
}
