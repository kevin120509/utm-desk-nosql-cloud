// Implementación del puerto Tokens con jsonwebtoken.
import jwt from "jsonwebtoken";

/**
 * @param {{secret?: string, expiresIn?: string}} [opciones]
 *   Por defecto usa JWT_SECRET y JWT_EXPIRES_IN del entorno.
 */
export function crearTokens({
  secret = process.env.JWT_SECRET,
  expiresIn = process.env.JWT_EXPIRES_IN || "8h",
} = {}) {
  // Falla claro al arrancar si falta el secreto (nunca firmar con uno vacío).
  if (!secret) throw new Error("Falta la variable de entorno JWT_SECRET");

  return {
    // payload: { sub, rol, nombre }
    firmar: (payload) =>
      jwt.sign({ sub: payload.sub, rol: payload.rol, nombre: payload.nombre }, secret, {
        algorithm: "HS256",
        expiresIn,
      }),
    // Lanza si el token es inválido o expiró.
    verificar: (token) => jwt.verify(token, secret, { algorithms: ["HS256"] }),
  };
}
