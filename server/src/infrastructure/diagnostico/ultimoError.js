// Registro en memoria del último error interno (HTTP 500). Solo guarda datos seguros:
// nunca el mensaje original, ni el stack, ni variables de entorno ni cadenas de conexión.
// En serverless cada instancia tiene su propio registro: es orientativo, no un historial.
let ultimo = null;

/** Anota un error interno. `ruta` debe ser solo método y ruta, sin query. */
export function registrarUltimoError(ruta) {
  ultimo = { codigo: "ERROR_INTERNO", ruta, fecha: new Date(), mensaje: "Error interno del servidor" };
}

/** Último error registrado, o undefined si no hay ninguno. */
export function ultimoError() {
  return ultimo ?? undefined;
}
