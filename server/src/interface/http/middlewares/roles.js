// Middleware: solo deja pasar a los roles indicados. Va DESPUÉS de autenticacion.
import { ErrorApp } from "../../../application/errores.js";

export function requiereRol(...roles) {
  return function (req, _res, next) {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return next(new ErrorApp("SIN_PERMISO", "No tienes permiso para esta acción"));
    }
    next();
  };
}
