// Implementación del puerto Hasher con bcryptjs (JS puro, sin compilar en Vercel).
import bcrypt from "bcryptjs";

export const hasherBcrypt = {
  /** Compara una contraseña en claro contra su hash bcrypt. */
  comparar: (plano, hash) => bcrypt.compare(plano, hash),
  /** Genera el hash bcrypt (costo 10) de una contraseña en claro. */
  hashear: (plano) => bcrypt.hash(plano, 10),
};
