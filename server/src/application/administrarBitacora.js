// Caso de uso: bitácora administrativa (cada acción del módulo admin queda registrada).
// Solo escribe registros nuevos: nunca edita ni borra la bitácora.
import { adminBitacoraQuerySchema } from "../domain/administracion.js";
import { ErrorApp } from "./errores.js";

/**
 * @param {{bitacoraRepo: {insertar: (r: object) => Promise<void>,
 *                         listar: (o: object) => Promise<{datos: object[], total: number}>},
 *          ahora?: () => Date}} deps
 */
export function administrarBitacora({ bitacoraRepo, ahora = () => new Date() }) {
  /**
   * Ejecuta `operacion` y deja constancia en la bitácora con el resultado:
   *  - "exito": la operación se completó.
   *  - "rechazado": una regla de negocio la impidió (ErrorApp); se guarda el código, no el detalle.
   * Errores inesperados no se registran aquí: se propagan como 500.
   * @param {{actor: {id: string, nombre: string, ip?: string}, modulo: string, accion: string,
   *          registroId: string, cambios?: object}} contexto
   * @param {() => Promise<*>} operacion
   */
  async function ejecutar(contexto, operacion) {
    const base = {
      fecha: ahora(),
      usuario_id: contexto.actor.id,
      usuario_nombre: contexto.actor.nombre,
      accion: contexto.accion,
      modulo: contexto.modulo,
      registro_id: String(contexto.registroId),
    };
    // La IP solo se guarda si existe (nada de campos null).
    if (contexto.actor.ip) base.ip = contexto.actor.ip;
    if (contexto.cambios) base.cambios = contexto.cambios;

    try {
      const resultado = await operacion();
      await bitacoraRepo.insertar({ ...base, resultado: "exito" });
      return resultado;
    } catch (e) {
      if (e instanceof ErrorApp) {
        await bitacoraRepo.insertar({ ...base, resultado: "rechazado", codigo_error: e.codigo });
      }
      throw e;
    }
  }

  /** Listado paginado, más reciente primero (GET /api/admin/bitacora). */
  async function listar(query) {
    const { pagina, limite, modulo, resultado } = adminBitacoraQuerySchema.parse(query ?? {});
    const { datos, total } = await bitacoraRepo.listar({ modulo, resultado, pagina, limite });
    return { datos, total, pagina };
  }

  return { ejecutar, listar };
}
