// Implementación del puerto Hasher con bcryptjs (JS puro, sin compilar en Vercel).
import bcrypt from "bcryptjs";

export const hasherBcrypt = {
  /** Compara una contraseña en claro contra su hash bcrypt. */
  comparar: (plano, hash) => bcrypt.compare(plano, hash),
};
