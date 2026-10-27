// Permisos finos del rol superAdmin. Salen del rol: no se guardan en el token ni se editan a mano.
export const PERMISOS_SUPERADMIN = [
  'usuarios.gestionar',
  'roles.gestionar',
  'catalogos.gestionar',
  'incidencias.consultar_todas',
  'bitacora.consultar',
  'metricas.consultar',
  'sistema.consultar',
  'seguridad.consultar',
];

const PERMISOS_POR_ROL = { superAdmin: PERMISOS_SUPERADMIN };

/** Permisos de un rol (lista vacía si el rol no tiene permisos administrativos). */
export function permisosDeRol(rol) {
  return [...(PERMISOS_POR_ROL[rol] ?? [])];
}
