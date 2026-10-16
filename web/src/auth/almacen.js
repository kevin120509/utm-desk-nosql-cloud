// Almacenamiento de la sesión en localStorage.
// Todo va en try/catch: el navegador puede bloquear el almacenamiento.
const CLAVE = "utm-desk-sesion";

// Devuelve { token, usuario } o null si no hay sesión guardada.
export function leerSesion() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const datos = JSON.parse(crudo);
    return datos?.token && datos?.usuario ? datos : null;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(sesion));
  } catch {
    /* sin almacenamiento: la sesión vive solo en memoria */
  }
}

export function borrarSesion() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nada que hacer */
  }
}
