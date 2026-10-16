// Reglas puras de las evidencias (RF-04): tipos permitidos, tamaño y nombre seguro.

// 4 MB: Vercel limita el cuerpo de una petición a 4.5 MB (AGENTS.md).
export const MAX_BYTES_EVIDENCIA = 4 * 1024 * 1024;

// Tipos permitidos (por contenido real) y la extensión que les corresponde.
export const TIPOS_EVIDENCIA = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
};

const MAX_LARGO_NOMBRE = 80;

/**
 * Devuelve un nombre de archivo seguro para guardar y mostrar:
 * sin rutas, sin acentos ni caracteres raros, con extensión acorde al TIPO REAL
 * (la extensión que mande el cliente no se respeta) y de máximo 80 caracteres.
 * @param {string} nombreOriginal  Nombre que trae el archivo subido.
 * @param {string} extension       Extensión del tipo real detectado (".png", ".jpg", ".pdf").
 */
export function sanearNombre(nombreOriginal, extension) {
  // Solo el último tramo: "../../etc/passwd" -> "passwd".
  let base = String(nombreOriginal ?? '').split(/[\\/]/).pop() ?? '';
  // Quita la extensión que traía (la sustituimos por la del tipo real).
  base = base.replace(/\.[A-Za-z0-9]{1,5}$/, '');
  base = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // acentos
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '');
  if (!base) base = 'archivo';
  const maxBase = MAX_LARGO_NOMBRE - extension.length;
  return base.slice(0, maxBase).replace(/[-._]+$/g, '') + extension;
}

/** Peso en KB con 2 decimales y mínimo 0.01 (el validador pide número >= 0). */
export function pesoEnKb(bytes) {
  return Math.max(0.01, Math.round((bytes / 1024) * 100) / 100);
}
