// Middleware: exige un permiso concreto (p. ej. "usuarios:gestionar"). Va DESPUÉS de autenticacion.
// La comprobación se hace con el rol vigente de la BD (usuarioDesdeToken), no con el del cliente.
import { ErrorApp } from "../../../application/errores.js";
import { permisosDeRol } from "../../../domain/administracion.js";

export function requierePermiso(permiso) {
  return function (req, _res, next) {
    if (!req.usuario || !permisosDeRol(req.usuario.rol).includes(permiso)) {
      return next(new ErrorApp("SIN_PERMISO", "No tienes permiso para esta acción"));
    }
    next();
  };
}
