// Detecta el tipo REAL de un archivo por su firma de bytes (no por extensión ni por lo que
// declare el cliente). Un .exe renombrado a .png se detecta como otra cosa (o como desconocido).
import { fileTypeFromBuffer } from "file-type";

/**
 * @param {Buffer} buffer
 * @returns {Promise<string|null>} tipo MIME detectado, o null si no se reconoce.
 */
export async function detectarTipo(buffer) {
  const tipo = await fileTypeFromBuffer(buffer);
  return tipo?.mime ?? null;
}
