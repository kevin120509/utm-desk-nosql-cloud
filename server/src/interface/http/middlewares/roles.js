// Middlewares de autorización. Van DESPUÉS de autenticacion.
// Cada rechazo se manda al auditor (si hay uno) para dejar rastro en la bitácora de seguridad.
import { ErrorApp } from "../../../application/errores.js";

function rechazar(req, next, motivo) {
  try {
    const promesa = req.app?.locals?.auditor?.accesoDenegado?.({
      usuario: req.usuario,
      metodo: req.method,
      ruta: req.originalUrl?.split("?")[0],
      motivo,
      ip: req.ip,
    });
    promesa?.catch?.(() => {}); // la auditoría nunca debe tumbar la respuesta
  } catch {
    /* sin auditor utilizable */
  }
  next(new ErrorApp("SIN_PERMISO", "No tienes permiso para esta acción"));
}

/** Solo deja pasar a los roles indicados. */
export function requiereRol(...roles) {
  return function (req, _res, next) {
    if (!req.usuario || !roles.includes(req.usuario.rol)) return rechazar(req, next, `rol:${roles.join("|")}`);
    next();
  };
}

/** Exige el rol superAdmin Y un permiso específico (JWT válido + activo + rol + permiso). */
export function requierePermiso(permiso) {
  return function (req, _res, next) {
    const ok = req.usuario?.rol === "superAdmin" && req.usuario.permisos?.includes(permiso);
    if (!ok) return rechazar(req, next, `permiso:${permiso}`);
    next();
  };
}
