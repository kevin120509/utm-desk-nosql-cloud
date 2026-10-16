// Caso de uso: cargar evidencia multimedia (RF-04, CU-02).
import { randomUUID } from "node:crypto";
import { MAX_BYTES_EVIDENCIA, TIPOS_EVIDENCIA, PATRON_CODIGO, sanearNombre, pesoEnKb } from "../domain/index.js";
import { ErrorApp } from "./errores.js";

const ARCHIVO_INVALIDO = "ARCHIVO_INVALIDO";

/**
 * @param {{incidenciasRepo: import("./puertos/index.js").IncidenciasRepo,
 *          almacen: import("./puertos/index.js").Almacen,
 *          detectarTipo: (buffer: Buffer) => Promise<string|null>,
 *          ttlSegundos?: number,
 *          reloj?: () => Date,
 *          generarId?: () => string}} deps
 * @returns {(sesion: {id: string, rol: string}, codigo: string, archivo: {originalname: string, buffer: Buffer, size: number}|null) => Promise<object>}
 */
export function cargarEvidencia({
  incidenciasRepo,
  almacen,
  detectarTipo,
  ttlSegundos = 3600,
  reloj = () => new Date(),
  generarId = randomUUID,
}) {
  return async function cargar(sesion, codigo, archivo) {
    // 1. La incidencia debe existir (404 antes de validar o subir nada).
    if (!PATRON_CODIGO.test(String(codigo))) {
      throw new ErrorApp("NO_ENCONTRADO", "La incidencia no existe");
    }
    const doc = await incidenciasRepo.buscarPorCodigo(codigo);
    if (!doc) throw new ErrorApp("NO_ENCONTRADO", "La incidencia no existe");

    // 2. Permisos: personal siempre; el reportante solo en SUS incidencias.
    const esPersonal = sesion.rol === "tecnico" || sesion.rol === "coordinador";
    const esDueno = sesion.rol === "reportante" && String(doc.reportante.usuario_id) === String(sesion.id);
    if (!esPersonal && !esDueno) {
      throw new ErrorApp("SIN_PERMISO", "No tienes permiso para adjuntar evidencia a esta incidencia");
    }

    // 3. Validaciones del archivo, TODAS antes de subir: así un archivo malo no deja basura.
    if (!archivo?.buffer || archivo.buffer.length === 0) {
      throw new ErrorApp(ARCHIVO_INVALIDO, "Debes adjuntar un archivo con contenido (campo «archivo»)");
    }
    if (archivo.buffer.length > MAX_BYTES_EVIDENCIA) {
      throw new ErrorApp(ARCHIVO_INVALIDO, "El archivo supera el máximo de 4 MB");
    }
    // El tipo sale de los bytes, nunca de la extensión ni de lo que declare el cliente.
    const tipoMime = await detectarTipo(archivo.buffer);
    const extension = tipoMime ? TIPOS_EVIDENCIA[tipoMime] : undefined;
    if (!extension) {
      throw new ErrorApp(ARCHIVO_INVALIDO, "Tipo de archivo no permitido: solo JPEG, PNG o PDF");
    }

    // 4. Sube al bucket con una ruta única y estable (guardamos la ruta, no la URL).
    const ahora = reloj();
    const nombre = sanearNombre(archivo.originalname, extension);
    const storage_path = `${codigo}/${generarId()}-${nombre}`;
    await almacen.subir({ ruta: storage_path, buffer: archivo.buffer, tipoMime });

    // 5. URL firmada temporal y metadatos (el binario NUNCA va a MongoDB).
    const { url, expira } = await almacen.urlFirmada(storage_path, ttlSegundos);
    const evidencia = {
      nombre_archivo: nombre,
      tipo_mime: tipoMime,
      peso_kb: pesoEnKb(archivo.buffer.length),
      storage_path,
      url_storage: url,
      url_expira: expira,
      fecha_carga: ahora,
    };

    // 6. UN solo updateOne con $push. Si falla, no dejamos el archivo huérfano.
    try {
      const existe = await incidenciasRepo.agregarEvidencia(codigo, evidencia, ahora);
      if (!existe) throw new ErrorApp("NO_ENCONTRADO", "La incidencia no existe");
    } catch (e) {
      await almacen.eliminarArchivos([storage_path]).catch((err) => {
        console.error(`cargarEvidencia: no se pudo limpiar el archivo subido (${err?.message})`);
      });
      throw e;
    }
    return evidencia;
  };
}
