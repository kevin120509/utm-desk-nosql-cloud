// Caso de uso: roles válidos y los permisos administrativos de cada uno.
import { ROLES } from "../domain/enumeraciones.js";
import { PERMISOS, permisosDeRol } from "../domain/administracion.js";

export function listarRoles() {
  return ROLES.map((rol) => ({ rol, permisos: permisosDeRol(rol) }));
}

export function listarPermisos() {
  return PERMISOS;
}
