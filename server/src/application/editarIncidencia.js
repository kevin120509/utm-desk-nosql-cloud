// Caso de uso: corregir campos universales de una incidencia (RF-12, solo coordinador).
import { editarIncidenciaSchema, PATRON_CODIGO } from "../domain/index.js";
import { ErrorApp } from "./errores.js";

/**
 * Decisión: una incidencia `cerrada` también se puede corregir (el coordinador
 * arregla typos o la ubicación a posteriori); no se toca el estado ni la bitácora.
 * @param {{incidenciasRepo: import("./puertos/index.js").IncidenciasRepo, reloj?: () => Date}} deps
 * @returns {(sesion: {id: string, rol: string}, codigo: string, entrada: unknown) => Promise<object>}
 */
export function editarIncidencia({ incidenciasRepo, reloj = () => new Date() }) {
  return async function editar(_sesion, codigo, entrada) {
    // Zod lanza ZodError (400): campos extra/no editables o cuerpo vacío.
    const campos = editarIncidenciaSchema.parse(entrada ?? {});

    if (!PATRON_CODIGO.test(String(codigo))) {
      throw new ErrorApp("NO_ENCONTRADO", "La incidencia no existe");
    }

    // UN solo updateOne con $set (ubicacion se reemplaza completa).
    const existe = await incidenciasRepo.editar({ codigo, cambios: { $set: { ...campos, fecha_actualizacion: reloj() } } });
    if (!existe) throw new ErrorApp("NO_ENCONTRADO", "La incidencia no existe");

    return incidenciasRepo.buscarPorCodigo(codigo);
  };
}
