// Middleware: exige `Authorization: Bearer <token>` y deja req.usuario = { id, rol, nombre }.
import { ErrorApp } from "../../../application/errores.js";

/** @param {{usuarioDesdeToken: (token: string) => Promise<{id: string, rol: string, nombre: string}>}} auth */
export function crearAutenticacion(auth) {
  return async function autenticacion(req, res, next) {
    try {
      const [esquema, token] = (req.headers.authorization || "").split(" ");
      if (esquema !== "Bearer" || !token) {
        throw new ErrorApp("NO_AUTENTICADO", "Falta el token de sesión");
      }
      const usuario = await auth.usuarioDesdeToken(token);
      req.usuario = { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre, permisos: usuario.permisos ?? [] };
      res.locals.usuarioPublico = usuario; // vista completa, la usa GET /me
      next();
    } catch (err) {
      next(err);
    }
  };
}
