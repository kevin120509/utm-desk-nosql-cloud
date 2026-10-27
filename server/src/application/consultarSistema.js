// Caso de uso: estado del sistema para el superAdmin. No expone secretos ni cadenas de conexión.
/**
 * @param {{comprobarMongo: () => Promise<void>,        // lanza si Mongo no responde
 *          comprobarAlmacen: () => Promise<{estado: string}>,
 *          ultimoError: () => ({codigo: string, ruta: string, fecha: Date, mensaje: string} | undefined),
 *          entorno: string, version: string, ahora?: () => Date}} deps
 */
export function consultarSistema({ comprobarMongo, comprobarAlmacen, ultimoError, entorno, version, ahora = () => new Date() }) {
  return async function sistema() {
    const mongodb = await comprobarMongo().then(
      () => ({ estado: "conectada" }),
      () => ({ estado: "error" }),
    );
    const almacenamiento = await comprobarAlmacen().catch(() => ({ estado: "error" }));
    const error = ultimoError();
    return {
      api: { estado: "operativa", entorno, version },
      mongodb,
      almacenamiento,
      // Solo se incluye si hubo un error: nada de campos vacíos.
      ...(error ? { ultimo_error: error } : {}),
      comprobado_en: ahora(),
    };
  };
}
