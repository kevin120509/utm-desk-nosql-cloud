// Máquina de estados de una incidencia (plan §5).
//
//   abierta / en proceso / en espera  --> cualquiera de los otros dos y --> resuelta
//   resuelta --> cerrada (solo coordinador)
//   cerrada  = estado final
//
// Nada se "reabre": desde resuelta solo se puede ir a cerrada.

const DESTINOS = {
  abierta: ['en proceso', 'en espera', 'resuelta'],
  'en proceso': ['abierta', 'en espera', 'resuelta'],
  'en espera': ['abierta', 'en proceso', 'resuelta'],
  resuelta: ['cerrada'],
  cerrada: [],
};

// Solo estos roles pueden cambiar el estado.
const ROLES_QUE_CAMBIAN = ['tecnico', 'coordinador'];

/**
 * ¿Es válido pasar de `desde` a `hacia` con el rol dado?
 * Devuelve true/false; no lanza errores (la capa de aplicación decide el código HTTP).
 */
export function transicionValida(desde, hacia, rol) {
  if (!ROLES_QUE_CAMBIAN.includes(rol)) return false;
  const permitidos = DESTINOS[desde];
  if (!permitidos || !permitidos.includes(hacia)) return false; // incluye mismo estado y cerrada
  // Cerrar una incidencia es exclusivo del coordinador.
  if (hacia === 'cerrada') return rol === 'coordinador';
  return true;
}
