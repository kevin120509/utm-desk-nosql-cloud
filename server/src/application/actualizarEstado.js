// Caso de uso: cambiar el estado de una incidencia y registrar la bitácora (RF-07, CU-03).
import { cambiarEstadoSchema, transicionValida, PATRON_CODIGO } from "../domain/index.js";
import { ErrorApp } from "./errores.js";

/**
 * @param {{incidenciasRepo: import("./puertos/index.js").IncidenciasRepo,
 *          usuariosRepo: import("./puertos/index.js").UsuariosRepo,
 *          reloj?: () => Date}} deps
 * @returns {(sesion: {id: string, rol: string}, codigo: string, entrada: unknown) => Promise<object>}
 */
export function actualizarEstado({ incidenciasRepo, usuariosRepo, reloj = () => new Date() }) {
  return async function actualizar(sesion, codigo, entrada) {
    // 1. Zod lanza ZodError si algo está mal (la capa HTTP lo vuelve 400 VALIDACION).
    const { estado_nuevo, horas, comentario } = cambiarEstadoSchema.parse(entrada ?? {});

    // 2. Un código con mala forma no puede existir: 404 sin tocar la BD.
    if (!PATRON_CODIGO.test(String(codigo))) {
      throw new ErrorApp("NO_ENCONTRADO", "La incidencia no existe");
    }
    const doc = await incidenciasRepo.buscarPorCodigo(codigo);
    if (!doc) throw new ErrorApp("NO_ENCONTRADO", "La incidencia no existe");

    // 3. Estado que el servidor leyó: es la "versión" contra la que se compara al escribir.
    const estadoLeido = doc.estado;
    if (!transicionValida(estadoLeido, estado_nuevo, sesion.rol)) {
      throw new ErrorApp(
        "TRANSICION_INVALIDA",
        `No se puede pasar de "${estadoLeido}" a "${estado_nuevo}" con el rol ${sesion.rol}`
      );
    }

    // 4. El autor sale de la sesión (se necesita su _id real para la bitácora).
    const usuario = await usuariosRepo.buscarPorId(sesion.id);
    if (!usuario || usuario.activo === false) {
      throw new ErrorApp("NO_AUTENTICADO", "Sesión inválida o expirada");
    }
    const autor = { usuario_id: usuario._id, nombre: usuario.nombre };

    // 5. Armado del update. fecha_resolucion solo al pasar a "resuelta";
    //    al cerrar se conserva la que ya tenía.
    const ahora = reloj();
    const cambios = {
      $set: {
        estado: estado_nuevo,
        fecha_actualizacion: ahora,
        ...(estado_nuevo === "resuelta" ? { fecha_resolucion: ahora } : {}),
      },
      $push: {
        historial_seguimiento: {
          fecha: ahora,
          autor,
          estado_anterior: estadoLeido,
          estado_nuevo,
          comentario,
          horas,
        },
      },
      $inc: { horas_invertidas: horas },
    };

    // 6. UN solo updateOne atómico; si otra persona cambió el estado antes, no modifica nada.
    const aplicado = await incidenciasRepo.actualizarEstado({ codigo, estadoLeido, cambios });
    if (!aplicado) {
      throw new ErrorApp("CONFLICTO", "La incidencia fue modificada por otra persona; recarga e intenta de nuevo");
    }

    return incidenciasRepo.buscarPorCodigo(codigo);
  };
}
